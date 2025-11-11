import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Order } from "./entities/order.entity";
import { DataSource, Repository } from "typeorm";
import { Offer } from "src/offers/entities/offer.entity";
import { OrderStatus, PaymentStatus } from "./enums/orderStatus";
import { ResponseInterface } from "src/common/types/responseInterface";
import { pagination } from "src/shared/utils/pagination";
import {
  NotificationAction,
  NotificationRelated,
  NotificationType,
} from "src/notifications/entities/notifications.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { NotificationsService } from "src/notifications/notifications.service";
import { User } from "src/user/entities/user.entity";
import { Product } from "src/products/entities/products.entity";
import { defaultCurrency, ProductStatus } from "src/products/enums/status.enum";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { Transections } from "src/transections/entity/transections.entity";
import { TransectionType } from "src/transections/enums/transectionTypes";
import { FeeWithCommision } from "src/shared/utils/utils";
import { ConverterService } from "src/currency-converter/currency-converter.service";
@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private _orderRepository: Repository<Order>,
    private readonly _notificaionService: NotificationsService,
    private readonly _dataSource: DataSource,
    @InjectRepository(Product) private _productRepository: Repository<Product>,
    @InjectRepository(Wallets) private _walletRepository: Repository<Wallets>,
    @InjectRepository(Transections) private _transectionRespositoy: Repository<Transections>,

    private readonly _currencyConverterService: ConverterService
  ) {}
  async createOrderFromOffer(offer: Offer): Promise<Order> {
    try {
      if (offer.order_id) {
        throw new BadRequestException("Order already exists for this offer");
      }
      const existingOrder = await this._orderRepository.findOne({
        where: { product: { id: offer.product.id } },
        relations: ["product", "accepted_offer", "delivery", "buyer", "seller"],
      });
      if (existingOrder) {
        throw new BadRequestException("Order already exists for this Product");
      }
      const order = this._orderRepository.create({
        paymentStatus: PaymentStatus.PENDING,
        status: OrderStatus.PENDING,
        buyer: offer.buyer,
        buyer_id: offer.buyer.id,
        seller: offer.seller,
        seller_id: offer.seller.id,
        product: offer.product,
        protectionFee: FeeWithCommision(offer.price, 10) + 0.8,
        total: offer.price,
        accepted_offer: offer,
        offer_id: offer.id,
        deliveryInfo: null,
        delivery_id: null,
      });
      // console.log("ORDERInfo", order);
      await this._orderRepository.save(order);
      const productName = offer.product.product_name;
      const notifications = [
        {
          userId: offer.buyer.id,
          user: offer.buyer,
          isImportant: true,
          action: NotificationAction.UPDATED,
          related: NotificationRelated.ORDER,
          notificationFor: UserRoles.USER,
          type: NotificationType.SUCCESS,
          targetId: order.id,
          msg: `${productName} is now ready to phurcase !`,
        },
        {
          userId: offer.seller.id,
          user: offer.seller,
          isImportant: true,
          action: NotificationAction.UPDATED,
          related: NotificationRelated.ORDER,
          notificationFor: UserRoles.USER,
          type: NotificationType.INFO,
          targetId: order.id,
          msg: `${productName} is ready to sell!`,
        },
        {
          userId: null,
          isImportant: true,
          action: NotificationAction.UPDATED,
          related: NotificationRelated.ORDER,
          notificationFor: UserRoles.ADMIN,
          type: NotificationType.INFO,
          targetId: order.id,
          msg: `#${order.id} both are agreed with negotiation!`,
        },
      ];
      await this._notificaionService.bulkInsertNotifications(notifications);
      return await this._orderRepository.save(order);
    } catch (error) {
      console.error("Error creating order from offer:", error);
      throw new BadRequestException("Failed to create order from offer");
    }
  }

  async findByBuyerId(
    buyerId: string,
    page: number = 1,
    limit: number = 10,
    user?: User
  ): Promise<ResponseInterface<Order[]>> {
    const [orders, total] = await this._orderRepository.findAndCount({
      where: { buyer_id: buyerId },
      relations: ["product", "accepted_offer", "deliveryInfo", "buyer", "seller"],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: "DESC" }, // Optional: newest orders first
    });

    const protectionFeeExtraCharge = await this._currencyConverterService.convert(
      user.currency.toUpperCase(),
      defaultCurrency,
      0.8
    );
    await Promise.all(
      orders.map(async (order) => {
        const price = parseFloat(order.total as unknown as string);
        const convertedPrice = await this._currencyConverterService.convert(
          defaultCurrency,
          user.currency.toUpperCase(),
          price
        );
        order.product.selling_price =
          convertedPrice + FeeWithCommision(convertedPrice, 10) + protectionFeeExtraCharge;
        // product.buyer_protection = FeeWithCommision(convertedPrice, 10) + protectionFeeExtraCharge;
        // product.currency = user.currency.toUpperCase();
        // product.images = productImages?.filter((item) => item.product_id);
      })
    );
    return {
      message: "Orders retrieved successfully!",
      status: "success",
      statusCode: 200,
      data: orders,
      pagination: pagination({ page: page, limit: limit, total }),
    };
  }

  async findOrder(query: {
    buyer_id?: string;
    seller_id?: string;
    product_id?: number;
    id?: number;
    paymentStatus?: PaymentStatus;
    offer_id?: number;
    delivery_id?: number;
    status?: OrderStatus;
  }): Promise<Order> {
    const orders = await this._orderRepository.findOne({
      where: query,
      relations: ["product", "accepted_offer", "delivery", "buyer", "seller", "shipments"],
      order: { created_at: "DESC" }, // Optional: newest orders first
    });
    if (!orders) {
      throw new Error("Order not found");
    }
    return orders;
  }
  async findBySellerId(
    sellerId: string,
    page: number = 1,
    limit: number = 10,
    user?: User
  ): Promise<ResponseInterface<Order[]>> {
    console.log(sellerId);
    const [orders, total] = await this._orderRepository.findAndCount({
      where: { seller: { id: sellerId } },
      relations: ["product", "accepted_offer", "buyer", "seller"],
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: "DESC" },
    });
    // orsers

    await Promise.all(
      orders.map(async (order) => {
        const price = parseFloat(order.total as unknown as string);
        const convertedPrice = await this._currencyConverterService.convert(
          defaultCurrency,
          user.currency.toUpperCase(),
          price
        );
        order.product.selling_price = convertedPrice;
        // product.buyer_protection = FeeWithCommision(convertedPrice, 10) + protectionFeeExtraCharge;
        // product.currency = user.currency.toUpperCase();
        // product.images = productImages?.filter((item) => item.product_id);
      })
    );
    return {
      message: "Orders retrieved successfully!",
      status: "success",
      statusCode: 200,
      data: orders,
      pagination: pagination({ page: page, limit: limit, total }),
    };
  }

  async purchaseOrder({ product_id, user }: { product_id: number; user: User }) {
    try {
      const product = await this._productRepository.findOne({
        where: { id: product_id },
        relations: ["user"],
      });
      if (product.user.id === user.id) {
        throw new ForbiddenException("You can't purchase your own product!");
      }
      if (product.status === ProductStatus.SOLD) {
        throw new BadRequestException("Product already sold");
      }
      if (product.status !== ProductStatus.AVAILABLE) {
        throw new ForbiddenException("Product is no longer available to purchase .");
      }

      const wallets = await this._walletRepository.findOne({ where: { user_id: user.id } });
      const productSellingPrice = Number(product.selling_price);
      if (isNaN(productSellingPrice)) {
        product.status = ProductStatus.PENDING;
        await this._productRepository.save(product);
        throw new BadRequestException("Product is not sellable");
      }
      if (wallets.balance < productSellingPrice) {
        throw new BadRequestException(
          "You don't have enough balance to purchase the product . Please recharge you account or make payment ."
        );
      }
      // const uniqueTransectionNumber =Math.floor(Math.random() * 1000000)
      const queryRunner = this._dataSource.createQueryRunner();
      await queryRunner.startTransaction();

      product.status = ProductStatus.IN_PROGRESS;

      const order = new Order();
      order.product = product;
      order.buyer = user;
      order.seller = product.user;
      order.buyer_id = user.id;
      order.seller_id = product.user.id;
      order.offer_id = null;
      order.accepted_offer = null;
      order.status = OrderStatus.PENDING;

      await queryRunner.manager.save(Order, order);

      // const transection = new Transections()
      // transection.product = product
      // transection.amount = productSellingPrice
      // transection.status = PaymentStatus.DUE_DELIVERY
      // transection.paymentId = `Trans-${product.id}-${uniqueTransectionNumber}`
      // transection.paymentMethod ="Internal"
      // transection.transection_type = TransectionType.PHURCASE
      // transection.order = order

      await queryRunner.manager.save(Product, product);
    } catch (error) {
      console.log(error);
    }
  }

  async completeOrder({ order_id, user }: { order_id: number; user: User }) {
    try {
      const order = await this._orderRepository.findOne({
        where: { id: order_id },
        relations: ["product", "accepted_offer", "delivery", "buyer", "seller"],
      });
      if (!order) {
        throw new BadRequestException("Order is not found!");
      }
      if (order.status === OrderStatus.DELIVERED) {
        throw new BadRequestException("Product already delivered");
      }
      if (order.status !== OrderStatus.PREPEARED) {
        throw new BadRequestException("Order is not yet ready for shipment.");
      }
      if (order.buyer.id !== user.id) {
        throw new BadRequestException("You have no permission to compelete the order.");
      }
      const sellerWallet = await this._walletRepository.findOne({ where: { user: { id: order.seller.id } } });
      if (!sellerWallet) {
        throw new BadRequestException("Seller wallet is not active !");
      }

      const { product, seller } = order;
      const queryRunner = this._dataSource.createQueryRunner();
      await queryRunner.startTransaction();
      try {
        order.status = OrderStatus.DELIVERED;

        sellerWallet.balance += Number(order.total);
        sellerWallet.version += 1;

        const randomString = Math.random().toString(36).substring(2, 10);
        const paymentId = `Trans-${order.product.id}-${randomString}`;
        // // Transaction for payment
        const transaction = new Transections();
        transaction.amount = order.total;
        transaction.order = order;
        transaction.paymentId = paymentId;
        transaction.transection_type = TransectionType.ORDER_COMPLETATION;
        transaction.status = PaymentStatus.COMPLETED;
        transaction.product = order.product;
        transaction.paymentMethod = "Internal";
        transaction.user = order.seller;
        transaction.wallet = sellerWallet;

        const notifications = [
          {
            user: user,
            userId: user.id,
            related: NotificationRelated.ORDER,
            action: NotificationAction.CREATED,
            type: NotificationType.SUCCESS,
            msg: `Your Purchase ,Order #${order.id} is marked as delivered or completed.`,
            target_id: order.id,
            notificationFor: UserRoles.USER,
            isImportant: true,
          },
          {
            userId: seller.id,
            user: product.user,
            related: NotificationRelated.ORDER,
            action: NotificationAction.CREATED,
            type: NotificationType.SUCCESS,
            msg: `Order ${order.id} is marked as completed by ${seller.firstName}`,
            target_id: product.id,
            notificationFor: UserRoles.USER,
            isImportant: true,
          },
          {
            userId: seller.id,
            user: seller,
            related: NotificationRelated.ORDER,
            action: NotificationAction.CREATED,
            type: NotificationType.SUCCESS,
            msg: `Order : #${order.id} with ${product.product_name} is completed.`,
            target_id: product.id,
            notificationFor: UserRoles.ADMIN,
            isImportant: true,
          },
          {
            userId: seller.id,
            related: NotificationRelated.WALLET,
            action: NotificationAction.CREATED,
            type: NotificationType.SUCCESS,
            msg: `Congratulation Order completed ! A total of ${order.total} has been credited to your wallet for order #${order.id}.`,
            notificationFor: UserRoles.USER,
            isImportant: true,
            targetId: sellerWallet.id,
          },
          {
            userId: seller.id,
            user: seller,
            related: NotificationRelated.ORDER,
            action: NotificationAction.CREATED,
            type: NotificationType.SUCCESS,
            msg: `Order : #${order.id} with ${product.product_name} has transection to ${seller.firstName}'s wallet.`,
            target_id: product.id,
            notificationFor: UserRoles.ADMIN,
            isImportant: true,
          },
        ];

        // Bulk insert notifications for both user and admin
        await this._notificaionService.bulkInsertNotifications(notifications);
        await queryRunner.manager.save(Order, order);
        await queryRunner.manager.save(Transections, transaction);
        await queryRunner.manager.save(Wallets, sellerWallet);
        // await queryRunner.manager.save(Shipment, shipmentInfo)
        await queryRunner.commitTransaction();

        return {
          message: `Product maked as completed!`,
          data: order,
          statusCode: 201,
        };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error("Error during order creation:", error);
        throw new BadRequestException("Error creating delivery address");
      } finally {
        // Release the query runner
        await queryRunner.release();
      }
    } catch (error) {
      console.log(error);
    }
  }
}
