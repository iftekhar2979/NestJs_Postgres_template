import { InjectQueue } from "@nestjs/bull";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bull";
import { ResponseInterface } from "src/common/types/responseInterface";
import { ConverterService } from "src/currency-converter/currency-converter.service";
import { DeliveryAddress } from "src/delivery/entities/delivery_information.entity";
import { Inventory } from "src/inventory/entities/inventory.entity";
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
import { PaymentMethod } from "src/purchase/dto/purchase.dto";
import { RedisService } from "src/redis/redis.service";
import { pagination } from "src/shared/utils/pagination";
import { FeeWithCommision } from "src/shared/utils/utils";
import { Transections } from "src/transections/entity/transections.entity";
import { TransectionType } from "src/transections/enums/transectionTypes";
import { User } from "src/user/entities/user.entity";
import { UserAddress } from "src/user/entities/userAddresses.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { v4 as uuid } from "uuid";
import { CheckoutExecuteDto } from "./dto/checkout-execute.dto";
import { CheckoutPreviewDto } from "./dto/checkout-preview.dto";
import { OrderItem } from "./entities/order-item.entity";
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
    @InjectRepository(UserAddress) private _addressRepository: Repository<UserAddress>,
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
    const order = await this._orderRepository.findOne({
      where: { id: order_id },
      relations: ["product", "buyer", "seller"],
    });

    if (!order) {
      throw new BadRequestException("Order not found!");
    }

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException("Order already completed and delivered.");
    }

    // Checking if shipment is ready - adjust this status if needed based on your workflow
    if (order.status !== OrderStatus.SHIPMENT_READY && order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Order cannot be completed from its current status: ${order.status}`);
    }

    if (order.buyer_id !== user.id) {
      throw new BadRequestException("Only the buyer can mark the order as completed.");
    }

    const queryRunner = this._dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Get Seller's Wallet with lock
      const sellerWallet = await queryRunner.manager.findOne(Wallets, {
        where: { user_id: order.seller_id },
        lock: { mode: "pessimistic_write" },
      });

      if (!sellerWallet) {
        throw new BadRequestException("Seller wallet not found.");
      }

      // 2. Calculate Payout (Net = Total - Protection Fee)
      const totalAmount = Number(order.total);
      const protectionFee = Number(order.protectionFee || 0);
      const sellerPayout = totalAmount - protectionFee;

      if (sellerPayout <= 0) {
        throw new BadRequestException("Invalid payout calculation.");
      }

      // 3. Update Statuses
      order.status = OrderStatus.DELIVERED;
      order.paymentStatus = PaymentStatus.COMPLETED;

      // Update Product Status to SOLD
      const product = order.product;
      product.status = ProductStatus.SOLD;

      // 4. Update Seller Wallet
      sellerWallet.balance = Number(sellerWallet.balance) + sellerPayout;
      sellerWallet.version += 1;

      // 5. Record Transaction
      const randomString = Math.random().toString(36).substring(2, 10);
      const paymentId = `PAYOUT-${order.id}-${randomString}`;

      const transaction = queryRunner.manager.create(Transections, {
        amount: sellerPayout,
        order: order,
        paymentId: paymentId,
        transection_type: TransectionType.ORDER_COMPLETATION,
        status: PaymentStatus.COMPLETED,
        product: product,
        paymentMethod: "Internal",
        user: order.seller,
        wallet: sellerWallet,
      });

      // 6. Notifications
      const notifications = [
        {
          userId: order.buyer_id,
          related: NotificationRelated.ORDER,
          action: NotificationAction.UPDATED,
          type: NotificationType.SUCCESS,
          msg: `Order #${order.id} for "${product.product_name}" has been completed.`,
          targetId: order.id,
          notificationFor: UserRoles.USER,
          isImportant: true,
        },
        {
          userId: order.seller_id,
          related: NotificationRelated.WALLET,
          action: NotificationAction.CREATED,
          type: NotificationType.SUCCESS,
          msg: `Funds released! A total of ${sellerPayout} has been credited to your wallet for Order #${order.id}.`,
          targetId: sellerWallet.id,
          notificationFor: UserRoles.USER,
          isImportant: true,
        },
        {
          userId: null,
          related: NotificationRelated.ORDER,
          action: NotificationAction.UPDATED,
          type: NotificationType.INFO,
          msg: `Order #${order.id} completed. Payout of ${sellerPayout} transferred to seller ${order.seller_id}.`,
          targetId: order.id,
          notificationFor: UserRoles.ADMIN,
          isImportant: false,
        },
      ];

      await this._notificaionService.bulkInsertNotifications(notifications);

      // Save everything
      await queryRunner.manager.save(Order, order);
      await queryRunner.manager.save(Product, product);
      await queryRunner.manager.save(Transections, transaction);
      await queryRunner.manager.save(Wallets, sellerWallet);

      await queryRunner.commitTransaction();

      return {
        message: "Order completed successfully and funds transferred to seller.",
        data: {
          orderId: order.id,
          payout: sellerPayout,
          status: order.status,
        },
        statusCode: 201,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getCheckoutData(productId: number, user: User): Promise<ResponseInterface<any>> {
    const product = await this._productRepository.findOne({
      where: { id: productId },
      relations: ["user", "images","variants","variants.color","variants.size"],
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

    // 6. Generate and Store Session (10 mins TTL)
    const sessionId = uuid();
    const sessionData = {
      productId,
      variantId,
      quantity,
      unitPrice,
      subtotal,
      protectionFee,
      finalPrice: finalPriceBeforeConversion,
      currency: defaultCurrency, // Store in base currency for revalidation
      userId: user.id
    };
    await this._redisService.set(`checkout:session:${sessionId}`, sessionData, 600);

    return {
      message: "Checkout preview calculated successfully",
      status: "success",
      statusCode: 200,
      data: {
        sessionId,
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

  async executeCheckout(dto: CheckoutExecuteDto, user: User) {
    const { sessionId, addressId, newAddress, paymentMethod } = dto;

    // 1. Load Session from Redis
    const sessionKey = `checkout:session:${sessionId}`;
    const sessionData = await this._redisService.get<any>(sessionKey);

    if (!sessionData) {
      throw new BadRequestException("Checkout session expired or invalid");
    }

    // ❗ Invalidate session immediately to prevent duplicate orders from rapid submissions
    await this._redisService.del(sessionKey);

    if (sessionData.userId !== user.id) {
      throw new ForbiddenException("Invalid checkout session");
    }

    const { productId, variantId, quantity, unitPrice: sessionUnitPrice, finalPrice: sessionFinalPrice } = sessionData;

    // 2. Transvalidation of Price & Inventory (Real-time)
    const product = await this._getProductWithCache(productId);
    let variant: ProductVariant | null = null;
    if (variantId) {
      variant = await this._getVariantWithCache(variantId);
    }

    const currentUnitPrice = Number(product.price) + (variant ? Number(variant.price_modifier) : 0);
    const subtotal = currentUnitPrice * quantity;
    const protectionFee = Number(FeeWithCommision(subtotal, 10)) + 0.8;
    const currentFinalPrice = subtotal + protectionFee;

    if (Math.abs(currentFinalPrice - Number(sessionFinalPrice)) > 0.01) {
      throw new BadRequestException("Product pricing has changed. Please preview again.");
    }

    // 3. Transactional Execution
    const queryRunner = this._dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // a. Handle/Update Delivery Address
      let targetAddress: UserAddress;
      if (addressId) {
        targetAddress = await queryRunner.manager.findOne(UserAddress, {
          where: { id: addressId, user_id: user.id },
        });
        if (!targetAddress) {
          throw new BadRequestException("Delivery address not found or unauthorized");
        }
      } else if (newAddress) {
        // Fix REL_... unique constraint: Update if exists, otherwise create
        const existingAddress = await queryRunner.manager.findOne(UserAddress, {
          where: { user_id: user.id },
        });

        if (existingAddress) {
          targetAddress = Object.assign(existingAddress, newAddress);
        } else {
          targetAddress = queryRunner.manager.create(UserAddress, {
            ...newAddress,
            user_id: user.id,
          });
        }
        targetAddress = await queryRunner.manager.save(UserAddress, targetAddress);
      } else {
        throw new BadRequestException("Delivery address is required");
      }

      // b. Reserve Inventory
      const inventory = await queryRunner.manager.findOne(Inventory, {
        where: { product_id: productId, variant_id: variantId ?? null },
        lock: { mode: "pessimistic_write" },
      });

      if (!inventory || inventory.stock < quantity) {
        throw new BadRequestException("Insufficient stock available");
      }

      inventory.stock -= quantity;
      inventory.reserved_stock = Number(inventory.reserved_stock || 0) + quantity;
      await queryRunner.manager.save(Inventory, inventory);

      // c. Process Payment
      if (paymentMethod === PaymentMethod.WALLET) {
        const wallet = await queryRunner.manager.findOne(Wallets, {
          where: { user_id: user.id },
          lock: { mode: "pessimistic_write" },
        });

        if (!wallet || Number(wallet.balance) < currentFinalPrice) {
          throw new BadRequestException("Insufficient wallet balance");
        }

        wallet.balance = Number(wallet.balance) - currentFinalPrice;
        await queryRunner.manager.save(Wallets, wallet);

        const transaction = queryRunner.manager.create(Transections, {
          user_id: user.id,
          wallet_id: wallet.id,
          amount: currentFinalPrice,
          transection_type: TransectionType.PHURCASE,
          paymentId: `ORDER-${Date.now()}-${user.id}`,
          paymentMethod: "Wallet",
          status: PaymentStatus.COMPLETED,
          product_id: productId,
        });
        await queryRunner.manager.save(Transections, transaction);
      }

      // d. Create Order
      const order = queryRunner.manager.create(Order, {
        buyer_id: user.id,
        seller_id: product.user_id,
        product: product,
        total: currentFinalPrice,
        protectionFee: protectionFee,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.COMPLETED,
        delivery_id: null,
      });
      const savedOrder = await queryRunner.manager.save(Order, order);

      // e. Create Order Item
      const orderItem = queryRunner.manager.create(OrderItem, {
        order_id: savedOrder.id,
        product_id: productId,
        variant_id: variantId,
        quantity,
        unit_price: currentUnitPrice,
        total_price: subtotal,
      });
      await queryRunner.manager.save(OrderItem, orderItem);

      // f. Create Order-specific Delivery Info snapshot
      const orderDeliveryInfo = queryRunner.manager.create(DeliveryAddress, {
        name: `${user.firstName} ${user.lastName}`,
        address: targetAddress.address,
        city: targetAddress.city,
        country: targetAddress.country,
        postal_code: targetAddress.postal_code,
        house_number: targetAddress.house_number,
        address_2: targetAddress.address_2,
        order: savedOrder,
      });
      await queryRunner.manager.save(DeliveryAddress, orderDeliveryInfo);

      await queryRunner.commitTransaction();
      
      await this._redisService.del(`checkout:session:${user.id}`);

      // 4. Cleanup & Notifications
      await this._redisService.deleteByPattern(`inventory:${productId}:*`);

      const notifications = [
        {
          userId: user.id,
          isImportant: true,
          action: NotificationAction.CREATED,
          related: NotificationRelated.ORDER,
          notificationFor: UserRoles.USER,
          type: NotificationType.SUCCESS,
          targetId: savedOrder.id,
          msg: `Your purchase of ${product.product_name} was successful! Order #${savedOrder.id}`,
        },
        {
          userId: product.user_id,
          isImportant: true,
          action: NotificationAction.CREATED,
          related: NotificationRelated.ORDER,
          notificationFor: UserRoles.USER,
          type: NotificationType.SUCCESS,
          targetId: savedOrder.id,
          msg: `Good news! Your product ${product.product_name} has been purchased. Order #${savedOrder.id}`,
        },
        {
          userId: null,
          isImportant: true,
          action: NotificationAction.CREATED,
          related: NotificationRelated.ORDER,
          notificationFor: UserRoles.ADMIN,
          type: NotificationType.INFO,
          targetId: savedOrder.id,
          msg: `New Order #${savedOrder.id} created by ${user.firstName} for ${product.product_name}.`,
        },
      ];

      await this._notificaionService.bulkInsertNotifications(notifications);

      await this._notificationQueue.add("order_created_event", {
        orderId: savedOrder.id,
        buyerId: user.id,
        totalPrice: savedOrder.total,
      });

      return {
        message: "Purchase successful",
        status: "success",
        statusCode: 200,
        data: savedOrder,
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
