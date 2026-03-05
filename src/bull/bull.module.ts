import { Module } from "@nestjs/common";
import { CategoryModule } from "src/category/category.module";
import { FirebaseModule } from "src/firebase/firebase.module";
import { MailModule } from "src/mail/mail.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { StatsModule } from "src/products/stats/stats.module";
import { UserBehaviourModule } from "src/user-behaviour/user-behaviour.module";
import { BullController } from "./bull.controller";
import { BullService } from "./bull.service";

@Module({
  imports: [UserBehaviourModule, MailModule,StatsModule, FirebaseModule, NotificationsModule, CategoryModule],
  providers: [BullService],
  controllers: [BullController],
})
export class BullModule {}
