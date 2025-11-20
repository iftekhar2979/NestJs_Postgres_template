import { Module } from "@nestjs/common";
import { ProductBoostController } from "./product-boost.controller";
import { ProductBoostService } from "./product-boost.service";

@Module({
  controllers: [ProductBoostController],
  providers: [ProductBoostService],
})
export class ProductBoostModule {}
