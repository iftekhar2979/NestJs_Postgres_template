import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrderItem } from "src/orders/entities/order-item.entity";
import { Order } from "src/orders/entities/order.entity";
import { Inventory } from "src/products/entities/inventory.entity";
import { Product } from "src/products/entities/products.entity";
import { ProductStats } from "src/products/stats/entities/productStats.entity";
import { ProductVariant } from "src/products/varients/entities/productVarient.entity";
import { RedisModule } from "src/redis/redis.module";
import { Transections } from "src/transections/entity/transections.entity";
import { UserModule } from "src/user/user.module";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { PurchaseController } from "./purchase.controller";
import { PurchaseService } from "./purchase.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductVariant,
      Inventory,
      Order,
      OrderItem,
      Wallets,
      Transections,
      ProductStats,
    ]),
    UserModule,
    BullModule.registerQueue(
      { name: "notifications" },
      { name: "product" },
      { name: "email" },
    ),
    RedisModule,
  ],
  controllers: [PurchaseController],
  providers: [PurchaseService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
