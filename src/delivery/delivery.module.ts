import { Module } from "@nestjs/common";
import { DeliveryController } from "./delivery.controller";
import { DeliveryService } from "./delivery.service";
import { Shipment } from "./entities/shipments.entity";
import { ShipmentService } from "./shipment.service";
import { Delivery } from "./entities/delivery.entity";
import { ShipmentDocument } from "./entities/shipment_document.entity";
import { Label } from "./entities/shipment_lable.entity";
import { Order } from "src/orders/entities/order.entity";
import { OrderInvoice } from "./entities/shipment_order_invoice.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrdersModule } from "src/orders/orders.module";
import { DeliveryAddress } from "./entities/delivery_information.entity";
import { CollectionAddress } from "./entities/collection_Address.entity";
import { Product } from "src/products/entities/products.entity";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { Transections } from "src/transections/entity/transections.entity";
import { NotificationsModule } from "src/notifications/notifications.module";
import { Notifications } from "src/notifications/entities/notifications.entity";
import { AuthModule } from "src/auth/auth.module";
import { UserModule } from "src/user/user.module";
import { HttpModule } from "@nestjs/axios";
import { CurrencyConverterModule } from "src/currency-converter/currency-converter.module";
import { SendcloudModule } from "src/sendcloud/sendcloud.module";
import { Favorite } from "src/favourites/entities/favourite.entity";
import { FavouritesModule } from "src/favourites/favourites.module";
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Shipment,
      Delivery,
      ShipmentDocument,
      Label,
      OrderInvoice,
      DeliveryAddress,
      CollectionAddress,
      Product,
      Wallets,
      Transections,
      Order,
      Notifications,
      Favorite,
    ]),
    OrdersModule,
    HttpModule,
    NotificationsModule,
    AuthModule,
    UserModule,
    CurrencyConverterModule,
    SendcloudModule,
    FavouritesModule,
    // ShipmentService,
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
})
export class DeliveryModule {}
