import { Module } from "@nestjs/common";
import { WalletsController } from "./wallets.controller";
import { WalletsService } from "./wallets.service";
import { Wallets } from "./entity/wallets.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserModule } from "src/user/user.module";
import { Product } from "src/products/entities/products.entity";
import { ProductBoosts } from "src/product-boost/entities/product-boost.entity";
import { Transections } from "src/transections/entity/transections.entity";
import { ProductsModule } from "src/products/products.module";
import { Order } from "src/orders/entities/order.entity";
import { BullModule } from "@nestjs/bull";
import { StripeModule } from "src/stripe/stripe.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallets, ProductBoosts, Transections, Order, Product]),
    BullModule.registerQueue({ name: "wallet_queue" }),
    UserModule,
    ProductsModule,
    StripeModule,
  ],
  controllers: [WalletsController],
  providers: [WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
