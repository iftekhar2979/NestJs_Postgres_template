// import { Delivery } from "./entities/delivery.entity";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CollectionAddress } from "src/delivery/entities/collection_Address.entity";
import { DataSource, Repository } from "typeorm";
import { DeliveryAddress } from "./entities/delivery_information.entity";
import { Label } from "./entities/shipment_lable.entity";
import { OrderInvoice } from "./entities/shipment_order_invoice.entity";
import { Shipment } from "./entities/shipments.entity";
// import { CreateShipmentDto } from './dto/createShipment.dto';
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { Cache } from "cache-manager";
import { ConverterService } from "src/currency-converter/currency-converter.service";
import {
  NotificationAction,
  NotificationRelated,
  Notifications,
  NotificationType,
} from "src/notifications/entities/notifications.entity";
import { NotificationsService } from "src/notifications/notifications.service";
import { Order } from "src/orders/entities/order.entity";
import { OrderStatus, PaymentStatus } from "src/orders/enums/orderStatus";
import { OrdersService } from "src/orders/orders.service";
import { Product } from "src/products/entities/products.entity";
import { ProductStatus } from "src/products/enums/status.enum";
import { Transections } from "src/transections/entity/transections.entity";
import { TransectionType } from "src/transections/enums/transectionTypes";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { UserService } from "src/user/user.service";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { CreateShipmentDto } from "./dto/createShipment.dto";
import { ShipmentDocument } from "./entities/shipment_document.entity";

@Injectable()
export class ShipmentService {
  private transgloabalEndpoint: string = "";
  private apiKey: string = "";
  private apiPassword: string = "";
  private sendCloudUrl: string = "";
  constructor(
    @InjectRepository(Shipment)
    private _shipmentRepository: Repository<Shipment>,
    @InjectRepository(CollectionAddress)
    private _collectionRepository: Repository<CollectionAddress>,
    @InjectRepository(OrderInvoice)
    private _orderInvoiceRepository: Repository<OrderInvoice>,
    @InjectRepository(Label)
    private _labelRepository: Repository<Label>,
    @InjectRepository(ShipmentDocument)
    private _documentRepository: Repository<ShipmentDocument>,
    private readonly _orderService: OrdersService,
    private readonly _dataSource: DataSource,
    @InjectRepository(Product) private _productRepository: Repository<Product>,
    @InjectRepository(DeliveryAddress) private _deliveryAddressRepo: Repository<DeliveryAddress>,
    @InjectRepository(Wallets) private _walletRepository: Repository<Wallets>,
    @InjectRepository(Order) private _orderRepository: Repository<Order>,
    @InjectRepository(Notifications) private _notificationRepository: Repository<Notifications>,
    private readonly _userService: UserService,
    private readonly _notificationService: NotificationsService,
    private readonly _httpService: HttpService,
    private _configService: ConfigService,
    private readonly _currencyConverterService: ConverterService,
    // private readonly _deliveryService: DeliveryService,
    private readonly _cacheManager: Cache
  ) {
    this.transgloabalEndpoint = this._configService.get<string>("TRANSGLOBAL_API_ENDPOINTS");
    this.sendCloudUrl = this._configService.get<string>("SENDCLOUD_BASE_PANEL_URL");
    this.apiKey = this._configService.get<string>("TRANSGLOBAL_API_KEY");
    this.apiPassword = this._configService.get<string>("TRANSGLOBAL_API_PASSWORD");
  }

  // async createCollectionAddressAndShipment({
  //   createCollectionAddressDto,
  //   product_id,
  //   user,
  // }: {
  //   createCollectionAddressDto: CreateCollectionAddressDto;
  //   product_id: number;
  //   user: User;
  // }) {
  //   const queryRunner = this.dataSource.createQueryRunner();
  //   await queryRunner.startTransaction();

  //   try {
  //     const product = await this.productRepository.findOne({
  //       where: { id: product_id },
  //       relations: ["user"],
  //     });
  //     if (!product) {
  //       throw new Error("Product not found!");
  //     }

  //     if (product.user.id !== user.id) {
  //       throw new Error("You don't have the access to create shipment information!");
  //     }

  //     if (product.status === ProductStatus.SOLD) {
  //       throw new Error("Product already sold");
  //     }

  //     // Check for existing orders to get protection fee
  //     const existingOrder = await this.orderRepository.findOne({
  //       where: {
  //         product: { id: product_id },
  //       },
  //       relations: ["accepted_offer", "buyer", "seller"],
  //     });
  //     console.log(existingOrder);

  //     if (!existingOrder) {
  //       throw new Error("Order not found");
  //     }
  //     if (existingOrder.status !== OrderStatus.DELIVERY_FILLED) {
  //       throw new Error("Delivery Information not filled yet!");
  //     }

  //     const deliveryInfo = await this.deliveryAddressRepo.findOne({
  //       where: { order: { id: existingOrder.id } },
  //     });

  //     if (!deliveryInfo) {
  //       throw new Error("Delivery Information for this Order is not found!");
  //     }

  //     const BuyerWallet = await this.walletRepository.findOne({
  //       where: { user_id: existingOrder.buyer.id },
  //     });
  //     console.log(BuyerWallet);

  //     if (!BuyerWallet) {
  //       throw new Error("Buyer wallet not found");
  //     }

  //     // const productSellingPrice = Number(product.price);
  //     const productPrice = parseFloat(product.price as unknown as string);
  //     const productSellingPrice = await this._currencyConverterService.convert(
  //       user.currency.toUpperCase(),
  //       defaultCurrency,
  //       productPrice
  //     );
  //     const protectionFeeExtraCharge = await this._currencyConverterService.convert(
  //       user.currency.toUpperCase(),
  //       defaultCurrency,
  //       0.8
  //     );
  //     const protectionFee = FeeWithCommision(productSellingPrice, 10) + protectionFeeExtraCharge;

  //     if (isNaN(productSellingPrice)) {
  //       throw new Error("Invalid product price");
  //     }
  //     const totalAmount = productSellingPrice + protectionFee;
  //     console.log(totalAmount);
  //     if (BuyerWallet.balance < totalAmount) {
  //       throw new Error("Buyer don't have enough balance to purchase the product.");
  //     }
  //     // Calculate the total amount, including the protection fee and delivery charge

  //     // Save collection address details
  //     // const collection = this.collectionRepository.create({
  //     //   order: existingOrder,
  //     //   forename: product.user.firstName,
  //     //   surname: product.user.lastName,
  //     //   emailAddress: product.user.email,
  //     //   telephoneNumber: product.user.phone,
  //     //   ...createCollectionAddressDto,
  //     // });
  //     // console.log(collection, deliveryInfo);
  //     // const transglobal = await this.callTransglobalApi({
  //     //   packageInfo: {
  //     //     Weight: createCollectionAddressDto.Weight,
  //     //     Width: createCollectionAddressDto.Width,
  //     //     Height: createCollectionAddressDto.Height,
  //     //     Length: createCollectionAddressDto.Length,
  //     //   },
  //     //   deliveryInfo,
  //     //   collectionInfo: collection,
  //     // });

  //     // Check if the buyer has enough balance

  //     // Deduct the total amount from the buyer's wallet
  //     // BuyerWallet.balance -= totalAmount;
  //     // BuyerWallet.version += 1;  // Optimistic Locking, increment version to prevent race conditions

  //     // Mark product as 'SOLD'
  //     product.status = ProductStatus.SOLD;
  //     await queryRunner.manager.save(Product, product);

  //     // Update order status to 'Shipment Ready'
  //     existingOrder.status = OrderStatus.SHIPMENT_READY;
  //     existingOrder.deliveryCharge = null;
  //     existingOrder.paymentStatus = PaymentStatus.COMPLETED;
  //     await queryRunner.manager.save(Order, existingOrder);

  //     // await queryRunner.manager.save(CollectionAddress, collection);

  //     // Handle notifications
  //     const notifications = [
  //       {
  //         user: existingOrder.buyer,
  //         userId: existingOrder.buyer_id,
  //         related: NotificationRelated.ORDER,
  //         action: NotificationAction.CREATED,
  //         type: NotificationType.SUCCESS,
  //         msg: `Good news! The seller has confirmed your order. The buyer protection fee, delivery charges, and the purchase amount will be deducted from soon.`,
  //         target_id: existingOrder.id,
  //         notificationFor: UserRoles.USER,
  //         isImportant: true,
  //       },
  //       {
  //         userId: product.user.id,
  //         user: product.user,
  //         related: NotificationRelated.ORDER,
  //         action: NotificationAction.CREATED,
  //         type: NotificationType.SUCCESS,
  //         msg: `Congratulations! You've received a direct purchase for ${product.product_name}. Please prepare the product for shipment.`,
  //         target_id: existingOrder.id,
  //         notificationFor: UserRoles.USER,
  //         isImportant: true,
  //       },
  //       {
  //         userId: product.user.id,
  //         user: product.user,
  //         related: NotificationRelated.ORDER,
  //         action: NotificationAction.CREATED,
  //         type: NotificationType.SUCCESS,
  //         msg: `Attention: The product "${product.product_name}" is about to be sold. Please review and confirm the transaction.`,
  //         target_id: existingOrder.id,
  //         notificationFor: UserRoles.ADMIN,
  //         isImportant: true,
  //       },
  //     ];

  //     await this.notificationService.bulkInsertNotifications(notifications);

  //     // Commit the transaction
  //     await queryRunner.commitTransaction();

  //     return {
  //       message: "Order placed successfully and delivery address saved.",
  //       status: "success",
  //       data: null,
  //       statusCode: 200,
  //     };
  //   } catch (error) {
  //     // Rollback the transaction if something goes wrong
  //     await queryRunner.rollbackTransaction();
  //     console.error("Error during order creation:", error);
  //     throw new BadRequestException(error.message);
  //   } finally {
  //     // Release the query runner
  //     await queryRunner.release();
  //   }
  // }

  // // Create a new shipment with transaction handling
  // async create(createShipmentDto: CreateShipmentDto): Promise<Shipment> {
  //   // Start a new transaction
  //   const order = await this.orderService.findOrder({ id: createShipmentDto.order_id });
  //   // console.log(order)
  //   const queryRunner = this.shipmentRepository.manager.connection.createQueryRunner();
  //   await queryRunner.startTransaction();

  //   try {
  //     // 1. Create the Shipment entity
  //     const shipment = new Shipment();
  //     shipment.Status = createShipmentDto.Status;
  //     shipment.orderReference = createShipmentDto.orderReference;
  //     shipment.trackingURL = createShipmentDto.trackingURL;
  //     shipment.order = order; // Assuming order is already fetched

  //     // Save the shipment
  //     const savedShipment = await queryRunner.manager.save(Shipment, shipment);
  //     // 2. Create related entities (OrderInvoice, Label, Document) inside the transaction
  //     // Order Invoice
  //     if (createShipmentDto.orderInvoice) {
  //       const orderInvoice = new OrderInvoice();
  //       orderInvoice.TotalNet = createShipmentDto.orderInvoice.TotalNet;
  //       orderInvoice.Tax = createShipmentDto.orderInvoice.Tax;
  //       orderInvoice.TotalGross = createShipmentDto.orderInvoice.TotalGross;
  //       orderInvoice.shipment = savedShipment;

  //       await queryRunner.manager.save(OrderInvoice, orderInvoice); // Save OrderInvoice
  //     }

  //     // Labels
  //     if (createShipmentDto.labels && createShipmentDto.labels.length > 0) {
  //       for (const labelData of createShipmentDto.labels) {
  //         const label = new Label();
  //         label.labelRole = labelData.LabelRole;
  //         label.labelFormat = labelData.LabelFormat;
  //         label.airWaybillReference = labelData.AirWaybillReference;
  //         label.downloadURL = labelData.DownloadURL;
  //         label.shipment = savedShipment;
  //         await queryRunner.manager.save(Label, label); // Save Label
  //       }
  //     }

  //     // Documents
  //     if (createShipmentDto.documents && createShipmentDto.documents.length > 0) {
  //       for (const documentData of createShipmentDto.documents) {
  //         const document = new ShipmentDocument();
  //         document.documentType = documentData.DocumentType;
  //         document.format = documentData.Format;
  //         document.downloadURL = documentData.DownloadURL;
  //         document.shipment = savedShipment;

  //         await queryRunner.manager.save(ShipmentDocument, document); // Save Document
  //       }
  //     }

  //     // Commit the transaction after all entities are saved
  //     await queryRunner.commitTransaction();

  //     // Return the saved shipment
  //     //  savedShipment;
  //     const shipments = await this.shipmentRepository.findOne({
  //       where: { id: savedShipment.id },
  //       relations: ["order", "orderInvoice", "labels", "documents"],
  //     });
  //     if (!shipments) {
  //       throw new Error("Shipment not found after creation");
  //     }
  //     //   console.log(shipments)
  //     return shipments;
  //   } catch (error) {
  //     console.log(error);
  //     // If any error occurs, rollback the transaction
  //     await queryRunner.rollbackTransaction();
  //     throw new Error("Error occurred while creating the shipment and its related entities.");
  //   } finally {
  //     // Release the query runner to free up resources
  //     await queryRunner.release();
  //   }
  // }

  async updateOrderInfo({
    user,
    // shipmentDto,
    product_id,
  }: {
    user: User;
    product_id: number;
    shipmentDto: CreateShipmentDto;
  }) {
    try {
      const product = await this._productRepository.findOne({
        where: { id: product_id },
        relations: ["user"],
      });
      if (!product) {
        throw new Error("Product not found!");
      }

      // if (product.user.id === user.id) {
      //   throw new Error("You can't purchase your own product!");
      // }

      // if (product.status === ProductStatus.SOLD) {
      //   throw new BadRequestException("Product already sold");
      // }

      // Check for existing orders to get protection fee
      const existingOrder = await this._orderRepository.findOne({
        where: {
          product: { id: product_id },
        },
        relations: ["accepted_offer", "buyer", "seller"],
      });

      if (existingOrder.buyer.id === user.id) {
        throw new Error("You can't make shipment of your own purchase!");
      }
      if (!existingOrder) {
        throw new Error("Order not found");
      }
      if (existingOrder.status !== OrderStatus.SHIPMENT_READY) {
        throw new Error("Collection Address not filled yet!");
      }
      const deliveryInfo = await this._deliveryAddressRepo.findOne({
        where: { order: { id: existingOrder.id } },
      });
      if (!deliveryInfo) {
        throw new Error("Delivery Information for this Order is not found!");
      }
      const buyerWallet = await this._walletRepository.findOne({
        where: { user: { id: existingOrder.buyer.id } },
      });
      if (!buyerWallet) {
        throw new Error("Buyer wallet is not active !");
      }
      const queryRunner = this._dataSource.createQueryRunner();
      await queryRunner.startTransaction();
      try {
        // const shipment = await this.transglobalFinalShipment({
        //   QuoteId: shipmentDto.QuoteID,
        //   ServiceId: shipmentDto.ServiceID,
        // });
        // console.log("Shipment Information", shipment);
        // shipmentDto.orderInvoice = shipment.OrderInvoice;
        // shipmentDto.orderReference = shipment.OrderReference;
        // shipmentDto.Status = shipment.Status;

        // // const deliveryCharge = Number(shipment.OrderInvoice.TotalGross);
        const totalAmount = Number(existingOrder.total) + Number(existingOrder.protectionFee);

        // if (buyerWallet.balance <= totalAmount) {
        //   throw new Error("Buyer don't have enough balance!");
        // }

        // existingOrder.deliveryCharge = deliveryCharge;
        existingOrder.status = OrderStatus.PREPEARED;

        buyerWallet.balance -= totalAmount;
        buyerWallet.version += 1;

        const randomString = Math.random().toString(36).substring(2, 10);
        const paymentId = `Trans-${product.id}-${randomString}`;
        // // Transaction for payment
        const transaction = new Transections();
        transaction.amount = totalAmount;
        transaction.order = existingOrder;
        transaction.paymentId = paymentId;
        transaction.transection_type = TransectionType.PURCHASE;
        transaction.status = PaymentStatus.COMPLETED;
        transaction.product = product;
        transaction.paymentMethod = "Internal";
        transaction.user = existingOrder.buyer;
        transaction.wallet = buyerWallet;

        // const shipmentInfo = new Shipment();
        // shipmentInfo.Status = shipment.Status;
        // shipmentInfo.order = existingOrder;
        // shipmentInfo.orderInvoice = shipment.OrderInvoice;
        // shipmentInfo.orderReference = shipment.OrderReference;

        const notifications = [
          {
            user: user,
            userId: user.id,
            related: NotificationRelated.ORDER,
            action: NotificationAction.CREATED,
            type: NotificationType.SUCCESS,
            msg: `Your order for ${product.product_name} is handed to quorier.We deduced delivery charge, product price and protection fee from you wallet!`,
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
            msg: `You shipment is successfully updated for ${product.product_name}.Make the percel ready for shipment.`,
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
            msg: `Order : #${existingOrder.id} with ${product.product_name} is ready for shipment.`,
            target_id: product.id,
            notificationFor: UserRoles.ADMIN,
            isImportant: true,
          },
          {
            userId: existingOrder.buyer.id,
            related: NotificationRelated.WALLET,
            action: NotificationAction.CREATED,
            type: NotificationType.SUCCESS,
            msg: `Purchase successful! A total of ${totalAmount} has been deducted from your wallet for product ${product.product_name} Order #${existingOrder.id}, including delivery charges and protection fees.`,
            notificationFor: UserRoles.USER,
            isImportant: true,
            targetId: buyerWallet.id,
          },
          {
            userId: product.user.id,
            user: product.user,
            related: NotificationRelated.ORDER,
            action: NotificationAction.CREATED,
            type: NotificationType.SUCCESS,
            msg: `Order : #${existingOrder.id} with ${product.product_name} has ${totalAmount} in transection Including delivery charges and protection fees.`,
            target_id: product.id,
            notificationFor: UserRoles.ADMIN,
            isImportant: true,
          },
        ];

        // Bulk insert notifications for both user and admin
        await this._notificationService.bulkInsertNotifications(notifications);
        // Save changes within the transaction
        await queryRunner.manager.save(Order, existingOrder);
        await queryRunner.manager.save(Transections, transaction);
        await queryRunner.manager.save(Wallets, buyerWallet);
        // await queryRunner.manager.save(Shipment, shipmentInfo);
        await queryRunner.commitTransaction();

        return {
          data: existingOrder,
          statusCode: 201,
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
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async UpdateShipmentInformationLater({ user, product_id }: { user: User; product_id: number }) {
    const product = await this._productRepository.findOne({
      where: { id: product_id },
      relations: ["user"],
    });
    if (!product) {
      throw new BadRequestException("Product not found!");
    }

    // if (product.user.id === user.id) {
    //   throw new ForbiddenException("You df can't purchase your own product!");
    // }
    // Check for existing orders to get protection fee
    const existingOrder = await this._orderRepository.findOne({
      where: {
        product: { id: product_id },
      },
      relations: ["accepted_offer", "buyer", "seller"],
    });
    if (!existingOrder) {
      throw new NotFoundException("No order assigned with the given product.");
    }
    console.log(existingOrder);
    if (existingOrder.buyer.id === user.id) {
      throw new BadRequestException("You can't make shipment of your own purchase!");
    }

    if (existingOrder.status !== OrderStatus.SHIPMENT_READY) {
      throw new BadRequestException("Collection Address not filled yet!");
    }
    const deliveryInfo = await this._deliveryAddressRepo.findOne({
      where: { order: { id: existingOrder.id } },
    });
    if (!deliveryInfo) {
      throw new BadRequestException("Delivery Information not Filled yet!");
    }
    // const collectionInfo = await this.collectionRepository.findOne({
    //   where: { order: { id: existingOrder.id } },
    // });
    // if (!collectionInfo) {
    //   throw new BadRequestException("Collection Information not Filled yet");
    // }
    const shipmentInfo = await this._shipmentRepository.findOne({
      where: { order: { id: existingOrder.id } },
    });
    if (shipmentInfo) {
      throw new BadRequestException("Shipment Information already exist !");
    }
    const buyerWallet = await this._walletRepository.findOne({
      where: { user: { id: existingOrder.buyer.id } },
    });
    if (!buyerWallet) {
      throw new BadRequestException("Buyer wallet is not active !");
    }
    const queryRunner = this._dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    try {
      const productSellingPrice = Number(product.price);
      if (isNaN(productSellingPrice)) {
        throw new Error("Invalid product price");
      }
      const protectionFee = Number(existingOrder.protectionFee) || 0;
      const totalAmount = productSellingPrice + protectionFee;
      if (buyerWallet.balance < totalAmount) {
        throw new Error("Buyer don't have enough balance to purchase the product.");
      }
      // Calculate the total amount, including the protection fee and delivery charge

      // // Save collection address details
      // const collection = this.collectionRepository.create({
      //   order: existingOrder,
      //   forename: product.user.firstName,
      //   surname: product.user.lastName,
      //   emailAddress: product.user.email,
      //   telephoneNumber: product.user.phone,
      //   ...collectionInfo,
      // });

      // // const transglobal = await this.callTransglobalApi({
      // //   packageInfo: {
      // //     Weight: collectionInfo.Weight,
      // //     Width: collectionInfo.Width,
      // //     Height: collectionInfo.Height,
      // //     Length: collectionInfo.Length,
      // //   },
      // //   deliveryInfo,
      // //   collectionInfo: collection,
      // // });
      // console.log(transglobal);
      // Mark product as 'SOLD'
      product.status = ProductStatus.SOLD;
      await queryRunner.manager.save(Product, product);

      // Update order status to 'Shipment Ready'
      existingOrder.status = OrderStatus.SHIPMENT_READY;
      existingOrder.deliveryCharge = null;
      existingOrder.paymentStatus = PaymentStatus.COMPLETED;
      await queryRunner.manager.save(Order, existingOrder);

      // await queryRunner.manager.save(CollectionAddress, collection);

      // Handle notifications
      const notifications = [
        {
          user: existingOrder.buyer,
          userId: existingOrder.buyer_id,
          related: NotificationRelated.ORDER,
          action: NotificationAction.CREATED,
          type: NotificationType.SUCCESS,
          msg: `Good news! The seller has confirmed your order. The buyer protection fee, delivery charges, and the purchase amount will be deducted soon.`,
          target_id: existingOrder.id,
          notificationFor: UserRoles.USER,
          isImportant: true,
        },
        {
          userId: product.user.id,
          user: product.user,
          related: NotificationRelated.ORDER,
          action: NotificationAction.CREATED,
          type: NotificationType.SUCCESS,
          msg: `Congratulations! You've received a direct purchase for ${product.product_name}. Please prepare the product for shipment.`,
          target_id: existingOrder.id,
          notificationFor: UserRoles.USER,
          isImportant: true,
        },
        {
          userId: product.user.id,
          user: product.user,
          related: NotificationRelated.ORDER,
          action: NotificationAction.CREATED,
          type: NotificationType.SUCCESS,
          msg: `Attention: The product "${product.product_name}" is about to be sold. Please review and confirm the transaction.`,
          target_id: existingOrder.id,
          notificationFor: UserRoles.ADMIN,
          isImportant: true,
        },
      ];

      await this._notificationService.bulkInsertNotifications(notifications);

      // Commit the transaction
      await queryRunner.commitTransaction();

      return {
        message: "Order placed successfully and delivery address saved.",
        status: "success",
        data: null,
        statusCode: 200,
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
