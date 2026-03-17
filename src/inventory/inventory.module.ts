import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RedisModule } from "src/redis/redis.module";
import { UserModule } from "src/user/user.module";
import { InventoryLog } from "./entities/inventory-log.entity";
import { Inventory } from "./entities/inventory.entity";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, InventoryLog]),
    BullModule.registerQueue({ name: "product" }),
    RedisModule,
    UserModule
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
