import { DeliveryAddress } from './entities/delivery_information.entity';
import { number } from 'joi';
import { CollectionAddress } from 'src/delivery/entities/collection_Address.entity';
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Shipment } from './entities/shipments.entity';
import { OrderInvoice } from './entities/shipment_order_invoice.entity';
import { Label } from './entities/shipment_lable.entity';
// import { CreateShipmentDto } from './dto/createShipment.dto';
import { ShipmentDocument } from './entities/shipment_document.entity';
import { CreateShipmentDto } from './dto/createShipment.dto';
import { OrdersService } from 'src/orders/orders.service';
import { Product } from 'src/products/entities/products.entity';
import { Wallets } from 'src/wallets/entity/wallets.entity';
import { Order } from 'src/orders/entities/order.entity';
import { NotificationAction, NotificationRelated, Notifications, NotificationType } from 'src/notifications/entities/notifications.entity';
import { UserService } from 'src/user/user.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CreateCollectionAddressDto, CreateDeliveryAddressDto } from './dto/createDelivery.dto';
import { User } from 'src/user/entities/user.entity';
import { ProductStatus } from 'src/products/enums/status.enum';
import { OrderStatus, PaymentStatus } from 'src/orders/enums/orderStatus';
import { Transections } from 'src/transections/entity/transections.entity';
import { TransectionType } from 'src/transections/enums/transectionTypes';
import { UserRoles } from 'src/user/enums/role.enum';
import { lastValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class ShipmentService {
  constructor(
    @InjectRepository(Shipment)
    private shipmentRepository: Repository<Shipment>,
    @InjectRepository(CollectionAddress)
    private collectionRepository: Repository<CollectionAddress>,
    @InjectRepository(OrderInvoice)
    private orderInvoiceRepository: Repository<OrderInvoice>,
    @InjectRepository(Label)
    private labelRepository: Repository<Label>,
    @InjectRepository(ShipmentDocument)
    private documentRepository: Repository<ShipmentDocument>,
    private readonly orderService: OrdersService,
     private readonly dataSource: DataSource, 
                @InjectRepository(Product) private productRepository: Repository<Product>,
                @InjectRepository(DeliveryAddress) private deliveryAddressRepo: Repository<DeliveryAddress>,
                @InjectRepository(Wallets) private walletRepository: Repository<Wallets>,
                @InjectRepository(Order) private orderRepository:Repository<Order>,
                @InjectRepository(Notifications) private notificationRepository:Repository<Notifications>,
                private readonly userService:UserService,
                private readonly notificationService:NotificationsService,
                private readonly httpService:HttpService
  ) {}
async createCollectionAddress({
  createDeliveryAddressDto,
  product_id,
  user,
}: {
  createDeliveryAddressDto: CreateDeliveryAddressDto;
  product_id: number;
  user: User;
}){

}

 async createCollectionAddressAndShipment({
  createDeliveryAddressDto,
  product_id,
  user,
  deliveryCharge,
}: {
  createDeliveryAddressDto: CreateCollectionAddressDto;
  product_id: number;
  user: User;
  deliveryCharge: number;
}) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.startTransaction();

  try {
    const product = await this.productRepository.findOne({
      where: { id: product_id },
      relations: ['user'],
    });
    if (!product) {
      throw new BadRequestException("Product not found!");
    }

    if (product.user.id === user.id) {
      throw new ForbiddenException("You can't purchase your own product!");
    }

    if (product.status === ProductStatus.SOLD) {
      throw new BadRequestException("Product already sold");
    }

    // Check for existing orders to get protection fee
    const existingOrder = await this.orderRepository.findOne({
      where: {
        product: { id: product_id },
      },
      relations: ['accepted_offer'],
    });

    if (!existingOrder) {
      throw new BadRequestException("Order not found");
    }

    const deliveryInfo = await this.deliveryAddressRepo.findOne({where:{order:{id:existingOrder.id}}})
    
if(!deliveryInfo){
  throw new BadRequestException("Delivery Information for this Order is not found!")
}
    // Save collection address details
    const collection = this.collectionRepository.create({
      order: existingOrder,
      forename: product.user.firstName,
      surname: product.user.lastName,
      emailAddress: product.user.email,
      telephoneNumber: product.user.phone,
      ...createDeliveryAddressDto,
    });

const transglobal = await this.callTransglobalApi({
  packageInfo:{Weight:createDeliveryAddressDto.Weight,
  Width:createDeliveryAddressDto.Width,
  Height:createDeliveryAddressDto.Height,
  Length:createDeliveryAddressDto.Length
},
deliveryInfo,
collectionInfo:collection
})
    const BuyerWallet = await this.walletRepository.findOne({
      where: { user_id: user.id },
    });

    if (!BuyerWallet) {
      throw new BadRequestException("Buyer wallet not found");
    }

    const productSellingPrice = Number(product.selling_price);
    if (isNaN(productSellingPrice)) {
      throw new BadRequestException('Invalid product price');
    }

    // Calculate the total amount, including the protection fee and delivery charge
    const protectionFee = existingOrder.protectionFee || 0;
    const totalAmount = productSellingPrice + protectionFee + deliveryCharge;

    // Check if the buyer has enough balance
    if (BuyerWallet.balance < totalAmount) {
      throw new BadRequestException("You don't have enough balance to purchase the product.");
    }

    // Deduct the total amount from the buyer's wallet
    BuyerWallet.balance -= totalAmount;
    BuyerWallet.version += 1;  // Optimistic Locking, increment version to prevent race conditions

    const randomString = Math.random().toString(36).substring(2, 10);
    const paymentId = `Trans-${product.id}-${randomString}`;

    // Transaction for payment
    const transaction = new Transections();
    transaction.amount = totalAmount;
    transaction.order = existingOrder;
    transaction.paymentId = paymentId;
    transaction.transection_type = TransectionType.PHURCASE;
    transaction.status = PaymentStatus.COMPLETED;
    transaction.product = product;
    transaction.paymentMethod = 'Internal';

    // Save changes within the transaction
    await queryRunner.manager.save(Transections, transaction);
    await queryRunner.manager.save(Wallets, BuyerWallet);

    // Mark product as 'SOLD'
    product.status = ProductStatus.SOLD;
    await queryRunner.manager.save(Product, product);

    // Update order status to 'Shipment Ready'
    existingOrder.status = OrderStatus.SHIPMENT_READY;
    existingOrder.deliveryCharge = null;
    existingOrder.paymentStatus = PaymentStatus.COMPLETED;
    await queryRunner.manager.save(Order, existingOrder);


    await queryRunner.manager.save(CollectionAddress, collection);

    // Handle notifications
    const notifications = [
      {
        user: existingOrder.buyer,
        userId: existingOrder.buyer_id,
        related: NotificationRelated.ORDER,
        action: NotificationAction.CREATED,
        type: NotificationType.SUCCESS,
        msg: `Good news! The seller has confirmed your order. The buyer protection fee, delivery charges, and the purchase amount have been successfully deducted from your wallet.`,
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

    await this.notificationService.bulkInsertNotifications(notifications);

    // Commit the transaction
    await queryRunner.commitTransaction();

    return {
      message: 'Order placed successfully and delivery address saved.',
      status: 'success',
      data: product,
      statusCode: 200,
    };
  } catch (error) {
    // Rollback the transaction if something goes wrong
    await queryRunner.rollbackTransaction();
    console.error('Error during order creation:', error);
    throw new BadRequestException('Error creating delivery address');
  } finally {
    // Release the query runner
    await queryRunner.release();
  }
}
 async callTransglobalApi({packageInfo,deliveryInfo,collectionInfo}:{deliveryInfo:DeliveryAddress,collectionInfo:CollectionAddress,packageInfo:{Weight:number,Length:number,Width:number,Height:number}}) {
    const transglobalApiUrl = 'https://staging2.services3.transglobalexpress.co.uk/Quote/V2/GetQuote'; // Replace with actual URL

    // Fetch credentials and other sensitive data from environment variables
    const apiKey = process.env.TRANSGLOBAL_API_KEY; 
    const password = process.env.TRANSGLOBAL_API_PASSWORD;

    if (!apiKey || !password) {
      throw new Error('Transglobal API credentials are missing');
    }

    const requestData = {
      Credentials: {
        APIKey: apiKey,
        Password: password,
      },
      Shipment: {
        Consignment: {
          ItemType: 'Parcel',
          ConsignmentSummary: 'Pet Products',
          Packages: [
          packageInfo
          ],
        },
        CollectionAddress: {
          Forename: collectionInfo.forename,
          Surname: collectionInfo.surname,
          EmailAddress:collectionInfo.emailAddress,
          CompanyName: collectionInfo.companyName,
          AddressLineOne: collectionInfo.addressLineOne,
          City: collectionInfo.city,
          Postcode: collectionInfo.postcode,
          TelephoneNumber: collectionInfo.telephoneNumber,
          Email: collectionInfo.emailAddress,
          Country: {
            CountryID: collectionInfo.country_id,
            CountryCode: collectionInfo.country_code,
          },
        },
        DeliveryAddress: {
          Forename: deliveryInfo.forename,
          Surname: deliveryInfo.surname,
          EmailAddress:deliveryInfo.emailAddress,
          CompanyName: deliveryInfo.companyName,
          AddressLineOne: deliveryInfo.addressLineOne,
          City: deliveryInfo.city,
          Postcode: deliveryInfo.postcode,
          TelephoneNumber: deliveryInfo.telephoneNumber,
          Email: deliveryInfo.emailAddress,
          Country: {
            CountryID: deliveryInfo.country_id,
            CountryCode: deliveryInfo.country_code,
          },
        },
      },
    };

    try {
      const response = await lastValueFrom(
        this.httpService.post(transglobalApiUrl, requestData)
      );
      if (response.data && response.data.success) {
        return response.data;  // Assuming the API returns a `data` field containing the result
      } else {
        throw new BadRequestException(`Transglobal API error: ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error calling Transglobal API:', error.message);
      throw new Error('Failed to communicate with Transglobal API');
    }
  }
  // Create a new shipment with transaction handling
  async create(createShipmentDto:CreateShipmentDto): Promise<Shipment> {
    // Start a new transaction
    const order = await this.orderService.findOrder({id:createShipmentDto.order_id});
    // console.log(order)
    const queryRunner = this.shipmentRepository.manager.connection.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      // 1. Create the Shipment entity
      const shipment = new Shipment();
      shipment.Status = createShipmentDto.Status;
      shipment.orderReference = createShipmentDto.orderReference;
      shipment.trackingURL = createShipmentDto.trackingURL;
      shipment.order = order; // Assuming order is already fetched

      // Save the shipment
      const savedShipment = await queryRunner.manager.save(Shipment, shipment);
      // 2. Create related entities (OrderInvoice, Label, Document) inside the transaction
      // Order Invoice
      if (createShipmentDto.orderInvoice) {
        const orderInvoice = new OrderInvoice();
        orderInvoice.TotalNet = createShipmentDto.orderInvoice.TotalNet;
        orderInvoice.Tax = createShipmentDto.orderInvoice.Tax;
        orderInvoice.TotalGross = createShipmentDto.orderInvoice.TotalGross;
        orderInvoice.shipment = savedShipment;

        await queryRunner.manager.save(OrderInvoice, orderInvoice);  // Save OrderInvoice
      }

      // Labels
      if (createShipmentDto.labels && createShipmentDto.labels.length > 0) {
        for (const labelData of createShipmentDto.labels) {
          const label = new Label();
          label.labelRole = labelData.LabelRole;
          label.labelFormat = labelData.LabelFormat;
          label.airWaybillReference = labelData.AirWaybillReference;
          label.downloadURL = labelData.DownloadURL;
          label.shipment = savedShipment;
          await queryRunner.manager.save(Label, label);  // Save Label
        }
      }

      // Documents
      if (createShipmentDto.documents && createShipmentDto.documents.length > 0) {
        for (const documentData of createShipmentDto.documents) {
          const document = new ShipmentDocument();
          document.documentType = documentData.DocumentType;
          document.format = documentData.Format;
          document.downloadURL = documentData.DownloadURL;
          document.shipment = savedShipment;

          await queryRunner.manager.save(ShipmentDocument, document);  // Save Document
        }
      }

      // Commit the transaction after all entities are saved
      await queryRunner.commitTransaction();

      // Return the saved shipment
    //  savedShipment;
    const shipments = await this.shipmentRepository.findOne({
      where: { id: savedShipment.id },
      relations: ['order', 'orderInvoice', 'labels', 'documents'],
    });
      if (!shipments) {
        throw new Error('Shipment not found after creation');
      }
    //   console.log(shipments)    
     return shipments;

    } catch (error) {
        console.log(error)
      // If any error occurs, rollback the transaction
      await queryRunner.rollbackTransaction();
      throw new Error('Error occurred while creating the shipment and its related entities.');
    } finally {
      // Release the query runner to free up resources
      await queryRunner.release();
    }
  }
}
