import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ScoreRecalculationService } from "./score_recalculate.service";

@Injectable()
export class ScoringCronService {
  private readonly logger = new Logger(ScoringCronService.name);

  constructor(
    private scoreRecalcService: ScoreRecalculationService,
  ) {}

  /**
   * Recalculate all active products every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlyScoreRefresh(): Promise<void> {
    this.logger.log("Starting hourly score recalculation...");
    try {
      const result = await this.scoreRecalcService.recalculateBatch(200);
      this.logger.log(
        `Hourly recalculation complete: ${result.updated}/${result.total} updated`
      );
    } catch (error) {
      this.logger.error("Hourly recalculation failed", error);
    }
  }

  /**
   * Recalculate recently updated products every 15 minutes
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleFrequentScoreRefresh(): Promise<void> {
    try {
      const count = await this.scoreRecalcService.recalculateRecentlyUpdated();
      if (count > 0) {
        this.logger.log(`Recalculated ${count} recently updated products`);
      }
    } catch (error) {
      this.logger.error("Frequent recalculation failed", error);
    }
  }

  /**
   * Full recalculation daily at 3 AM (for accuracy)
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleDailyFullRefresh(): Promise<void> {
    this.logger.log("Starting daily full score recalculation...");
    try {
      const result = await this.scoreRecalcService.recalculateBatch(500);
      this.logger.log(
        `Daily recalculation complete: ${result.updated}/${result.total} updated`
      );
    } catch (error) {
      this.logger.error("Daily recalculation failed", error);
    }
  }
}