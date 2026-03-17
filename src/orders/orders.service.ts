import { InjectQueue } from "@nestjs/bull";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bull";
import { ResponseInterface } from "src/common/types/responseInterface";
import { ConverterService } from "src/currency-converter/currency-converter.service";
import {
  NotificationAction,
  NotificationRelated,
  NotificationType,
} from "src/notifications/entities/notifications.entity";
import { NotificationsService } from "src/notifications/notifications.service";
import { Offer } from "src/offers/entities/offer.entity";
import { OfferStatus } from "src/offers/enums/offerStatus.enum";
import { Product } from "src/products/entities/products.entity";
import { defaultCurrency, ProductStatus } from "src/products/enums/status.enum";
import { ProductVariant } from "src/products/varients/entities/productVarient.entity";
import { RedisService } from "src/redis/redis.service";
import { pagination } from "src/shared/utils/pagination";
import { FeeWithCommision } from "src/shared/utils/utils";
import { Transections } from "src/transections/entity/transections.entity";
import { TransectionType } from "src/transections/enums/transectionTypes";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { CheckoutPreviewDto } from "./dto/checkout-preview.dto";
import { Order } from "./entities/order.entity";
import { OrderStatus, PaymentStatus } from "./enums/orderStatus";

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private _orderRepository: Repository<Order>,
    private readonly _notificaionService: NotificationsService,
    private readonly _dataSource: DataSource,
    @InjectRepository(Product) private _productRepository: Repository<Product>,
    @InjectRepository(Wallets) private _walletRepository: Repository<Wallets>,
    @InjectRepository(Transections) private _transectionRespositoy: Repository<Transections>,
    @InjectRepository(ProductVariant) private _variantRepository: Repository<ProductVariant>,
    @InjectQueue("product") private readonly _queue: Queue,
    @InjectQueue("notifications") private readonly _notificationQueue: Queue,
    private readonly _currencyConverterService: ConverterService,
    private readonly _redisService: RedisService,
  ) { }
  async createOrderFromOffer(offer: Offer, manager?: EntityManager): Promise<Order> {
    const orderRepository = manager ? manager.getRepository(Order) : this._orderRepository;
    try {
      if (offer.order_id) {
        throw new BadRequestException("Order already exists for this offer");
      }

      // ❗Prevent duplicate orders for same product
      const existingOrder = await orderRepository.findOne({
        where: { product: { id: offer.product.id } },
        relations: ["product", "accepted_offer", "deliveryInfo", "buyer", "seller"],
      });

      if (existingOrder) {
        throw new BadRequestException("Order already exists for this product");
      }

      const protectionFee = Number(FeeWithCommision(offer.price, 10)) + 0.8;

      const order = orderRepository.create({
        paymentStatus: PaymentStatus.PENDING,
        status: OrderStatus.PENDING,

        buyer: offer.buyer,
        buyer_id: offer.buyer.id,

        seller: offer.seller,
        seller_id: offer.seller.id,

        product: offer.product,

        protectionFee,
        total: offer.price,

        accepted_offer: offer,
        offer_id: offer.id,

        deliveryInfo: null,
        delivery_id: null,
      });

      const savedOrder = await orderRepository.save(order);

      const notifications = [
        {
          userId: offer.buyer.id,
          isImportant: true,
          action: NotificationAction.UPDATED,
          related: NotificationRelated.ORDER,
          notificationFor: UserRoles.USER,
          type: NotificationType.SUCCESS,
          targetId: savedOrder.id,
          msg: `${offer.product.product_name} is now ready to purchase!`,
        },
        {
          userId: offer.seller.id,
          isImportant: true,
          action: NotificationAction.UPDATED,
          related: NotificationRelated.ORDER,
          notificationFor: UserRoles.USER,
          type: NotificationType.INFO,
          targetId: savedOrder.id,
          msg: `${offer.product.product_name} is ready to sell!`,
        },
        {
          userId: null,
          isImportant: true,
          action: NotificationAction.UPDATED,
          related: NotificationRelated.ORDER,
          notificationFor: UserRoles.ADMIN,
          type: NotificationType.INFO,
          targetId: savedOrder.id,
          msg: `#${savedOrder.id} both parties agreed on negotiation.`,
        },
      ];

      // await this._notificationQueue.add("",)

      await this._notificaionService.bulkInsertNotifications(notifications);

      return savedOrder;
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
      where: { buyer_id: buyerId, status: In([OrderStatus.SHIPMENT_READY, OrderStatus.DELIVERED]) },
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
        order.product.price =
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
        order.product.price = convertedPrice;
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
      const productSellingPrice = Number(product.price);
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
    console.log("Order id", order_id);
    const order = await this._orderRepository.findOne({
      where: { id: order_id },
      relations: ["product", "buyer", "seller"],
    });
    console.log("order", order);
    if (!order) {
      throw new BadRequestException("Order is not found!");
    }
    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException("Product already delivered");
    }

    if (order.status !== OrderStatus.SHIPMENT_READY) {
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
        message: `Product marked as completed!`,
        data: order,
        statusCode: 201,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error during order creation:", error);
      throw new BadRequestException(error.message);
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  async getCheckoutData(productId: number, user: User): Promise<ResponseInterface<any>> {
    const product = await this._productRepository.findOne({
      where: { id: productId },
      relations: ["user", "images"],
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Check if there is an accepted offer for this product and buyer
    const acceptedOffer = await this._dataSource.getRepository(Offer).findOne({
      where: {
        product: { id: productId },
        buyer: { id: user.id },
        status: OfferStatus.ACCEPTED,
      },
      order: { created_at: "DESC" },
    });

    let price = product.price;
    let isOfferPrice = false;

    if (acceptedOffer) {
      price = acceptedOffer.price;
      isOfferPrice = true;
    }

    const protectionFee = Number(FeeWithCommision(price, 10)) + 0.8;
    const total = Number(price) + protectionFee;

    return {
      message: "Checkout data retrieved successfully",
      status: "success",
      statusCode: 200,
      data: {
        product,
        price: Number(price),
        protectionFee: Number(protectionFee),
        total: Number(total),
        isOfferPrice,
      },
    };
  }

  async calculatePreview(dto: CheckoutPreviewDto, user: User) {
    const { productId, variantId, quantity, currency } = dto;

    // 1. Fetch Product (Redis -> DB)
    const product = await this._getProductWithCache(productId);

    // 2. Fetch Variant if provided (Redis -> DB)
    let priceModifier = 0;
    if (variantId) {
      const variant = await this._getVariantWithCache(variantId);
      if (variant.product_id !== productId) {
        throw new BadRequestException("Variant does not belong to this product");
      }
      priceModifier = Number(variant.price_modifier || 0);
    }

    // 3. Calculate Base Price & Subtotal
    const basePrice = Number(product.price);
    const unitPrice = basePrice + priceModifier;
    const subtotal = unitPrice * quantity;

    // 4. Calculate Discount, Tax, and Protection Fee
    const discount = 0;
    const tax = 0; 
    const protectionFee = Number(FeeWithCommision(subtotal, 10)) + 0.8;
    const finalPriceBeforeConversion = subtotal - discount + tax + protectionFee;

    // 5. Currency Conversion
    const targetCurrency = (currency || user.currency || defaultCurrency).toUpperCase();

    // We calculate the breakdown in the target currency
    const convertedUnit = await this._currencyConverterService.convert(defaultCurrency, targetCurrency, unitPrice);
    const convertedSubtotal = await this._currencyConverterService.convert(defaultCurrency, targetCurrency, subtotal);
    const convertedDiscount = await this._currencyConverterService.convert(defaultCurrency, targetCurrency, discount);
    const convertedTax = await this._currencyConverterService.convert(defaultCurrency, targetCurrency, tax);
    const convertedProtection = await this._currencyConverterService.convert(defaultCurrency, targetCurrency, protectionFee);
    const finalPrice = await this._currencyConverterService.convert(defaultCurrency, targetCurrency, finalPriceBeforeConversion);

    return {
      message: "Checkout preview calculated successfully",
      status: "success",
      statusCode: 200,
      data: {
        productId,
        variantId,
        quantity,
        currency: targetCurrency,
        breakdown: {
          basePrice: convertedUnit,
          subtotal: convertedSubtotal,
          protectionFee: convertedProtection,
          discount: convertedDiscount,
          tax: convertedTax,
        },
        finalPrice,
      },
    };
  }

  private async _getProductWithCache(id: number): Promise<Product> {
    const cacheKey = `product:${id}`;
    const cached = await this._redisService.get<Product>(cacheKey);
    if (cached) return cached;

    const product = await this._productRepository.findOne({
      where: { id },
      relations: ["user"],
    });
    if (!product) throw new NotFoundException("Product not found");

    await this._redisService.set(cacheKey, product, 3600); // 1 hour TTL
    return product;
  }

  private async _getVariantWithCache(id: number): Promise<ProductVariant> {
    const cacheKey = `variant:${id}`;
    const cached = await this._redisService.get<ProductVariant>(cacheKey);
    if (cached) return cached;

    const variant = await this._variantRepository.findOne({
      where: { id },
    });
    if (!variant) throw new NotFoundException("Variant not found");

    await this._redisService.set(cacheKey, variant, 3600);
    return variant;
  }
}
