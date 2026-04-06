import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as qs from "qs";
import { lastValueFrom } from "rxjs";

@Injectable()
export class HalykService {
  private readonly logger = new Logger(HalykService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {}

  async getAccessToken(invoiceId: string, amount: number, currency = "KZT"): Promise<string> {
    const url = this.configService.get<string>("HALYK_TOKEN_URL");
    const clientId = this.configService.get<string>("HALYK_CLIENT_ID");
    const clientSecret = this.configService.get<string>("HALYK_CLIENT_SECRET");
    const terminal = this.configService.get<string>("HALYK_TERMINAL_ID");

    const data = qs.stringify({
      grant_type: "client_credentials",
      scope: "payment",
      client_id: clientId,
      client_secret: clientSecret,
      invoiceID: invoiceId,
      amount: amount,
      currency: currency,
      terminal: terminal,
      postLink: this.configService.get<string>("HALYK_POSTBACK_URL"),
      failurePostLink: this.configService.get<string>("HALYK_FAILURE_URL"),
    });

    try {
      const response = await lastValueFrom(
        this.httpService.post(url, data, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
      );

      return response.data.access_token;
    } catch (error) {
      this.logger.error(`Failed to fetch Halyk access token: ${error.message}`);
      throw error;
    }
  }
}
