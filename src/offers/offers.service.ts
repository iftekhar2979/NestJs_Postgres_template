import { InjectRepository } from "@nestjs/typeorm";
import { Offer } from "./entities/offer.entity";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import { ProductsService } from "src/products/products.service";
import { OrdersService } from "src/orders/orders.service";
import { OfferStatus } from "./enums/offerStatus.enum";
import { Order } from "../orders/entities/order.entity";
import { SendOfferDto } from "./dto/sendOffer.dto";
import { ResponseInterface } from "src/common/types/responseInterface";
import { ConversationsService } from "src/conversations/conversations.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { NotificationAction, NotificationRelated } from "src/notifications/entities/notifications.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { MailService } from "src/mail/mail.service";
import { UserService } from "src/user/user.service";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { ConverterService } from "src/currency-converter/currency-converter.service";
import { defaultCurrency } from "src/products/enums/status.enum";
import { User } from "src/user/entities/user.entity";

@Injectable()
export class OfferService {
  constructor(
    @InjectRepository(Offer)
    private readonly _offerRepo: Repository<Offer>,
    private readonly _productService: ProductsService,
    private readonly _orderService: OrdersService, // delegate order creation
    private readonly _coversationService: ConversationsService,
    private readonly _notificationService: NotificationsService,
    private readonly _mailService: MailService,
    private readonly _userService: UserService,
    private readonly _currencyConverterService: ConverterService,
    @InjectQueue("product") private readonly _queue: Queue
  ) {}

  async createOffer(payload: SendOfferDto, user: User): Promise<ResponseInterface<Offer>> {
    const { buyer_id, product_id, price } = payload;

    const existingOffer = await this._offerRepo.count({
      where: {
        product: { id: product_id },
        buyer: { id: buyer_id },
        status: OfferStatus.PENDING,
      },
    });
    if (existingOffer >= 3) {
      throw new BadRequestException(`Your ${existingOffer} existing offer is pending .`);
    }

    const userInfo = await this._userService.getUserById(buyer_id);
    const product = await this._productService.findByIdWithSeller(product_id);

    // console.log(product);
    if (!product) {
      throw new NotFoundException("product not found");
    }

    if (product.user_id === buyer_id) {
      throw new BadRequestException("You cannot make an offer on your own product");
    }
    console.log("oFFFER hERE 1");

    const offeredPrice = await this._currencyConverterService.convert(
      user.currency.toUpperCase(),
      defaultCurrency,
      price
    );

    const geniune_price = await this._currencyConverterService.convert(
      defaultCurrency,
      user.currency.toUpperCase(),
      price
    );
    const offer = this._offerRepo.create({
      buyer_id: buyer_id,
      seller_id: product.user_id,
      product_id: product.id,
      price: offeredPrice,
      status: OfferStatus.PENDING,
    });
    await this._offerRepo.save(offer);
    console.log("oFFFER hERE 2");
    const conversation = await this._coversationService.getOrCreate({
      productId: product.id,
      userIds: [product.user_id, buyer_id],
      offer: offer,
      offerType: OfferStatus.PENDING,
    });
    console.log("oFFFER hERE 3");
    //  console.log(conversation)
    await this._notificationService.createNotification({
      userId: product.user_id,
      related: NotificationRelated.CONVERSATION,
      action: NotificationAction.CREATED,
      msg: `${product.product_name} has a new offer for your review!`,
      targetId: conversation.id,
      isImportant: true,
      notificationFor: UserRoles.USER,
    });
    console.log("oFFFER hERE 4");
    await this._mailService.sendOfferConfirmation(userInfo, product.user, offer, product);
    // await this._queue.add("user-behaviour", {}, { attempts: 10 });
    // await this._queue.add("mail", {
    //   user: userInfo,
    //   seller: product.user,
    //   offer,
    //   product,
    //   type: "send_offer",
    // });

    console.log("Mail");
    return { message: "Offer sent Successfully!", status: "success", statusCode: 201, data: offer };
  }

  async acceptOffer({
    offerId,
    sellerId,
  }: {
    offerId: number;
    sellerId: string;
  }): Promise<ResponseInterface<Order>> {
    const offer = await this._offerRepo.findOne({
      where: { id: offerId },
      relations: ["product", "buyer", "seller"],
    });
    // console.log(offer)
    if (!offer) {
      throw new NotFoundException("Offer not found!");
    }
    if (offer.status === OfferStatus.ACCEPTED) {
      throw new BadRequestException("Offer already accepted!");
    }
    if (offer.status === OfferStatus.REJECTED) {
      throw new BadRequestException("Offer already rejected!");
    }
    if (!offer) {
      throw new NotFoundException("Offer not found!");
    }

    const product = offer.product;
    if (product.user_id !== sellerId) {
      throw new ForbiddenException("You are not the owner of the product");
    }
    // console.log(offer)
    const conversation = await this._coversationService.getOrCreate({
      productId: product.id,
      userIds: [product.user_id, offer.buyer.id],
      offer: offer,
      offerType: OfferStatus.ACCEPTED,
    });
    // await this._offerRepo.save(offer);
    // console.log(conversation)
    await this._notificationService.createNotification({
      userId: offer.seller.id,
      related: NotificationRelated.CONVERSATION,
      action: NotificationAction.UPDATED,
      msg: `Offer accepted for ${product.product_name} ! Feel Free to phurcase that . `,
      targetId: conversation.id,
      isImportant: true,
      notificationFor: UserRoles.USER,
    });
    offer.status = OfferStatus.ACCEPTED;
    await this._offerRepo.save(offer);

    const order = await this._orderService.createOrderFromOffer(offer);
    await this._queue.add("mail", {
      user: offer.buyer,
      seller: product.user,
      offer,
      product,
      type: "accepted_offer",
    });
    return { message: "Offer accepted successfully", status: "success", statusCode: 201, data: order };
  }

  async rejectOffer({
    offerId,
    sellerId,
  }: {
    offerId: number;
    sellerId: string;
  }): Promise<ResponseInterface<Order>> {
    // Find the offer by ID and load relations
    const offer = await this._offerRepo.findOne({
      where: { id: offerId },
      relations: ["product", "buyer", "seller"],
    });

    // Check if the offer status is already rejected
    if (offer.status === OfferStatus.REJECTED) {
      throw new BadRequestException("Offer already rejected!");
    }

    // Check if the offer is accepted
    if (offer.status === OfferStatus.ACCEPTED) {
      throw new BadRequestException("Offer already accepted!");
    }

    // If offer is not found
    if (!offer) {
      throw new NotFoundException("Offer not found!");
    }

    // Check if the logged-in user is the seller of the product
    const product = offer.product;
    if (product.user_id !== sellerId) {
      throw new ForbiddenException("You are not the owner of the product");
    }

    // Set the offer status to rejected
    offer.status = OfferStatus.REJECTED;
    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    const [savedOffer, conversation] = await Promise.all([
      this._offerRepo.save(offer),
      this._coversationService.getOrCreate({
        productId: product.id,
        userIds: [product.user_id, offer.seller.id],
        offer: offer,
        offerType: OfferStatus.REJECTED,
      }),
    ]);
    await this._notificationService.createNotification({
      userId: offer.seller.id,
      related: NotificationRelated.CONVERSATION,
      action: NotificationAction.UPDATED,
      msg: `Your offer for ${product.product_name} has been rejected by the seller.`,
      targetId: conversation.id,
      isImportant: true,
      notificationFor: UserRoles.USER,
    });
    await this._queue.add("mail", {
      user: offer.buyer,
      seller: product.user,
      offer,
      product,
      type: "rejected_offer",
    });
    // Respond with success and order details
    return {
      message: "Offer rejected successfully",
      status: "success",
      statusCode: 200,
      data: null, // You can return null or additional data depending on the requirements
    };
  }
}
