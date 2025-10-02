import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  NotificationAction,
  NotificationRelated,
  Notifications,
  NotificationType,
} from "./entities/notifications.entity";
import { GetNotificationsResponse } from "./types/notification.response";
import { pagination } from "src/shared/utils/pagination";
import { Repository } from "typeorm";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notifications)
    private readonly _notificationsRepository: Repository<Notifications>
  ) {}

  async createNotification({
    userId,
    related,
    action,
    type = NotificationType.INFO,
    msg,
    targetId,
    notificationFor,
    isImportant = false,
  }: {
    userId: string;
    related: NotificationRelated;
    action: NotificationAction;
    type?: NotificationType;
    msg: string;
    targetId: number;
    notificationFor?: string;
    isImportant?: boolean;
  }): Promise<Notifications> {
    const notification = this._notificationsRepository.create({
      user: { id: userId } as User, // Ensure correct user object is passed
      related,
      action,
      type,
      msg,
      target_id: targetId,
      notificationFor,
      isImportant,
    });
    // Save the notification to the database
    return await this._notificationsRepository.save(notification);
  }
  async bulkInsertNotifications(
    notificationsData: {
      userId: string;
      related: NotificationRelated;
      action: NotificationAction;
      type?: NotificationType;
      msg: string;
      targetId?: number;
      notificationFor?: UserRoles;
      isImportant?: boolean;
    }[]
  ): Promise<Notifications[]> {
    // Create an array of notifications to insert
    const notifications = notificationsData.map((data) => {
      return this._notificationsRepository.create({
        user: { id: data.userId } as any,
        related: data.related,
        action: data.action,
        type: data.type || NotificationType.INFO,
        msg: data.msg,
        target_id: data.targetId,
        notificationFor: data.notificationFor,
        isImportant: data.isImportant || false,
      });
    });

    // Insert all notifications in bulk (single transaction)
    return await this._notificationsRepository.save(notifications);
  }
  async getNotifications({
    userId,
    page,
    limit,
    notificationFor,
  }: {
    userId: string | null;
    page: number;
    limit: number;
    isRead: boolean;
    related: string;
    isImportant: boolean;
    notificationFor: string;
  }): Promise<GetNotificationsResponse> {
    const skip = (page - 1) * limit;
    const take = limit;
    console.log(userId, notificationFor);
    // Start building the query
    const query = this._notificationsRepository.createQueryBuilder("notification");

    if (userId) {
      query.where("notification.user_id = :userId", { userId });
    }

    if (notificationFor) {
      query.andWhere("notification.notificationFor = :notificationFor", { notificationFor });
    }

    // Apply pagination
    query.skip(skip).take(take).orderBy("notification.created_at", "DESC");

    // Fetch the notifications and total count
    const [notifications, total] = await query.getManyAndCount();
    const data = notifications.map((notification) => ({
      id: notification.id,
      msg: notification.msg,
      related: notification.related,
      user: notification.user,
      action: notification.action,
      type: notification.type,
      target_id: notification.target_id,
      isRead: notification.isRead,
      isImportant: notification.isImportant,
      created_at: notification.created_at.toISOString(),
      updated_at: notification.updated_at.toISOString(),
    }));

    return {
      message: "Notifications retrieved successfully",
      statusCode: 200,
      data,
      pagination: pagination({ page, limit, total }),
    };
  }
}
