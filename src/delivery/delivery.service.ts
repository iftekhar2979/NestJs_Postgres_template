import { UserService } from './../user/user.service';
// import { NotificationService } from 'src/notification/notification.service';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryAddress } from './entities/delivery_information.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateDeliveryAddressDto,  } from './dto/createDelivery.dto';
import { Product } from 'src/products/entities/products.entity';
import { Wallets } from 'src/wallets/entity/wallets.entity';
import { ProductStatus } from 'src/products/enums/status.enum';
import { User } from 'src/user/entities/user.entity';
import { Order } from 'src/orders/entities/order.entity';
import { OrderStatus } from 'src/orders/enums/orderStatus';
import { NotificationAction, NotificationRelated, Notifications, NotificationType } from 'src/notifications/entities/notifications.entity';
import { NotificationsService } from 'src/notifications/notifications.service';
import { UserRoles } from 'src/user/enums/role.enum';
import { Delivery } from './entities/delivery.entity';

@Injectable()
export class DeliveryService {
      constructor(
    @InjectRepository(DeliveryAddress)
    private readonly deliveryAddressRepository: Repository<DeliveryAddress>,
    private readonly dataSource: DataSource, 
            @InjectRepository(Product) private productRepository: Repository<Product>,
            @InjectRepository(Wallets) private walletRepository: Repository<Wallets>,
            @InjectRepository(Order) private orderRepository:Repository<Order>,
            @InjectRepository(Notifications) private notificationRepository:Repository<Notifications>,
            private readonly userService:UserService,
            private readonly notificationService:NotificationsService
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
     const product = await this.productRepository.findOne({
      where: { id: product_id },
      relations: ['user','offer'],
    });
const userInfo = await this.userService.getUserById(user.id)
    // Check if product exists and the current user can purchase it
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    // Check product ownership and status
    if (product.user.id === user.id) {
      throw new ForbiddenException("You can't purchase your own product!");
    }

    if (product.status === ProductStatus.SOLD) {
      throw new BadRequestException('Product already sold');
    }

    if (product.status !== ProductStatus.AVAILABLE) {
      throw new ForbiddenException('Product is no longer available for purchase.');
    }
        const wallets = await this.walletRepository.findOne({
      where: { user_id: user.id },
    });

    if (!wallets) {
      throw new BadRequestException("User wallet not found");
    }

    const productSellingPrice = Number(product.selling_price);
    if (isNaN(productSellingPrice)) {
      throw new BadRequestException('Invalid product price');
    }
 // Calculate protection fee (5% of the product price)
    const protectionFee = (productSellingPrice * 5) / 100;
    const totalAmount = productSellingPrice + protectionFee;

    // Check if buyer has sufficient balance
    if (wallets.balance < totalAmount) {
      throw new BadRequestException("You don't have enough balance to purchase the product.");
    }

  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.startTransaction();

  try {
    // Retrieve product and user relationship in one call
 
    const existingOrder= await this.orderRepository.findOne({
      where:{
        product:{
          id:product_id
        }
      },
      relations:['accepted_offer']
    })


    // Retrieve the buyer's wallet and check balance

   
    product.status = ProductStatus.IN_PROGRESS;
    await queryRunner.manager.save(Product, product);

    if(!existingOrder){
        const order = new Order();
        order.product = product;
        order.buyer = user;
        order.seller = product.user;
        order.offer_id = null
        order.buyer_id = user.id;
        order.seller_id = product.user.id;
        order.status = OrderStatus.DELIVERY_FILLED;
        order.protectionFee = protectionFee;
        order.total = Number(product.selling_price)
        await queryRunner.manager.save(Order, order);
         const deliveryAddress = this.deliveryAddressRepository.create({order,forename:userInfo.firstName,surname:userInfo.lastName, emailAddress:userInfo.email, telephoneNumber:userInfo.phone,...createDeliveryAddressDto});
      await queryRunner.manager.save(deliveryAddress);
      
    }else{

      existingOrder.total = Number(product.selling_price)
      existingOrder.protectionFee = protectionFee
      existingOrder.status = OrderStatus.DELIVERY_FILLED
      await queryRunner.manager.save(Order,existingOrder)
      const deliveryAddress = this.deliveryAddressRepository.create({order:existingOrder,forename:userInfo.firstName,surname:userInfo.lastName, emailAddress:userInfo.email, telephoneNumber:userInfo.phone,...createDeliveryAddressDto});
      await queryRunner.manager.save(deliveryAddress);
    }

    // Handle notifications
    const notifications = [
      { 
        user: user,
        userId: user.id,
        related: NotificationRelated.ORDER,
        action: NotificationAction.CREATED,
        type: NotificationType.SUCCESS,
        msg: `Your Order is in progress. Purchase will be confirmed after seller confirmation.`,
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
        msg: `You have a direct purchase for ${product.product_name}`,
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
  // async updateDeliveryAddress(id: number, updateDeliveryAddressDto: UpdateDeliveryAddressDto): Promise<DeliveryAddress> {
  //   const deliveryAddress = await this.deliveryAddressRepository.findOne({where:{id}});
  //   if (!deliveryAddress) {
  //     throw new NotFoundException('Delivery address not found');
  //   }
  //   Object.assign(deliveryAddress, updateDeliveryAddressDto);

  //   try {
  //     return await this.deliveryAddressRepository.save(deliveryAddress);
  //   } catch (error) {
  //     throw new BadRequestException('Error updating delivery address');
  //   }
  // }

  // Get Delivery Address by ID
  async getDeliveryAddressById(id: number): Promise<DeliveryAddress> {
    const deliveryAddress = await this.deliveryAddressRepository.findOne({where:{id}});
    if (!deliveryAddress) {
      throw new NotFoundException('Delivery address not found');
    }
    return deliveryAddress;
  }

  // Delete Delivery Address
  async deleteDeliveryAddress(id: number): Promise<void> {
    const deliveryAddress = await this.deliveryAddressRepository.findOne({where:{id}});
    if (!deliveryAddress) {
      throw new NotFoundException('Delivery address not found');
    }

    try {
      await this.deliveryAddressRepository.remove(deliveryAddress);
    } catch (error) {
      throw new BadRequestException('Error deleting delivery address');
    }
  }
}
