import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "src/auth/auth.module";
import { CurrencyConverterModule } from "src/currency-converter/currency-converter.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { Offer } from "src/offers/entities/offer.entity";
import { Product } from "src/products/entities/products.entity";
import { ProductVariant } from "src/products/varients/entities/productVarient.entity";
import { RedisModule } from "src/redis/redis.module";
import { Transections } from "src/transections/entity/transections.entity";
import { UserModule } from "src/user/user.module";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { Order } from "./entities/order.entity";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Offer, Product, Wallets, Transections, ProductVariant]),
    AuthModule,
    UserModule,
    BullModule.registerQueue({ name: "product" }, { name: "notifications" }),
    NotificationsModule,
    CurrencyConverterModule,
    RedisModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule { }
