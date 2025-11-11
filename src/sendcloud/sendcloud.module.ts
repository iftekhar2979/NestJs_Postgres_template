import { Module } from "@nestjs/common";
import { SendcloudService } from "./sendcloud.service";
import { SendcloudController } from "./sendcloud.controller";

@Module({
  providers: [SendcloudService],
  controllers: [SendcloudController],
  exports: [SendcloudService],
})
export class SendcloudModule {}
