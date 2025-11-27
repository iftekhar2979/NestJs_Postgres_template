import {
  NotificationAction,
  NotificationRelated,
  NotificationType,
} from "src/notifications/entities/notifications.entity";
import { Order } from "src/orders/entities/order.entity";
import { Product } from "src/products/entities/products.entity";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";

interface NotificationInput {
  user: User;
  product: Product;
  order: Order;
  isImportant?: boolean;
}

/**
 * Generate notifications for a new order.
 * Pure function: returns a notifications array without side effects.
 */

interface NotificationInput {
  user: User;
  product: Product;
  order: Order;
  isImportant?: boolean;
}

export function createOrderNotifications({ user, product, order, isImportant = true }: NotificationInput) {
  return [
    {
      user: order.buyer,
      userId: user.id,
      related: NotificationRelated.ORDER,
      action: NotificationAction.CREATED,
      type: NotificationType.SUCCESS,
      msg: `You purchased the ${product.product_name} successfully.`,
      target_id: order.product.id,
      notificationFor: UserRoles.USER,
      isImportant,
      body: `Please wait for the seller to ship your product.`,
      title: `You have purchased ${product.product_name} successfully!`,
    },
    {
      user: product.user,
      userId: product.user.id,
      related: NotificationRelated.ORDER,
      action: NotificationAction.CREATED,
      type: NotificationType.SUCCESS,
      msg: `You got sale on ${product.product_name}`,
      target_id: order.product.id,
      notificationFor: UserRoles.USER,
      isImportant,
      body: `Buyer ${user.firstName} ${user.lastName} purchased your product ${product.product_name}. Please proceed with the shipping.`,
      title: `Your product ${product.product_name} has been sold!`,
    },
    {
      user: product.user,
      userId: product.user.id,
      related: NotificationRelated.ORDER,
      action: NotificationAction.CREATED,
      type: NotificationType.SUCCESS,
      msg: `${product.product_name} is going to be sold.`,
      target_id: order.product.id,
      notificationFor: UserRoles.ADMIN,
      isImportant,
    },
  ];
}

interface DirectPurchaseNotificationInput {
  user: User; // buyer
  product: Product; // product being purchased
  isImportant?: boolean;
}

/**
 * Generate notifications for a direct purchase.
 * Pure function: returns an array of notifications.
 */
export function createDirectPurchaseNotifications({
  user,
  product,
  isImportant = true,
}: DirectPurchaseNotificationInput) {
  return [
    {
      user,
      userId: user.id,
      related: NotificationRelated.ORDER,
      action: NotificationAction.CREATED,
      type: NotificationType.SUCCESS,
      msg: `Your Order is in progress. After payment confirmation, the product will be purchased.`,
      target_id: product.id,
      notificationFor: UserRoles.USER,
      isImportant,
      body: ` Your direct purchase request for ${product.product_name} is being processed. We will notify you once the payment is confirmed.`,
      title: `Direct Purchase Request for ${product.product_name} is in Progress`,
    },
    {
      user: product.user,
      userId: product.user.id,
      related: NotificationRelated.ORDER,
      action: NotificationAction.CREATED,
      type: NotificationType.SUCCESS,
      msg: `You have a direct purchase for ${product.product_name}`,
      target_id: product.id,
      notificationFor: UserRoles.USER,
      isImportant,
      body: `A user has requested to directly purchase your product ${product.product_name}. Please await payment confirmation to proceed.`,
      title: `Direct Purchase Request for ${product.product_name} Received`,
    },
    {
      user: product.user,
      userId: product.user.id,
      related: NotificationRelated.ORDER,
      action: NotificationAction.CREATED,
      type: NotificationType.SUCCESS,
      msg: `${product.product_name} is going to be sold.`,
      target_id: product.id,
      notificationFor: UserRoles.ADMIN,
      isImportant,
    },
  ];
}
