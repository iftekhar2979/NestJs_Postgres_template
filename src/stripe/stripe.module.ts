import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "src/auth/auth.module";
import { Order } from "src/orders/entities/order.entity";
import { Transections } from "src/transections/entity/transections.entity";
import { UserModule } from "src/user/user.module";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { StripeEvent } from "./entities/stripe-event.entity";
import { StripePayment } from "./entities/stripe-payment.entity";
import { StripeController } from "./stripe.controller";
import { StripeService } from "./stripe.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallets, Transections, Order, StripeEvent, StripePayment]),
    UserModule,
    AuthModule,
    BullModule.registerQueue({ name: "product" }, { name: "notifications" }, { name: "email" }),
    // WalletsModule
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule { }
