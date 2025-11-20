import { Module } from "@nestjs/common";
import { WithdrawsController } from "./withdraws.controller";

@Module({
  controllers: [WithdrawsController],
})
export class WithdrawsModule {}
