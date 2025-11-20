import { Module } from "@nestjs/common";
import { CategoryController } from "./category.controller";
import { CategoryService } from "./category.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Category } from "./entity/category.entity";
import { AuthModule } from "src/auth/auth.module";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Category])],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
