import { Module } from "@nestjs/common";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "./entities/products.entity";
import { ProductImage } from "./entities/productImage.entity";
import { AuthModule } from "src/auth/auth.module";
import { UserModule } from "src/user/user.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { BullModule } from "@nestjs/bull";
import { UserBehaviourModule } from "src/user-behaviour/user-behaviour.module";
import { Transections } from "src/transections/entity/transections.entity";
import { CurrencyConverterModule } from "src/currency-converter/currency-converter.module";
import { CollectionAddress } from "src/delivery/entities/collection_Address.entity";
import { SubCategoriesModule } from './sub_categories/sub_categories.module';
import { CategoriesModule } from './categories/categories.module';
import { SizesModule } from './sizes/sizes.module';
import { ColorsModule } from './colors/colors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, Wallets, Transections, CollectionAddress]),
    AuthModule,
    UserModule,
    UserBehaviourModule,
    NotificationsModule,
    BullModule.registerQueue({ name: "product" }, { name: "notifications" }),
    CurrencyConverterModule,
    SubCategoriesModule,
    CategoriesModule,
    SizesModule,
    ColorsModule,
  ],

  // BullModule.registerQueue({name:"behaviour"})],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
