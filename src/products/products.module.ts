import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "src/auth/auth.module";
import { ImageProcessor } from "src/bull/processors/ProductQueue";
import { CategoryModule } from "src/category/category.module";
import { CurrencyConverterModule } from "src/currency-converter/currency-converter.module";
import { CollectionAddress } from "src/delivery/entities/collection_Address.entity";
import { InventoryLog } from "src/inventory/entities/inventory-log.entity";
import { InventoryService } from "src/inventory/inventory.service";
import { MailModule } from "src/mail/mail.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { RedisModule } from "src/redis/redis.module";
import { Transections } from "src/transections/entity/transections.entity";
import { UserBehaviourModule } from "src/user-behaviour/user-behaviour.module";
import { UserModule } from "src/user/user.module";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { Inventory } from "../inventory/entities/inventory.entity";
import { CategoriesModule } from './categories/categories.module';
import { ColorsModule } from './colors/colors.module';
import { ProductImage } from "./entities/productImage.entity";
import { Product } from "./entities/products.entity";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { ReviewsModule } from './reviews/reviews.module';
import { ProductScoringService } from "./services/products_scoring.service";
import { ProductsSecondaryService } from "./services/products_secondary.service";
import { ScoreRecalculationService } from "./services/score_recalculate.service";
import { ScoringCronService } from "./services/scoring.cron.service";
import { SizesModule } from './sizes/sizes.module';
import { ProductStats } from "./stats/entities/productStats.entity";
import { StatsModule } from './stats/stats.module';
import { SubCategoriesModule } from './sub_categories/sub_categories.module';
import { ProductVariant } from "./varients/entities/productVarient.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, ProductStats , InventoryLog, Wallets, Transections, ProductVariant, CollectionAddress, Inventory]),
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
    ReviewsModule,
    StatsModule,
    RedisModule,
    MailModule,
    CategoryModule
  ],

  // BullModule.registerQueue({name:"behaviour"})],
  controllers: [ProductsController],
  providers: [ProductsService,ProductsSecondaryService,ScoreRecalculationService , ProductScoringService , ScoringCronService, ImageProcessor,InventoryService],
  exports: [ProductsService],
})
export class ProductsModule {}
