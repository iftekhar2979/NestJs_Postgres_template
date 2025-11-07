import { UserService } from "./../user/user.service";
// import { NotificationService } from 'src/notification/notification.service';
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DeliveryAddress } from "./entities/delivery_information.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { CreateDeliveryAddressDto } from "./dto/createDelivery.dto";
import { DELIVERY_PROTECTION_PERCENTAGE, Product } from "src/products/entities/products.entity";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { defaultCurrency, ProductStatus } from "src/products/enums/status.enum";
import { User } from "src/user/entities/user.entity";
import { Order } from "src/orders/entities/order.entity";
import { OrderStatus } from "src/orders/enums/orderStatus";
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
    private readonly _configService: ConfigService
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
              ? { order, service_point_id }
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
        const notifications = [
          {
            user: user,
            userId: user.id,
            related: NotificationRelated.ORDER,
            action: NotificationAction.CREATED,
            type: NotificationType.SUCCESS,
            msg: `Your Order is in progress. After payment confirmation you the product will purchased .`,
            target_id: product.id,
            notificationFor: UserRoles.USER,
            isImportant: true,
          },
          {
            userId: product.user.id,
            user: product.user,
            related: NotificationRelated.ORDER,
            action: NotificationAction.CREATED,
            type: NotificationType.SUCCESS,
            msg: `You have a direct purchase for ${product.product_name} `,
            target_id: product.id,
            notificationFor: UserRoles.USER,
            isImportant: true,
          },
          {
            userId: product.user.id,
            user: product.user,
            related: NotificationRelated.ORDER,
            action: NotificationAction.CREATED,
            type: NotificationType.SUCCESS,
            msg: `${product.product_name} is going to be sold.`,
            target_id: product.id,
            notificationFor: UserRoles.ADMIN,
            isImportant: true,
          },
        ];

        // Bulk insert notifications for both user and admin
        await this._notificationService.bulkInsertNotifications(notifications);

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
  async getDeliveryPricing({ productId, user }: { productId: number; user: User }) {
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
      throw new BadGatewayException("Delivery Information not filled yet!");
    }
    const product = order.product;

    const collectionInfo = product.collectionAddress;

    const deliveryInfo = order.deliveryInfo;
    // console.log(product);

    const shippingMethods = await this.getShippingMethods({
      from: {
        postal_code: collectionInfo.postal_code,
        country: collectionInfo.country,
      },
      to: {
        postal_code: deliveryInfo.postal_code,
        country: deliveryInfo.country,
      },
      product,
    });

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
  }: {
    productId: number;
    user: User;
    shippingId: number;
  }) {
    const order = await this._orderRepository.findOne({
      where: {
        product: {
          id: productId,
        },
      },
      relations: ["product", "deliveryInfo"],
    });
    if (order.status !== OrderStatus.DELIVERY_FILLED) {
      throw new BadGatewayException("Delivery Information not filled yet!");
    }
    const product = order.product;

    const collectionInfo = product.collectionAddress;

    const deliveryInfo = order.deliveryInfo;
    const pricing = await this.getEstimateOfSingleShipping(
      {
        from: {
          postal_code: collectionInfo.postal_code,
          country: collectionInfo.country,
        },
        to: {
          postal_code: deliveryInfo.postal_code,
          country: deliveryInfo.country,
        },
        product,
      },
      shippingId
    );
    if (pricing.length === 0) {
      throw new BadRequestException("Shipping Method is not valid");
    }
    const shippingMethodPrice = parseFloat(pricing[0].price);
    const fee = (shippingMethodPrice * DELIVERY_PROTECTION_PERCENTAGE) / 100;
    const pricingInfo = {
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

    return {
      message: " shipping estimation retrived successfully",
      statusCode: 200,
      data: { pricingInfo, pricing, order },
    };
  }
  async getShippingMethods(address: {
    from: { country: string; postal_code: string };
    to: { country: string; postal_code: string };
    product?: Product;
  }) {
    const publicKey = this._configService.get("SENDCLOUD_PUBLIC_KEY");
    const secretKey = this._configService.get("SENDCLOUD_SECRET_KEY");

    const baseUrl = this._configService.get("SENDCLOUD_BASE_PANEL_URL");
    const url = `${baseUrl}/shipping_methods?to_country=${address.to.country}&to_postal_code=${address.to.postal_code}&from_postal_code=${address.from.postal_code}&from_country=${address.from.country}&limit=50`;

    const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });
    // console.log(response);
    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`SendCloud API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }
  async getEstimateOfSingleShipping(
    address: {
      from: { country: string; postal_code: string };
      to: { country: string; postal_code: string };
      product: Product;
    },
    shippingId: number
  ) {
    const publicKey = this._configService.get("SENDCLOUD_PUBLIC_KEY");
    const secretKey = this._configService.get("SENDCLOUD_SECRET_KEY");

    const baseUrl = this._configService.get("SENDCLOUD_BASE_PANEL_URL");
    const url = `${baseUrl}/shipping-price?shipping_method_id=${shippingId}&to_country=${address.to.country}&to_postal_code=${address.to.postal_code}&from_postal_code=${address.from.postal_code}&from_country=${address.from.country}&weight=${address.product.weight}&weight_unit=kilogram`;
    console.log(url);
    const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`SendCloud API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }
  async getServicePoints(address: {
    from: { country: string; postal_code: string };
    to: { country: string; postal_code: string };
    product?: Product;
  }) {
    const publicKey = this._configService.get("SENDCLOUD_PUBLIC_KEY");
    const secretKey = this._configService.get("SENDCLOUD_SECRET_KEY");

    const baseUrl = this._configService.get("SENDCLOUD_BASE_SERVICE_POINT_URL");
    const url = `${baseUrl}/service-points?to_country=${address.to.country}&to_postal_code=${address.to.postal_code}&from_postal_code=${address.from.postal_code}&from_country=${address.from.country}&limit=50`;

    const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    });
    // console.log(response);
    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`SendCloud API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  // async updateDeliveryAddress(id: number, updateDeliveryAddressDto: UpdateDeliveryAddressDto): Promise<DeliveryAddress> {
  //   const deliveryAddress = await this._deliveryAddressRepository.findOne({where:{id}});
  //   if (!deliveryAddress) {
  //     throw new NotFoundException('Delivery address not found');
  //   }
  //   Object.assign(deliveryAddress, updateDeliveryAddressDto);

  //   try {
  //     return await this._deliveryAddressRepository.save(deliveryAddress);
  //   } catch (error) {
  //     throw new BadRequestException('Error updating delivery address');
  //   }
  // }

  // Get Delivery Address by ID
  // async getDeliveryAddressById(id: number): Promise<DeliveryAddress> {
  //   const deliveryAddress = await this._deliveryAddressRepository.findOne({ where: { id } });
  //   if (!deliveryAddress) {
  //     throw new NotFoundException("Delivery address not found");
  //   }
  //   return deliveryAddress;
  // }

  // Delete Delivery Address
  // async deleteDeliveryAddress(id: number): Promise<void> {
  //   const deliveryAddress = await this._deliveryAddressRepository.findOne({ where: { id } });
  //   if (!deliveryAddress) {
  //     throw new NotFoundException("Delivery address not found");
  //   }

  //   try {
  //     await this._deliveryAddressRepository.remove(deliveryAddress);
  //   } catch (error) {
  //     throw new BadRequestException("Error deleting delivery address");
  //   }
  // }
}
