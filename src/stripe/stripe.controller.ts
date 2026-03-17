import { Body, Controller, Headers, HttpException, HttpStatus, Post, RawBodyRequest, Req, UseGuards } from "@nestjs/common";
import { StripeService } from "./stripe.service";
// import { ConfigService } from 'aws-sdk';
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { User } from "src/user/entities/user.entity";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { RechargeDto } from "./dto/recharge.dto";
// import { WalletsModule } from 'src/wallets/wallets.module';
import { WalletsService } from "src/wallets/wallets.service";

@Controller("stripe")
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService
    // private readonly walletService: WalletsService
  ) { }

  @Post('payment')
  @UseGuards(JwtAuthenticationGuard)
  async createPaymentIntent(
    @GetUser() user: User,
    @Body() body
  ) {
    const { amount } = body;
    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount,
      user,
    );
    return { paymentIntent };
  }

  // Webhook handler for Stripe events
  @Post("webhook")
  async handleStripeWebhook(
    @Headers("stripe-signature") signature: string,
    @Req() req: RawBodyRequest<Request>
  ) {
    const rawBody = req.rawBody; // comes from RawBodyMiddleware
    const endpointSecret = this.configService.get("STRIPE_WEBHOOK_SECRET");

    let event;
    try {
      const stripe = this.stripeService.getStripe();
      event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      throw new HttpException("Invalid webhook signature", HttpStatus.BAD_REQUEST);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
          const session = event.data.object;
          console.log(session);
          const userId = session.metadata.userId;
          const amount = Number(session.metadata.amount);
          const paymentId = session.payment_intent; // unique reference from Stripe

          // Call service to process recharge
          await this.stripeService.processRecharge(userId, amount, paymentId);
          break;

        case "checkout.session.async_payment_failed":
          console.warn("Payment failed:", event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (err) {
      console.error("Error processing webhook:", err);
      throw new HttpException("Failed to process webhook", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
