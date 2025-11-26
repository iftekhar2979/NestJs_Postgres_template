import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable } from "@nestjs/common";

import { FirebaseService } from "src/firebase/firebase.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Logger } from "winston";
import { NotificationJobPayload, SinglePushNotificationPayload } from "./types";

@Processor("notifications") // Processor listening to 'ProductQueue'
@Injectable()
export class PushNotificationProccessor {
  constructor(
    private readonly _firebaseService: FirebaseService,
    private readonly _notificationsService: NotificationsService,
    @InjectLogger() private readonly _logger: Logger
  ) {}

  @Process("push_notifications")
  async pushNotifications(job: Job<SinglePushNotificationPayload>) {
    this._logger.log("Push Notification Logger", job.data);
    console.log("Push notification ", job.data);
    const { token, title, body } = job.data;
    // if(token){}
    await this._firebaseService.sendPushNotification(token, title, body);
  }

  @Process("notification_saver")
  async notificationSaver(job: Job<NotificationJobPayload>) {
    this._logger.log("Notification Saver Job started", job.data);
    // console.log("Email", job.data);
    const { user, action, msg, isImportant, related, targetId, title } = job.data;

    await this._notificationsService.createNotification({
      userId: user.id,
      action,
      msg,
      isImportant,
      related,
      targetId,
    });
    if (user.fcm) {
      await this._firebaseService.sendPushNotification(user.fcm, title, msg);
    }
  }
}
