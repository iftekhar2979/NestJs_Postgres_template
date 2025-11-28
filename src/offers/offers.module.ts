import { Module } from "@nestjs/common";
import { OffersController } from "./offers.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Offer } from "./entities/offer.entity";
import { OfferService } from "./offers.service";
import { OrdersModule } from "src/orders/orders.module";
import { ProductsModule } from "src/products/products.module";
import { AuthModule } from "src/auth/auth.module";
import { UserModule } from "src/user/user.module";
import { ConversationsModule } from "src/conversations/conversations.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { MailModule } from "src/mail/mail.module";
import { BullModule } from "@nestjs/bull";
import { CurrencyConverterModule } from "src/currency-converter/currency-converter.module";
@Module({
  imports: [
    TypeOrmModule.forFeature([Offer]),
    MailModule,
    AuthModule,
    UserModule,
    OrdersModule,
    ProductsModule,
    ConversationsModule,
    NotificationsModule,
    BullModule.registerQueue({ name: "product" }, { name: "notifications" }),
    CurrencyConverterModule,
  ],
  controllers: [OffersController],
  providers: [OfferService],
})
export class OffersModule {}
