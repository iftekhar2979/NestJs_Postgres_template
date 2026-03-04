import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "src/auth/auth.module";
import { CurrencyConverterModule } from "src/currency-converter/currency-converter.module";
import { CollectionAddress } from "src/delivery/entities/collection_Address.entity";
import { NotificationsModule } from "src/notifications/notifications.module";
import { Transections } from "src/transections/entity/transections.entity";
import { UserBehaviourModule } from "src/user-behaviour/user-behaviour.module";
import { UserModule } from "src/user/user.module";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { CategoriesModule } from './categories/categories.module';
import { ColorsModule } from './colors/colors.module';
import { ProductImage } from "./entities/productImage.entity";
import { Product } from "./entities/products.entity";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { ProductsSecondaryService } from "./services/products_secondary.service";
import { SizesModule } from './sizes/sizes.module';
import { SubCategoriesModule } from './sub_categories/sub_categories.module';
import { ProductVariant } from "./varients/entities/productVarient.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, Wallets, Transections,ProductVariant, CollectionAddress]),
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
  providers: [ProductsService,ProductsSecondaryService],
  exports: [ProductsService],
})
export class ProductsModule {}
