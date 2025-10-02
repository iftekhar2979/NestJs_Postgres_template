import { Module } from "@nestjs/common";
import { BullService } from "./bull.service";
import { BullController } from "./bull.controller";
import { UserBehaviourModule } from "src/user-behaviour/user-behaviour.module";
import { MailModule } from "src/mail/mail.module";

@Module({
  imports: [UserBehaviourModule, MailModule],
  providers: [BullService],
  controllers: [BullController],
})
export class BullModule {}
