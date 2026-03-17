import { Module } from "@nestjs/common";
import { StripeController } from "./stripe.controller";
import { StripeService } from "./stripe.service";
import { UserModule } from "src/user/user.module";
import { AuthModule } from "src/auth/auth.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { Transections } from "src/transections/entity/transections.entity";
import { BullModule } from "@nestjs/bull";

// @Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Wallets, Transections]),
    UserModule,
    AuthModule,
    BullModule.registerQueue({ name: "product" }, { name: "notifications" }),
    // WalletsModule
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule { }
