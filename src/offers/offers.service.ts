import { InjectQueue } from "@nestjs/bull";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bull";
import { ResponseInterface } from "src/common/types/responseInterface";
import { ConversationsService } from "src/conversations/conversations.service";
import { ConverterService } from "src/currency-converter/currency-converter.service";
import { MailService } from "src/mail/mail.service";
import {
  NotificationAction,
  NotificationRelated,
  NotificationType,
} from "src/notifications/entities/notifications.entity";
import { NotificationsService } from "src/notifications/notifications.service";
import { OrdersService } from "src/orders/orders.service";
import { Product } from "src/products/entities/products.entity";
import { defaultCurrency } from "src/products/enums/status.enum";
import { ProductsService } from "src/products/products.service";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { UserService } from "src/user/user.service";
import { DataSource, Not, Repository } from "typeorm";
import { Order } from "../orders/entities/order.entity";
import { SendOfferDto } from "./dto/sendOffer.dto";
import { Offer } from "./entities/offer.entity";
import { OfferStatus } from "./enums/offerStatus.enum";

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
    private readonly dataSource: DataSource,
    @InjectQueue("product") private readonly _queue: Queue,

    @InjectQueue("notifications") private readonly _notificationQueue: Queue
  ) {}

  async createOffer(payload: SendOfferDto, user: User): Promise<ResponseInterface<Offer>> {
    const { buyer_id, product_id, price } = payload;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validate that the product exists with a lock.
      // We use QueryBuilder without joins to satisfy PostgreSQL locking restrictions.
      const lockedProduct = await queryRunner.manager
        .createQueryBuilder(Product, "product")
        .setLock("pessimistic_write")
        .where("product.id = :id", { id: product_id })
        .getOne();

      if (!lockedProduct) {
        throw new NotFoundException("Product not found");
      }

      // 1.5 Load relations separately after locking.
      const product = await queryRunner.manager.findOne(Product, {
        where: { id: product_id },
        relations: ["user"],
      });

      if (!product) {
        throw new NotFoundException("Product not found");
      }

      // 2. Validate that the buyer is not the product owner.
      if (product.user_id === buyer_id) {
        throw new BadRequestException("You cannot make an offer on your own product");
      }

      // 3. Prevent duplicate PENDING offers from the same buyer for the same product.
      const existingOfferCount = await queryRunner.manager.count(Offer, {
        where: {
          product: { id: product_id },
          buyer: { id: buyer_id },
          status: OfferStatus.PENDING,
        },
      });

      if (existingOfferCount > 0) {
        throw new BadRequestException(`You already have a pending offer for this product.`);
      }

      // Currency Conversion logic
      const offeredPrice = await this._currencyConverterService.convert(
        user.currency.toUpperCase(),
        defaultCurrency,
        price
      );

      // 4 & 5. Create a new offer with status = PENDING.
      const offer = queryRunner.manager.create(Offer, {
        buyer_id: buyer_id,
        seller_id: product.user_id,
        product_id: product.id,
        price: offeredPrice,
        status: OfferStatus.PENDING,
      });
      await queryRunner.manager.save(offer);

      // 6. Check if conversation exists or create one, and create a message in the conversation.
      // Pass the queryRunner.manager to ensure all these operations are atomic.
      const conversation = await this._coversationService.getOrCreate({
        productId: product.id,
        userIds: [product.user_id, buyer_id],
        offer: offer,
        offerType: OfferStatus.PENDING,
        manager: queryRunner.manager,
      });

      // 7. Commit the transaction.
      await queryRunner.commitTransaction();

      // Post-transaction operations
      const userInfo = await this._userService.getUserById(buyer_id);
      
      await this._notificationQueue.add("notification_saver", {
        user: product.user,
        related: NotificationRelated.CONVERSATION,
        msg: `${product.product_name} has a new offer for your review!`,
        type: NotificationType.SUCCESS,
        targetId: conversation.id,
        notificationFor: UserRoles.USER,
        action: NotificationAction.CREATED,
        isImportant: true,
        title: `Please review the upcoming offer for ${product.product_name}`,
        body: `Got new offer for ${product.product_name}`,
      });

      await this._mailService.sendOfferConfirmation(userInfo, product.user, offer, product);

      return {
        message: "Offer sent Successfully!",
        status: "success",
        statusCode: 201,
        data: offer,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async acceptOffer({
    offerId,
    sellerId,
  }: {
    offerId: number;
    sellerId: string;
  }): Promise<ResponseInterface<Order>> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validate the offer exists and lock it to prevent race conditions.
      // We use QueryBuilder to avoid eager relations being joined (consistency with product lock).
      const lockedOffer = await queryRunner.manager
        .createQueryBuilder(Offer, "offer")
        .setLock("pessimistic_write")
        .where("offer.id = :id", { id: offerId })
        .getOne();

      if (!lockedOffer) {
        throw new NotFoundException("Offer not found!");
      }

      // 1.5 Load relations after locking
      const offer = await queryRunner.manager.findOne(Offer, {
        where: { id: offerId },
        relations: ["product", "buyer", "seller", "product.user"],
      });

      if (!offer) {
        throw new NotFoundException("Offer not found!");
      }

      // 2. Ensure the offer status is still PENDING.
      if (offer.status !== OfferStatus.PENDING) {
        throw new BadRequestException(`Offer is already ${offer.status.toLowerCase()}!`);
      }

      const product = offer.product;
      // Also lock the product to prevent other offers for the same product being accepted simultaneously.
      // We use QueryBuilder to avoid eager relations being joined (which causes the outer join error).
      await queryRunner.manager
        .createQueryBuilder(Product, "product")
        .setLock("pessimistic_write")
        .where("product.id = :id", { id: product.id })
        .getOne();
      // Actually, locking the current offer is enough if all updates to other offers are done in this transaction.
      // But to be safe, let's ensure we are the owner.
      if (product.user_id !== sellerId) {
        throw new ForbiddenException("You are not the owner of the product");
      }

      // 3. Update the offer status to ACCEPTED.
      offer.status = OfferStatus.ACCEPTED;
      await queryRunner.manager.save(Offer, offer);

      // 4. Reject all other pending offers for the same product.
      await queryRunner.manager.update(
        Offer,
        {
          product_id: product.id,
          id: Not(offer.id),
          status: OfferStatus.PENDING,
        },
        { status: OfferStatus.REJECTED }
      );

      // 5. Update the product price with the accepted offer price.
      product.price = offer.price;
      // product.status = ProductStatus.ACCEPTED; // If there is a status to update
      await queryRunner.manager.save(product);

      // 6. Create a message in the conversation notifying that the offer was accepted.
      // Pass the queryRunner.manager to ensure it's part of the transaction.
      const conversation = await this._coversationService.getOrCreate({
        productId: product.id,
        userIds: [product.user_id, offer.buyer.id],
        offer: offer,
        offerType: OfferStatus.ACCEPTED,
        manager: queryRunner.manager,
      });

      await this._notificationQueue.add("notification_saver", {
        user: offer.buyer,
        related: NotificationRelated.CONVERSATION,
        msg: `Offer accepted for ${product.product_name}! Feel free to purchase it.`,
        type: NotificationType.SUCCESS,
        targetId: conversation.id,
        notificationFor: UserRoles.USER,
        action: NotificationAction.CREATED,
        isImportant: true,
        title: `Your offer for ${product.product_name} has been accepted.`,
        body: `Please feel free to purchase the product.`,
      });

      // Delegate Order creation - pass the manager
      const order = await this._orderService.createOrderFromOffer(offer, queryRunner.manager);

      await this._queue.add("mail", {
        user: offer.buyer,
        seller: product.user,
        offer,
        product,
        type: "accepted_offer",
      });

      // 7. Ensure the entire process runs in a SINGLE DATABASE TRANSACTION.
      await queryRunner.commitTransaction();

      return { message: "Offer accepted successfully", status: "success", statusCode: 201, data: order };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
