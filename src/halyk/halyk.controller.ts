import { Controller, Post, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { HalykService } from './halyk.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Controller('halyk')
export class HalykController {
  private readonly logger = new Logger(HalykController.name);

  constructor(
    private readonly halykService: HalykService,
    private readonly configService: ConfigService,
  ) {}

  @Post('initiate')
  async initiatePayment(@Body() body: { amount: number; currency?: string; description?: string }) {
    const { amount, currency = 'KZT', description = 'Order Payment' } = body;
    const invoiceId = uuidv4(); // Generate unique invoice ID
    const accessToken = await this.halykService.getAccessToken(invoiceId, amount, currency);

    return {
      success: true,
      paymentData: {
        invoiceId,
        amount,
        currency,
        description,
        terminal: this.configService.get<string>('HALYK_TERMINAL_ID'),
        auth: `Bearer ${accessToken}`,
        backLink: this.configService.get<string>('HALYK_BACK_LINK'),
        failureBackLink: this.configService.get<string>('HALYK_FAILURE_BACK_LINK'),
        postLink: this.configService.get<string>('HALYK_POSTBACK_URL'),
        failurePostLink: this.configService.get<string>('HALYK_FAILURE_POSTBACK_URL'),
      },
    };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    this.logger.log(`Received Halyk Postback: ${JSON.stringify(body)}`);
    // TODO: Verify the postback (e.g., check secret_hash if used)
    // Update the transaction in the database based on body.invoiceId and body.code
    return { status: 'received' };
  }
}
