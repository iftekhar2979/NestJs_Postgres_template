import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable } from "@nestjs/common";

import { FirebaseService } from "src/firebase/firebase.service";
import { NotificationsService } from "src/notifications/notifications.service";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
import { Logger } from "winston";
import { MultipleNotificationPayload, NotificationJobPayload, SinglePushNotificationPayload } from "./types";
import { MailService } from "src/mail/mail.service";

@Processor("notifications") // Processor listening to 'ProductQueue'
@Injectable()
export class PushNotificationProccessor {
  constructor(
    private readonly _firebaseService: FirebaseService,
    private readonly _notificationsService: NotificationsService,
    private readonly _mailService: MailService,
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
    console.log("Notification ", job.data);
    const { user, action, msg, isImportant, related, targetId, notificationFor } = job.data;

    await this._notificationsService.createNotification({
      userId: user.id,
      action,
      msg,
      notificationFor,
      isImportant,
      related,
      targetId,
    });

    if (job?.data?.title && job?.data?.body && user?.fcm) {
      console.log("Push Notification", user.fcm);
      await this._firebaseService.sendPushNotification(user.fcm, job.data.title, job.data.body);
    }
  }

  @Process("multiple_notification_saver")
  async multipleNotificationSaver(job: Job<MultipleNotificationPayload[]>) {
    this._logger.log("Notification Saver Job started", job.data);
    const data = job.data;

    data.forEach(async (notification) => {
      this._logger.log("Preparing to send notification", notification);
      console.log("notification runner", notification);
      if (notification?.title && notification?.body && notification?.user?.fcm) {
        this._logger.log(
          `${notification.body} to send notification to ${notification.user.firstName} ${notification.user.lastName}`,
          notification
        );
        this._firebaseService.sendPushNotification(
          notification.user.fcm,
          notification.title,
          notification.body
        );
      }
    });
    await this._notificationsService.bulkInsertNotifications(data);
  }

  @Process("mail_notification")
  async m(job: Job) {
    console.log("job data", job.data);
    this._logger.log("Notification Saver Job started", job.data);
    // console.log("Email", job.data);
    const { user, otp } = job.data;
    await this._mailService.sendForgotPasswordMail(user.email, `${otp}`);
  }

  // @Process("send_offer_with_mail")
  // async sendOffer(job: Job<>) {
  //   console.log("job data", job.data);
  //   this._logger.log("Notification Saver Job started", job.data);
  //   // console.log("Email", job.data);
  //   const { user, otp } = job.data;
  //   await this._mailService.sendForgotPasswordMail(user.email, `${otp}`);
  // }
}
