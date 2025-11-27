import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, LoggerService } from "@nestjs/common";
import { Cache } from "cache-manager";
import { DAYS_IN_SECOND } from "src/products/entities/products.entity";
import { InjectLogger } from "src/shared/decorators/logger.decorator";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Convert } = require("easy-currencies");

@Injectable()
export class ConverterService {
  constructor(
    @Inject(CACHE_MANAGER) private _cacheManager: Cache,

    @InjectLogger() private readonly _logger: LoggerService
  ) {}

  // Step 1: Fetch or cache the latest rates
  // async getRates(currency): Promise<Record<string, number>> {
  //   try {
  //     const cachedData = await this._cacheManager.get<Record<string, number>>(`currency_rates-${currency}`);
  //     this._logger.log(`Currency cache check for ${currency}: ${cachedData ? "HIT" : "MISS"}`);
  //     if (cachedData) return cachedData;

  //     const convertRate = await Convert().from(currency).fetch();
  //     //   console.log(convertRate.rates);
  //     await this._cacheManager.set(`currency_rates-${currency}`, convertRate.rates, DAYS_IN_SECOND);
  //     return convertRate.rates;
  //   } catch (error) {
  //     console.error("Currency rate fetch failed:", error);
  //     throw new Error("Failed to get currency rates");
  //   }
  // }

  // Step 2: Convert using cached data
  // async convert(from: string, to: string, amount: number): Promise<number> {
  //   const rates = await this.getRates(from);
  //   // console.log(rates);
  //   // Convert both currencies relative to GBP
  //   if (!rates[from] || !rates[to]) {
  //     throw new Error(`Unknown currency: ${!rates[from] ? from : to}`);
  //   }

  //   // Example: convert 100 USD → BDT
  //   const amountInGBP = amount / rates[from];
  //   const converted = amountInGBP * rates[to];

  //   return parseFloat(converted.toFixed(2));
  // }

  // async convertMultiple(from: string, to: string, values: Record<string, number>) {
  //   const rates = await this.getRates(from);

  //   if (!rates[from] || !rates[to]) {
  //     throw new Error(`Unknown currency: ${!rates[from] ? from : to}`);
  //   }

  //   const results = {};
  //   const rate = rates[to] / rates[from]; // direct multiplier

  //   for (const key in values) {
  //     results[key] = parseFloat((values[key] * rate).toFixed(2));
  //   }

  //   return results;
  // }

  async getRates(): Promise<Record<string, number>> {
    const cacheKey = "currency_rates-GBP";

    const cached = await this._cacheManager.get<Record<string, number>>(cacheKey);
    this._logger.log(`Currency cache check for GBP: ${cached ? "HIT" : "MISS"}`);

    if (cached) return cached;

    // Always fetch using GBP as base
    const convertRate = await Convert().from("GBP").fetch();

    await this._cacheManager.set(cacheKey, convertRate.rates, DAYS_IN_SECOND);
    return convertRate.rates;
  }

  async convert(from: string, to: string, amount: number): Promise<number> {
    const rates = await this.getRates();

    if (!rates[from] || !rates[to]) {
      throw new Error(`Unknown currency: ${!rates[from] ? from : to}`);
    }

    const rate = rates[to] / rates[from];
    return +(amount * rate).toFixed(2);
  }

  async convertMultiple(from: string, to: string, values: Record<string, number>) {
    const rates = await this.getRates();

    if (!rates[from] || !rates[to]) {
      throw new Error(`Unknown currency: ${!rates[from] ? from : to}`);
    }

    const rate = rates[to] / rates[from];
    const result = {};

    for (const key in values) {
      result[key] = +(values[key] * rate).toFixed(2);
    }

    return result;
  }

  async FeeWithCommision(amount: number, percent: number = 10) {
    return Number(((amount * percent) / 100).toFixed(2));
  }
}
