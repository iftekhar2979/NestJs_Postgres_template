import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "src/auth/auth.module";
import { PushNotificationProccessor } from "src/bull/processors/pushNotificationQueue";
import { FirebaseModule } from "src/firebase/firebase.module";
import { MailModule } from "src/mail/mail.module";
import { UserModule } from "src/user/user.module";
import { Notifications } from "./entities/notifications.entity";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [TypeOrmModule.forFeature([Notifications]), AuthModule, UserModule, FirebaseModule, MailModule],
  providers: [NotificationsService, PushNotificationProccessor],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
