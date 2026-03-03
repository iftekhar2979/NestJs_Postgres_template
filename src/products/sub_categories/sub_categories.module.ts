import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Category } from "src/category/entity/category.entity";
import { SubCategory } from "./entities/sub_categories.entity";
import { SubCategoriesController } from "./sub_categories.controller";
import { SubCategoriesService } from "./sub_categories.service";

@Module({
  imports: [TypeOrmModule.forFeature([Category, SubCategory])],
  controllers: [SubCategoriesController],
  providers: [SubCategoriesService],
})
export class SubCategoriesModule {}
