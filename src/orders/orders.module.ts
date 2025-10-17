import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "./entities/order.entity";
import { Offer } from "src/offers/entities/offer.entity";
import { AuthModule } from "src/auth/auth.module";
import { UserModule } from "src/user/user.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { Product } from "src/products/entities/products.entity";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { Transections } from "src/transections/entity/transections.entity";
import { CurrencyConverterModule } from "src/currency-converter/currency-converter.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Offer, Product, Wallets, Transections]),
    AuthModule,
    UserModule,
    NotificationsModule,
    CurrencyConverterModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
