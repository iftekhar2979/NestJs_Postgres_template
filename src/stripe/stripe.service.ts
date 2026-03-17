import { InjectQueue } from "@nestjs/bull";
import { BadGatewayException, Injectable, LoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config"; // Correct import
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bull";
import { NotificationType } from "src/notifications/entities/notifications.entity";
import { Order } from "src/orders/entities/order.entity";
import { PaymentStatus } from "src/orders/enums/orderStatus";
import { Transections } from "src/transections/entity/transections.entity";
import { TransectionType } from "src/transections/enums/transectionTypes";
import { User } from "src/user/entities/user.entity";
import { UserRoles } from "src/user/enums/role.enum";
import { Wallets } from "src/wallets/entity/wallets.entity";
import { StripeEvent } from "./entities/stripe-event.entity";
import { StripePayment } from "./entities/stripe-payment.entity";

import { InjectLogger } from "src/shared/decorators/logger.decorator";
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

    @InjectRepository(Order)
    private orderRepo: Repository<Order>,

    @InjectRepository(StripeEvent)
    private eventRepo: Repository<StripeEvent>,

    @InjectRepository(StripePayment)
    private paymentRepo: Repository<StripePayment>,

    private dataSource: DataSource,
    @InjectQueue("product") private readonly _queue: Queue,
    @InjectQueue("notifications") private readonly _notificationQueue: Queue,
    @InjectQueue("email") private readonly _emailQueue: Queue,
    @InjectLogger() private readonly logger: LoggerService,
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
    return new Stripe(stripeKey, { apiVersion:process.env.STRIPE_API_VERSION });
  }
  async findMetaData(payment: string): Promise<any> {
    const session = await this.stripe.checkout.sessions.retrieve(payment);
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
  async handleWebhook(rawBody: Buffer, signature: string) {
    const endpointSecret = this.configService.get("STRIPE_WEBHOOK_SECRET");
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      throw new Error("Invalid signature");
    }

    // Idempotency Check
    const existingEvent = await this.eventRepo.findOne({ where: { event_id: event.id } });
    if (existingEvent && existingEvent.processed) {
      console.log(`Event ${event.id} already processed. Skipping.`);
      return;
    }

    // Track event
    if (!existingEvent) {
      await this.eventRepo.save({ event_id: event.id, type: event.type, processed: false });
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      switch (event.type) {
        case "charge.succeeded":
        case "charge.updated":
          await this.processChargeSucceeded(event.data.object as Stripe.Charge, queryRunner.manager);
          break;

        case "charge.failed":
          await this.processChargeFailed(event.data.object as Stripe.Charge, queryRunner.manager);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // Mark event as processed
      await queryRunner.manager.update(StripeEvent, { event_id: event.id }, { processed: true });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`Error processing webhook ${event.id}:`, error);
      this.logger.error(`Error processing webhook ${event.id}:`, error);
      
      // We return 200 to Stripe but log error internally
    } finally {
      await queryRunner.release();
    }
  }

  private async processChargeSucceeded(charge: Stripe.Charge, manager: any) {
    const { userId ,walletTopUp , orderId} = charge.metadata;
    console.log("charge", charge.metadata);
    if (!userId) return;
    // 1. Update or Create StripePayment record
    let payment = await manager.findOne(StripePayment, { where: { charge_id: charge.id } });
    if (!payment) {
      payment = manager.create(StripePayment, {
        charge_id: charge.id,
        user_id: userId,
        amount: charge.amount / 100,
        currency: charge.currency,
        status: charge.status,
        metadata: charge.metadata,
        raw_response: charge,
      });
    } else {
      payment.status = charge.status;
      payment.raw_response = charge;
    }
    await manager.save(StripePayment, payment);

    if (charge.status !== "succeeded") return;

    // 2. Handle Wallet Top-up
    if (walletTopUp === "true") {
      const amount = charge.amount / 100;
      const wallet = await manager.findOne(Wallets, {
        where: { user_id: userId },
        lock: { mode: "pessimistic_write" },
      });

      if (wallet) {
        wallet.balance = Number(wallet.balance) + amount;
        wallet.version += 1;
        await manager.save(Wallets, wallet);

        // Transaction Record
        await manager.insert(Transections, {
          user_id: userId,
          wallet_id: wallet.id,
          amount,
          transection_type: TransectionType.RECHARGE,
          paymentId: charge.id,
          paymentMethod: "STRIPE",
          status: PaymentStatus.COMPLETED,
        });

        // Async Events
        await this.triggerPostPaymentEvents(userId, `Wallet recharged with £${amount}`, "WALLET", wallet.id);
      }
    }

    // 3. Handle Order Payment
    if (orderId) {
      const order = await manager.findOne(Order, { where: { id: Number(orderId) } });
      if (order) {
        order.paymentStatus = PaymentStatus.COMPLETED;
        await manager.save(Order, order);

        // Async Events
        await this.triggerPostPaymentEvents(userId, `Payment for order #${orderId} successful`, "ORDER", order.id);
      }
    }
  }

  private async processChargeFailed(charge: Stripe.Charge, manager: any) {
    const { userId, orderId } = charge.metadata;

    await manager.save(StripePayment, {
      charge_id: charge.id,
      user_id: userId,
      status: "failed",
      failure_reason: charge.failure_message,
      metadata: charge.metadata,
      raw_response: charge,
      amount: charge.amount / 100,
      currency: charge.currency,
    });

    if (orderId) {
      await manager.update(Order, { id: Number(orderId) }, { paymentStatus: PaymentStatus.FAILED });
    }

    if (userId) {
      await this.triggerPostPaymentEvents(userId, `Payment failed: ${charge.failure_message}`, "PAYMENT_FAILED", charge.id);
    }
  }

  private async triggerPostPaymentEvents(userId: string, message: string, related: string, targetId: any) {
    const user = await this.dataSource.getRepository(User).findOne({ where: { id: userId } });
    if (!user) return;

    await this._notificationQueue.add("notification_saver", {
      user,
      msg: message,
      type: NotificationType.INFO,
      related,
      targetId: String(targetId),
      notificationFor: UserRoles.USER,
      isImportant: true,
    });

    await this._emailQueue.add("mails", {
      email: user.email,
      subject: "Stripe Payment Update",
      body: message,
      user,
    });
  }
}
