import { Length } from "class-validator";
import { UserService } from "./../user/user.service";
// import { NotificationService } from 'src/notification/notification.service';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { DeliveryAddress } from "./entities/delivery_information.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { CreateDeliveryAddressDto } from "./dto/createDelivery.dto";
import { DELIVERY_PROTECTION_PERCENTAGE, Product } from "src/products/entities/products.entity";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { defaultCurrency, ProductStatus } from "src/products/enums/status.enum";
import { User } from "src/user/entities/user.entity";
import { Order } from "src/orders/entities/order.entity";
import { OrderStatus, PaymentStatus } from "src/orders/enums/orderStatus";
import {
  NotificationAction,
  NotificationRelated,
  Notifications,
  NotificationType,
} from "src/notifications/entities/notifications.entity";
import { NotificationsService } from "src/notifications/notifications.service";
import { UserRoles } from "src/user/enums/role.enum";
import { FeeWithCommision, validateAddress } from "src/shared/utils/utils";
import { ConverterService } from "src/currency-converter/currency-converter.service";
import { CARRER_TYPE } from "src/products/dto/CreateProductDto.dto";
import { Logger } from "winston";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { ConfigService } from "@nestjs/config";
// import { CollectionAddress } from "./entities/collection_Address.entity";
import { Transections } from "src/transections/entity/transections.entity";
import { TransectionType } from "src/transections/enums/transectionTypes";
import { SendcloudService } from "src/sendcloud/sendcloud.service";
import { FavouritesService } from "src/favourites/favourites.service";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { MailService } from "src/mail/mail.service";
import { createDirectPurchaseNotifications, createOrderNotifications } from "./utils/notification";

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(DeliveryAddress)
    private readonly _deliveryAddressRepository: Repository<DeliveryAddress>,
    private readonly _dataSource: DataSource,
    @InjectRepository(Product) private _productRepository: Repository<Product>,
    @InjectRepository(Wallets) private _walletRepository: Repository<Wallets>,
    @InjectRepository(Order) private _orderRepository: Repository<Order>,
    @InjectRepository(Notifications) private _notificationRepository: Repository<Notifications>,
    private readonly _userService: UserService,
    private readonly _notificationService: NotificationsService,
    private readonly _currencyConverterService: ConverterService,
    @InjectLogger() private readonly _logger: Logger,
    private readonly _configService: ConfigService,
    private readonly _sendCloudService: SendcloudService,
    private readonly _favouriteService: FavouritesService,
    @InjectQueue("product") private readonly _queue: Queue,

    @InjectQueue("notifications") private readonly _notificationQueue: Queue
  ) {}
  async createDeliveryAddress({
    createDeliveryAddressDto,
    product_id,
    user,
  }: {
    createDeliveryAddressDto: CreateDeliveryAddressDto;
    product_id: number;
    user: User;
  }) {
    try {
      let service_point_id: number = 0;
      // if (createDeliveryAddressDto.carrer_type === CARRER_TYPE.COLLECTION_TYPE) {
      validateAddress({
        dto: createDeliveryAddressDto,
        requiredFields: ["address", "house_number", "city", "country", "postal_code", "company_name"],
      });
      service_point_id = createDeliveryAddressDto.service_point_id;
      // }
      this._logger.log("Service Point", service_point_id);
      const product = await this._productRepository.findOne({
        where: { id: product_id },
        relations: ["user", "offer"],
      });
      const order = await this._orderRepository.findOne({
        where: { product: { id: product_id } },
        relations: ["deliveryInfo"],
      });
      console.log("Order", order);
      // const deliveryInfo = order.deliveryInfo;
      if (order) {
        if (order.deliveryInfo && order.status === OrderStatus.DELIVERY_FILLED) {
          delete createDeliveryAddressDto.carrer_type;
          delete createDeliveryAddressDto.country_state;
          await this._deliveryAddressRepository.update(order.deliveryInfo.id, createDeliveryAddressDto);
          return {
            message: "Please make the payment .",
            status: "success",
            data: product,
            statusCode: 200,
          };
        }
      }

      const userInfo = await this._userService.getUserById(user.id);
      // Check if product exists and the current user can purchase it
      if (!product) {
        throw new BadRequestException("Product not found");
      }
      // Check product ownership and status
      if (product.user.id === user.id) {
        throw new ForbiddenException("You can't purchase your own product!");
      }

      if (product.status === ProductStatus.SOLD) {
        throw new BadRequestException("Product already sold");
      }
      console.log(product);
      if (product.status !== ProductStatus.AVAILABLE) {
        throw new ForbiddenException("Product is no longer available for purchase.");
      }
      const wallets = await this._walletRepository.findOne({
        where: { user_id: user.id },
      });

      if (!wallets) {
        throw new BadRequestException("User wallet not found");
      }
      const productPrice = parseFloat(product.selling_price as unknown as string);
      const productSellingPrice = await this._currencyConverterService.convert(
        user.currency.toUpperCase(),
        defaultCurrency,
        productPrice
      );
      const protectionFeeExtraCharge = await this._currencyConverterService.convert(
        user.currency.toUpperCase(),
        defaultCurrency,
        0.8
      );
      if (isNaN(productSellingPrice)) {
        throw new BadRequestException("Invalid product price");
      }
      const protectionFee = FeeWithCommision(productSellingPrice, 10) + 0.8;
      // Calculate protection fee (5% of the product price)
      const convertedProtectionFee = FeeWithCommision(productSellingPrice, 10) + protectionFeeExtraCharge;
      const totalAmount = productSellingPrice + convertedProtectionFee;

      // Check if buyer has sufficient balance
      if (wallets.balance < totalAmount) {
        throw new BadRequestException("You don't have enough balance to purchase the product.");
      }

      const queryRunner = this._dataSource.createQueryRunner();
      await queryRunner.startTransaction();

      try {
        // Retrieve product and user relationship in one call
        const existingOrder = await this._orderRepository.findOne({
          where: {
            product: {
              id: product_id,
            },
          },
          relations: ["accepted_offer"],
        });

        // Retrieve the buyer's wallet and check balance

        product.status = ProductStatus.IN_PROGRESS;
        await queryRunner.manager.save(Product, product);

        if (!existingOrder) {
          const order = new Order();
          order.product = product;
          order.buyer = user;
          order.seller = product.user;
          order.offer_id = null;
          order.buyer_id = user.id;
          order.seller_id = product.user.id;
          order.status = OrderStatus.DELIVERY_FILLED;
          order.protectionFee = protectionFee;
          order.total = Number(product.selling_price);
          await queryRunner.manager.save(Order, order);
          this._logger.log(`New Order Created `, order.id);
          const deliveryInfo =
            createDeliveryAddressDto.carrer_type === CARRER_TYPE.SERVICE_TYPE
              ? {
                  order,
                  service_point_id,
                  name: `${userInfo.firstName} ${userInfo.lastName}`,
                  email: userInfo.email,
                  company_name: createDeliveryAddressDto.company_name,
                  telephone: userInfo.phone,
                  // service_point_id: null,
                  ...createDeliveryAddressDto,
                }
              : {
                  order,
                  name: `${userInfo.firstName} ${userInfo.lastName}`,
                  email: userInfo.email,
                  company_name: createDeliveryAddressDto.company_name,
                  telephone: userInfo.phone,
                  service_point_id: null,
                  ...createDeliveryAddressDto,
                };
          const deliveryAddress = this._deliveryAddressRepository.create(deliveryInfo);
          await queryRunner.manager.save(deliveryAddress);
          this._logger.log(`New Delivery Created `, deliveryAddress.id);
          order.deliveryInfo = deliveryAddress;
          order.delivery_id = deliveryAddress.id;
          this._logger.log(`order ${order.id} will update with`, deliveryAddress.id);
          await queryRunner.manager.save(Order, order);
          this._logger.log(`Order Update with Delivery Address`, order.deliveryInfo);
        } else {
          existingOrder.total = Number(product.selling_price);
          existingOrder.protectionFee = protectionFee;
          existingOrder.status = OrderStatus.DELIVERY_FILLED;
          await queryRunner.manager.save(Order, existingOrder);

          const deliveryInfo =
            createDeliveryAddressDto.carrer_type === CARRER_TYPE.SERVICE_TYPE
              ? { order: existingOrder, service_point_id }
              : {
                  order: existingOrder,
                  name: `${userInfo.firstName} ${userInfo.lastName}`,
                  email: userInfo.email,
                  company_name: createDeliveryAddressDto.company_name,
                  telephone: userInfo.phone,
                  ...createDeliveryAddressDto,
                };
          const deliveryAddress = this._deliveryAddressRepository.create(deliveryInfo);
          await queryRunner.manager.save(deliveryAddress);

          existingOrder.deliveryInfo = deliveryAddress;
          await queryRunner.manager.save(Order, existingOrder);
        }
        // Handle notifications
        const notifications = createDirectPurchaseNotifications({ product, user, isImportant: true });

        // Bulk insert notifications for both user and admin
        await this._notificationQueue.add("multiple_notification_saver", notifications);

        // Commit the transaction
        await queryRunner.commitTransaction();

        return {
          message: "Order placed successfully and delivery address saved.",
          status: "success",
          data: product,
          statusCode: 200,
        };
      } catch (error) {
        // Rollback the transaction if something goes wrong
        await queryRunner.rollbackTransaction();
        console.error("Error during order creation:", error);
        throw new BadRequestException("Error creating delivery address");
      } finally {
        // Release the query runner
        await queryRunner.release();
      }
    } catch (error) {
      console.log(error);
      throw new BadRequestException(error.message);
    }
  }

  async getDeliveryPricing({ productId, user }: { productId: number; user?: User }) {
    const order = await this._orderRepository.findOne({
      where: {
        product: {
          id: productId,
        },
      },
      relations: ["product", "deliveryInfo"],
    });
    if (!order) {
      throw new NotFoundException("Order not found!");
    }
    if (order.status !== OrderStatus.DELIVERY_FILLED) {
      throw new BadRequestException("Delivery Information not filled yet!");
    }
    const product = order.product;
    console.log(product);
    const collectionInfo = product.collectionAddress;

    const deliveryInfo = order.deliveryInfo;
    this._logger.log("Delivery Info", deliveryInfo);
    this._logger.log("Collection Info", collectionInfo);
    if (product.collectionAddress && !deliveryInfo.service_point_id) {
      if (!collectionInfo.postal_code) {
        throw new BadRequestException("Collection postal code not filled");
      }
      if (!collectionInfo.country) {
        throw new BadRequestException("Collection country not filled");
      }
      if (!deliveryInfo.country) {
        throw new BadRequestException("Delivery postal code not filled");
      }
      if (!deliveryInfo.country) {
        throw new BadRequestException("Delivery country not filled");
      }
    }

    const params = {
      from: {
        postal_code: collectionInfo?.postal_code || "",
        country: collectionInfo?.country || "",
      },
      to: {
        postal_code: deliveryInfo?.postal_code || "",
        country: deliveryInfo?.country || "",
      },
      product,
      service_point_id: null,
    };
    if (deliveryInfo.service_point_id) {
      params.service_point_id = deliveryInfo.service_point_id;
    }

    const shippingMethods = await this._sendCloudService.getShippingMethods(params);

    return {
      message: "Shipping methods retrived successfully",
      statusCode: 200,
      data: { shippingMethods, order },
    };
  }
  async getShippingsEstimate({
    productId,
    user,
    shippingId,
    order,
  }: {
    productId: number;
    user: User;
    shippingId: number;
    order?: Order;
  }) {
    if (!order) {
      order = await this._orderRepository.findOne({
        where: {
          product: {
            id: productId,
          },
        },
        relations: ["product", "deliveryInfo"],
      });
    }
    // console.log(order.status);
    if (order.product.status === ProductStatus.SOLD) {
      throw new Error("Product is no longer availible to sells");
    }
    if (order.status === OrderStatus.SHIPMENT_READY) {
      throw new Error("Product status not valid to payment!");
    }
    if (order.paymentStatus === PaymentStatus.COMPLETED) {
      throw new Error("Already sold product can't be requested for purchase!");
    }

    if (order.status !== OrderStatus.DELIVERY_FILLED) {
      throw new Error("Delivery Information not filled yet!");
    }
    const product = order.product;

    const collectionInfo = product.collectionAddress;

    const deliveryInfo = order.deliveryInfo;
    this._logger.log("Collection Addres , Delivery Service point", {
      deliveryInfo,
      collection: product.collectionAddress,
    });
    const params = {
      from: {
        postal_code: collectionInfo.postal_code,
        country: collectionInfo.country,
      },
      to: {
        postal_code: deliveryInfo.postal_code,
        country: deliveryInfo.country,
      },
      product,
      service_point_id: null,
    };
    if (!deliveryInfo.service_point_id) {
      if (order.buyer_id !== user.id) {
        throw new BadRequestException(`You are not authorized to pay for the product .`);
      }
      if (product.user.id === user.id) {
        throw new BadRequestException(`You are the product owner . You can't make your own parcels `);
      }
      if (!collectionInfo) {
        throw new Error(`Collection address not filled yet !`);
      }
      if (!collectionInfo) {
        throw new Error(`Collection address not found!`);
      }
    } else {
      params.service_point_id = deliveryInfo.service_point_id;
    }
    console.log(params);
    const pricing = await this._sendCloudService.getEstimateOfSingleShipping(params, shippingId);
    console.log(pricing);
    console.log(pricing.length === 0);
    if (pricing.length === 0) {
      throw new BadRequestException(
        "Currently the shipping method is not available . Please try another one !"
      );
    }
    const shippingMethodPrice = parseFloat(pricing[0].price);
    const fee = (shippingMethodPrice * DELIVERY_PROTECTION_PERCENTAGE) / 100;
    console.log("Pricing Info");
    let pricingInfo = {
      deliveryCharge: shippingMethodPrice,
      deliveryProtectionFee: fee,
      productPrice: parseFloat(order.total as unknown as string),
      productProtectionFee: parseFloat(order.protectionFee as unknown as string),
      total:
        shippingMethodPrice +
        fee +
        parseFloat(order.total as unknown as string) +
        parseFloat(order.protectionFee as unknown as string),
      currency: "GBP",
    } as any;
    console.log(pricingInfo);
    this._logger.log("Delivery Charge", pricingInfo);
    if (!pricingInfo.deliveryCharge) {
      throw new BadRequestException(
        "Currently the shipping method is not available . Please try another one !"
      );
    }

    // console.log(order);
    console.time("Shipping Method Fetch Time");
    const shippingMethodInfo = await this._sendCloudService.getSpecificShippingMethods(shippingId);
    console.timeEnd("Shipping Method Fetch Time");
    console.time("Currency Conversion Time");
    // console.log(user);
    pricingInfo = (await this._currencyConverterService.convertMultiple(
      defaultCurrency,
      user.currency.toUpperCase(),
      {
        productPrice: pricingInfo.productPrice,
        productProtectionFee: pricingInfo.productProtectionFee,
        deliveryCharge: pricingInfo.deliveryCharge,
        deliveryProtectionFee: pricingInfo.deliveryProtectionFee,
      }
    )) as {
      productPrice: number;
      productProtectionFee: number;
      deliveryCharge: number;
      deliveryProtectionFee: number;
      total?: number;
    };
    const total =
      pricingInfo.productPrice +
      pricingInfo.productProtectionFee +
      pricingInfo.deliveryCharge +
      pricingInfo.deliveryProtectionFee;
    pricingInfo.total = total;
    pricingInfo.currency = user.currency.toUpperCase();
    console.timeEnd("Currency Conversion Time");
    return {
      message: " shipping estimation retrived successfully",
      statusCode: 200,
      data: { pricingInfo, shippingMethodInfo: shippingMethodInfo.shipping_method, pricing, order },
    };
  }
  priceCalculation({ shippingMethodPrice, order }: { shippingMethodPrice: number; order: Order }) {
    const fee = (shippingMethodPrice * DELIVERY_PROTECTION_PERCENTAGE) / 100;
    return {
      deliveryCharge: shippingMethodPrice,
      deliveryProtectionFee: fee,
      productPrice: parseFloat(order.total as unknown as string),
      productProtectionFee: parseFloat(order.protectionFee as unknown as string),
      total:
        shippingMethodPrice +
        fee +
        parseFloat(order.total as unknown as string) +
        parseFloat(order.protectionFee as unknown as string),
      currency: "GBP",
    };
  }

  async createParcel({
    user,
    productId,
    shippingMethodId,
  }: {
    user: User;
    productId: number;
    shippingMethodId: number;
  }) {
    const order = await this._orderRepository.findOne({
      where: {
        product: {
          id: productId,
        },
      },
      relations: ["product", "deliveryInfo", "buyer", "seller"],
    });

    // console.log(order);
    const wallet = await this._walletRepository.findOne({
      where: {
        user: {
          id: user.id,
        },
      },
    });
    if (!order) {
      throw new BadRequestException("Order not found!");
    }
    const product = order.product;
    const deliveryAddress = order.deliveryInfo;
    const collectionAddress = order.product.collectionAddress;
    this._logger.log("Delivery Address", deliveryAddress);
    this._logger.log("Collection Address", collectionAddress);
    if (order.buyer_id !== user.id) {
      throw new ForbiddenException(`You are not authorized to pay for the product .`);
    }
    if (product.user.id === user.id) {
      throw new BadRequestException(`You are the product owner . You can't make your own parcels `);
    }
    if (!deliveryAddress) {
      throw new BadRequestException(`Delivery address not filled yet !`);
    }
    if (!collectionAddress) {
      throw new BadRequestException(`Collection address not found!`);
    }
    const pricing = await this.getShippingsEstimate({
      productId: product.id,
      user,
      shippingId: shippingMethodId,
      order,
    });
    // console.log(pricing);
    const pricingInfo = pricing.data.pricingInfo as {
      deliveryCharge: number;
      deliveryProtectionFee: number;
      productPrice: number;
      total: number;
      currency: string;
    };
    let parcelInfo;
    if (wallet.balance < pricingInfo.total + 1) {
      throw new BadRequestException(`You don't have enough balance on your account . Please top up`);
    }
    const queryRunner = this._dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    await this._favouriteService.removeFavorite({
      userId: user.id,
      productId: product.id,
      manager: queryRunner.manager,
    });
    try {
      wallet.balance -= pricingInfo.total;
      wallet.version++;
      await queryRunner.manager.save(Wallets, wallet);

      product.status = ProductStatus.SOLD;

      await queryRunner.manager.save(Product, product);

      const randomString = Math.random().toString(36).substring(2, 10);
      const paymentId = `Trans-${product.id}-${randomString}`;
      // // Transaction for payment
      const transaction = new Transections();
      transaction.amount = pricingInfo.total;
      transaction.order = order;
      transaction.order_id = order.id;
      transaction.product_id = product.id;
      transaction.paymentId = paymentId;
      transaction.transection_type = TransectionType.PHURCASE;
      transaction.status = PaymentStatus.COMPLETED;
      transaction.product = product;
      transaction.paymentMethod = "Internal";
      transaction.user = user;
      transaction.wallet = wallet;

      parcelInfo = await this._sendCloudService.createParcelIntoSendCloud({
        from: collectionAddress,
        to: deliveryAddress,
        product: product,
        shippingMethodId,
      });
      if (Object.keys(parcelInfo).length === 0) {
        throw new Error("Parcel Information not created successfully");
      }
      this._logger.log(`Parcel Informations`, parcelInfo);
      order.parcel_id = parcelInfo.parcel.id;
      order.status = OrderStatus.SHIPMENT_READY;

      await queryRunner.manager.save(Transections, transaction);
      await queryRunner.manager.save(Order, order);
      const notifications = createOrderNotifications({ user, order, product, isImportant: true });
      this._logger.log("Order Info before mail ", { order, parcelInfo, pricingInfo });

      await this._queue.add("orderConfirmation", {
        order,
        parcelInfo,
        pricingInfo,
      });
      await this._notificationQueue.add("multiple_notification_saver", notifications);
      // Bulk insert notifications for both user and admin
      // await this._notificationService.bulkInsertNotifications(notifications);
      await queryRunner.commitTransaction();
      // await this._queue.

      return {
        message: "Payment successfull",
        statusCode: 201,
        data: {
          pricing,
          parcelInfo,
        },
      };
    } catch (error) {
      // Rollback the transaction if something goes wrong
      await queryRunner.rollbackTransaction();
      console.error("Error during order creation:", error);
      throw new BadRequestException(error.message);
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }
}
