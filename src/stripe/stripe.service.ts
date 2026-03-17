import { InjectQueue } from "@nestjs/bull";
import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config"; // Correct import
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bull";
import { NotificationAction, NotificationRelated, NotificationType } from "src/notifications/entities/notifications.entity";
import { PaymentStatus } from "src/orders/enums/orderStatus";
import { Transections } from "src/transections/entity/transections.entity";
import { TransectionType } from "src/transections/enums/transectionTypes";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { Wallets } from "src/wallets/entity/wallets.entity";

import Stripe from "stripe";
import { DataSource, Repository } from "typeorm";

@Injectable()
export class StripeService {
  private stripe: Stripe;
  public baseUrl: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Wallets)
    private walletRepo: Repository<Wallets>,

    @InjectRepository(Transections)
    private txRepo: Repository<Transections>,
    private dataSource: DataSource,
    @InjectQueue("product") private readonly _queue: Queue,
    @InjectQueue("notifications") private readonly _notificationQueue: Queue,
  ) {
    this.stripe = new Stripe(this.configService.get<string>("STRIPE_SECRET_KEY"), {
      apiVersion: "2025-07-30.basil", // Specify Stripe API version you're using
    });
    this.baseUrl = this.configService.get<string>("BASE_URL");
  }

  // Method to create a new payment intent
  // Create PaymentIntent or Checkout session
  async createPaymentIntent(amount: number, user: User): Promise<string> {
    try {
      // Create Checkout session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ["card"], // Remove 'google_pay' as it is not a valid PaymentMethodType
        line_items: [
          {
            price_data: {
              currency: "GBP",
              product_data: {
                name: `Recharge ${amount}`,
                description: `Recharge the wallet for phurcase and product boosting`,
              },
              unit_amount: amount * 100,
            },
            quantity: 1,
          },
        ],
        metadata: {
          user_id: user.id,
          amount: amount,
          email: user.email,
          name: user.firstName,
        },
        mode: "payment",
        customer_email: user.email,
        success_url: `${this.baseUrl}/html-response/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.baseUrl}/html-response/cancel`,
      });

      // Return the session URL
      return session.url;
    } catch (error) {
      console.error("Error creating payment intent:", error.message);
      throw new BadGatewayException(`Failed to create payment : ${error.message}`);
    }
  }
  getStripe() {
    const Stripe = require("stripe");
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    return new Stripe(stripeKey, { apiVersion: "2025-11-17.clover" });
  }
  async findMetaData(payment: string): Promise<any> {
    const session = await this.stripe.checkout.sessions.retrieve(payment);
    console.log(session);
    if (!session.metadata) {
      console.error("Metadata not found in session.");
    }
    return session.metadata;
  }
  async getPaymentIntent(paymentIntend: string) {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntend);
    return paymentIntent;
  }
  async paymentIntentList() {
    const paymentIntent = await this.stripe.paymentIntents.list({ limit: 10 });
    return paymentIntent;
  }
  async processRecharge(userId: string, amount: number, paymentId: string) {
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id: userId } })
      // Check if this payment is already processed
      const existingTx = await manager.findOne(Transections, { where: { paymentId } });
      if (existingTx) return;

      // Get wallet
      const wallet = await manager.findOne(Wallets, { where: { user_id: userId }, lock: { mode: "pessimistic_write" } });
      if (!wallet) throw new Error("Wallet not found");

      // Update wallet
      const newBalance = Number(wallet.balance) + amount;
      await manager.update(Wallets, { id: wallet.id }, { balance: newBalance, version: wallet.version + 1 });
      await this._notificationQueue.add("notification_saver", {
        user: user,
        related: NotificationRelated.WALLET,
        msg: `You have recharged $${amount} GBP to your wallet!`,
        type: NotificationType.SUCCESS,
        targetId: wallet.id,
        notificationFor: UserRoles.USER,
        action: NotificationAction.CREATED,
        isImportant: true,
        title: `${amount} recharged successfully .`,
        body: `You have recharged $${amount} GBP to your wallet!`,
      });
      await this._notificationQueue.add("notification_saver", {
        user: user,
        related: NotificationRelated.WALLET,
        msg: `${user.firstName} ${user.lastName} has recharged $${amount} GBP though stripe!`,
        type: NotificationType.SUCCESS,
        targetId: wallet.id,
        notificationFor: UserRoles.ADMIN,
        action: NotificationAction.CREATED,
        isImportant: true,
      });
      // Create transection
      await manager.insert(Transections, {
        user,
        wallet_id: wallet.id,
        amount,
        transection_type: TransectionType.RECHARGE,
        paymentId,
        paymentMethod: "STRIPE",
        status: PaymentStatus.COMPLETED,
      });

    });
  }
}
