import { Module } from "@nestjs/common";
import { BullService } from "./bull.service";
import { BullController } from "./bull.controller";
import { UserBehaviourModule } from "src/user-behaviour/user-behaviour.module";
import { MailModule } from "src/mail/mail.module";
import { FirebaseModule } from "src/firebase/firebase.module";
import { NotificationsModule } from "src/notifications/notifications.module";

@Module({
  imports: [UserBehaviourModule, MailModule, FirebaseModule, NotificationsModule],
  providers: [BullService],
  controllers: [BullController],
})
export class BullModule {}
