import { Module } from "@nestjs/common";
import { TransglobalService } from "./transglobal.service";
import { Service } from "./entity/courier_details.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TransglobalController } from "./transglobal.controller";
import { OrdersModule } from "src/orders/orders.module";

@Module({
  imports: [TypeOrmModule.forFeature([Service]), OrdersModule],
  providers: [TransglobalService],
  controllers: [TransglobalController],
})
export class TransglobalModule {}
