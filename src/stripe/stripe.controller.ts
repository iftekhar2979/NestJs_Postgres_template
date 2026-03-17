import { Body, Controller, Headers, HttpException, HttpStatus, Post, RawBodyRequest, Req, UseGuards } from "@nestjs/common";
import { StripeService } from "./stripe.service";
// import { ConfigService } from 'aws-sdk';
import { ConfigService } from "@nestjs/config";
import { GetUser } from "src/auth/decorators/get-user.decorator";
import { JwtAuthenticationGuard } from "src/auth/guards/session-auth.guard";
import { User } from "src/user/entities/user.entity";
// import { WalletsModule } from 'src/wallets/wallets.module';

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
    if (!signature) {
      throw new HttpException("Missing stripe-signature header", HttpStatus.BAD_REQUEST);
    }

    const rawBody = req.rawBody;
    try {
      await this.stripeService.handleWebhook(rawBody, signature);
      return { received: true };
    } catch (err) {
      console.error("Webhook processing failed:", err.message);
      throw new HttpException(err.message || "Webhook Error", HttpStatus.BAD_REQUEST);
    }
  }
}
