import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Category } from "src/category/entity/category.entity";
import { ProductColor } from "src/products/colors/entities/colors.entity";
import { SubCategory } from "src/products/sub_categories/entities/sub_categories.entity";
import { Setting } from "src/settings/entity/settings.entity";
import { Size } from "src/sizes/entity/sizes.entity";
import { UserModule } from "src/user/user.module";
import { SeederService } from "./seeder.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Setting, Category, ProductColor, Category, SubCategory, Size]),
    UserModule,
  ],
  providers: [SeederService],
})
export class SeederModule {}
