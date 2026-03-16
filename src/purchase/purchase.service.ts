import { InjectQueue } from "@nestjs/bull";
import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from "@nestjs/common";
import { Queue } from "bull";
import { OrderItem } from "src/orders/entities/order-item.entity";
import { Order } from "src/orders/entities/order.entity";
import { OrderStatus, PaymentStatus } from "src/orders/enums/orderStatus";
import { Inventory } from "src/products/entities/inventory.entity";
import { Product } from "src/products/entities/products.entity";
import { ProductStatus } from "src/products/enums/status.enum";
import { ProductStats } from "src/products/stats/entities/productStats.entity";
import { ProductVariant } from "src/products/varients/entities/productVarient.entity";
import { RedisService } from "src/redis/redis.service";
import { FeeWithCommision } from "src/shared/utils/utils";
import { Transections } from "src/transections/entity/transections.entity";
import { TransectionType } from "src/transections/enums/transectionTypes";
import { User } from "src/user/entities/user.entity";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { DataSource } from "typeorm";
import { PaymentMethod, PurchaseDto } from "./dto/purchase.dto";

@Injectable()
export class PurchaseService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
    @InjectQueue("notifications") private readonly notificationQueue: Queue,
    @InjectQueue("product") private readonly productQueue: Queue,
    @InjectQueue("email") private readonly emailQueue: Queue,
  ) {}

  async executePurchase(dto: PurchaseDto, user: User) {
    const { productId, variantId, quantity, paymentMethod } = dto;

    // 1. Fetch Product (Using Cache First)
    const product = await this.getProductWithCache(productId);
    if (product.status !== ProductStatus.AVAILABLE && product.status !== ProductStatus.PENDING) {
       throw new BadRequestException("Product is not available for purchase");
    }
    if(product.user.id === user.id){
    throw new BadRequestException("You can not purchase your own product");
    }

    let variant: ProductVariant | null = null;
    if (variantId) {
      variant = await this.getVariantWithCache(variantId);
      if (variant.product_id !== productId) {
        throw new BadRequestException("Variant does not belong to this product");
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 2. Validate Stock (Critical - Pessimistic Lock)
      const inventory = await queryRunner.manager
        .createQueryBuilder(Inventory, "inventory")
        .setLock("pessimistic_write")
        .where("inventory.product_id = :productId", { productId })
        .andWhere(variantId ? "inventory.variant_id = :variantId" : "inventory.variant_id IS NULL", { variantId })
        .getOne();

      if (!inventory) {
        throw new NotFoundException("Inventory record not found");
      }

      const availableStock = inventory.stock - inventory.reserved_stock;
      if (availableStock < quantity) {
        throw new BadRequestException(`Insufficient stock. Available: ${availableStock}`);
      }

      // 3. Calculate Final Price
      // In this system, product.price is base. If variant has modifier, we'd add it.
      // Based on provided requirement: final_price = (base + modifier) * quantity
      const priceModifier = 0; // Variant doesn't have a price column in the provided snippet, adding placeholder
      const unitPrice = Number(product.price) + priceModifier;
      const subtotal = unitPrice * quantity;
      
      // Applying simplified tax/discount for this example
      const discount = 0;
      const tax = 0;
      const finalPrice = subtotal - discount + tax;
      const protectionFee = Number(FeeWithCommision(finalPrice, 10)) + 0.8;
      const totalToPay = finalPrice + protectionFee;

      // 4. Wallet Validation
      if (paymentMethod === PaymentMethod.WALLET) {
        const wallet = await queryRunner.manager
          .createQueryBuilder(Wallets, "wallet")
          .setLock("pessimistic_write")
          .where("wallet.user_id = :userId", { userId: user.id })
          .getOne();

        if (!wallet) {
          throw new BadRequestException("Wallet not found");
        }

        if (wallet.balance < totalToPay) {
          throw new BadRequestException("Insufficient wallet balance");
        }

        // Update wallet balance
        wallet.balance -= totalToPay;
        wallet.version += 1;
        await queryRunner.manager.save(Wallets, wallet);

        // Create wallet transaction record
        const transaction = queryRunner.manager.create(Transections, {
          user_id: user.id,
          wallet_id: wallet.id,
          amount: totalToPay,
          transection_type: TransectionType.PHURCASE,
          paymentId: `PURCH-${Date.now()}-${user.id}`,
          paymentMethod: "Wallet",
          status: PaymentStatus.COMPLETED,
          product_id: productId,
        });
        await queryRunner.manager.save(Transections, transaction);
      }

      // 5. Create Order
      const order = queryRunner.manager.create(Order, {
        buyer_id: user.id,
        seller_id: product.user_id,
        product: product,
        total: totalToPay,
        protectionFee: protectionFee,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.COMPLETED,
      });
      const savedOrder = await queryRunner.manager.save(Order, order);

      // 6. Create Order Item
      const orderItem = queryRunner.manager.create(OrderItem, {
        order_id: savedOrder.id,
        product_id: productId,
        variant_id: variantId,
        quantity,
        unit_price: unitPrice,
        total_price: finalPrice,
      });
      await queryRunner.manager.save(OrderItem, orderItem);

      // 7. Update Inventory
      inventory.stock -= quantity;
      await queryRunner.manager.save(Inventory, inventory);

      // 8. Update Product Statistics
      let stats = await queryRunner.manager.findOne(ProductStats, { where: { product_id: productId } });
      if (!stats) {
        stats = queryRunner.manager.create(ProductStats, { product_id: productId });
      }
      stats.total_sales = Number(stats.total_sales || 0) + quantity;
      stats.total_revenue = Number(stats.total_revenue || 0) + finalPrice;
      stats.last_purchased_at = new Date();
      await queryRunner.manager.save(ProductStats, stats);

      // Commit Transaction
      await queryRunner.commitTransaction();

      // 9. Post-commit side effects: Publish Events & Clear Cache
      await this.publishEvents(savedOrder, user, inventory, quantity);
      await this.invalidateCache(productId, variantId);

      return {
        message: "Purchase successful",
        orderId: savedOrder.id,
        data: savedOrder,
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Purchase Transaction Failed:", error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException("Purchase failed due to an internal error");
    } finally {
      await queryRunner.release();
    }
  }

  private async getProductWithCache(id: number): Promise<Product> {
    const cacheKey = `product:${id}`;
    const cached = await this.redisService.get<Product>(cacheKey);
    if (cached) return cached;

    const product = await this.dataSource.getRepository(Product).findOne({
      where: { id },
      relations: ["user"],
    });
    if (!product) throw new NotFoundException("Product not found");

    await this.redisService.set(cacheKey, product, 3600); // 1 hour TTL
    return product;
  }

  private async getVariantWithCache(id: number): Promise<ProductVariant> {
    const cacheKey = `variant:${id}`;
    const cached = await this.redisService.get<ProductVariant>(cacheKey);
    if (cached) return cached;

    const variant = await this.dataSource.getRepository(ProductVariant).findOne({
      where: { id },
    });
    if (!variant) throw new NotFoundException("Variant not found");

    await this.redisService.set(cacheKey, variant, 3600);
    return variant;
  }

  private async invalidateCache(productId: number, variantId: number | null) {
    await this.redisService.del(`product:${productId}`);
    if (variantId) {
      await this.redisService.del(`variant:${variantId}`);
    }
    // Invalidate inventory pattern
    await this.redisService.deleteByPattern(`inventory:${productId}:*`);
  }

  private async publishEvents(order: Order, buyer: User, inventory: Inventory, quantity: number) {
    // Order Created
    await this.notificationQueue.add("order_created_event", {
      orderId: order.id,
      buyerId: buyer.id,
      totalPrice: order.total,
    });

    // Inventory Updated
    await this.productQueue.add("inventory_updated_event", {
      productId: inventory.product_id,
      variantId: inventory.variant_id,
      remainingStock: inventory.stock,
    });

    // Notification
    await this.notificationQueue.add("notification_saver", {
      user: buyer,
      msg: `Your purchase of ${order.product.product_name} was successful!`,
      isImportant: true,
      action: "UPDATED", // Assuming Action type
      related: "ORDER",  // Assuming Related type
      notificationFor: "user", // Assuming target type
      targetId: order.id,
    });

    // Email
    await this.emailQueue.add("mails", {
      email: buyer.email,
      subject: "Order Confirmation",
      body: `Thank you for your purchase of ${order.product.product_name}. Order ID: ${order.id}`,
      user: buyer,
      product: order.product,
    });
  }
}
