import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";
import { DAYS_IN_SECOND } from "src/products/entities/products.entity";
import { defaultCurrency } from "src/products/enums/status.enum";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Convert } = require("easy-currencies");

@Injectable()
export class ConverterService {
  constructor(@Inject(CACHE_MANAGER) private _cacheManager: Cache) {}

  // Step 1: Fetch or cache the latest rates
  async getRates(currency): Promise<Record<string, number>> {
    try {
      const cachedData = await this._cacheManager.get<Record<string, number>>(`currency_rates-${currency}`);
      if (cachedData) return cachedData;
      const convertRate = await Convert().from(currency).fetch();
      //   console.log(convertRate.rates);
      await this._cacheManager.set(`currency_rates-${currency}`, convertRate.rates, DAYS_IN_SECOND);
      return convertRate.rates;
    } catch (error) {
      console.error("Currency rate fetch failed:", error);
      throw new Error("Failed to get currency rates");
    }
  }

  // Step 2: Convert using cached data
  async convert(from: string, to: string, amount: number): Promise<number> {
    const rates = await this.getRates(from);
    console.log(rates[from], rates[to]);
    // Convert both currencies relative to GBP
    if (!rates[from] || !rates[to]) {
      throw new Error(`Unknown currency: ${!rates[from] ? from : to}`);
    }

    // Example: convert 100 USD → BDT
    const amountInGBP = amount / rates[from];
    const converted = amountInGBP * rates[to];

    return parseFloat(converted.toFixed(2));
  }

  async FeeWithCommision(amount: number, percent: number = 10) {
    return Number(((amount * percent) / 100).toFixed(2));
  }
}
