import { Injectable, Logger } from "@nestjs/common";
import { DEFAULT_SCORING_CONFIG, ScoringWeights } from "src/configs/scoring.config";
import { Product } from "../entities/products.entity";
import { ProductStats } from "../stats/entities/productStats.entity";

@Injectable()
export class ProductScoringService {
  private readonly logger = new Logger(ProductScoringService.name);
  private config: ScoringWeights = DEFAULT_SCORING_CONFIG;

  /**
   * Update scoring configuration (for A/B testing or admin adjustments)
   */
  updateConfig(newConfig: Partial<ScoringWeights>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.log('Scoring configuration updated', this.config);
  }

  /**
   * Main scoring calculation
   */
  calculateScore(product: Product, stats?: ProductStats | null): number {
    try {
      // If no stats exist, return minimal base score
      if (!stats) {
        return this.calculateBaseScore(product);
      }

      const { normalization, minReviewsForRatingWeight } = this.config;

      // ─── 1. Rating Score (Bayesian Average) ──────────────────
      let ratingScore = 0;
      if (stats.total_reviews >= minReviewsForRatingWeight && stats.average_rating > 0) {
        const globalAvgRating = 3.0; // Assumed global average
        const bayesianRating =
          (minReviewsForRatingWeight * globalAvgRating +
            stats.average_rating * stats.total_reviews) /
          (minReviewsForRatingWeight + stats.total_reviews);
        ratingScore = bayesianRating / normalization.maxRating;
      } else if (stats.average_rating > 0) {
        // New product with few reviews - reduce weight
        ratingScore = (stats.average_rating / normalization.maxRating) * 0.5;
      }

      // ─── 2. Popularity Score (Log-Scaled Views) ─────────────
      const viewsScore =
        Math.log10(1 + stats.total_views) /
        Math.log10(1 + normalization.maxViews);

      // ─── 3. Sales Score (Normalized) ────────────────────────
      const salesScore = Math.min(
        stats.total_sold / normalization.maxSold,
        1
      );

      // ─── 4. Recency Score (Exponential Decay) ───────────────
      const daysSinceCreated =
        (Date.now() - new Date(product.created_at).getTime()) /
        (1000 * 60 * 60 * 24);
      const recencyScore = Math.exp(
        -daysSinceCreated / normalization.recencyHalfLifeDays
      );

      // ─── 5. Engagement Score (Review Rate + Volume) ─────────
      const reviewRate =
        stats.total_views > 0
          ? stats.total_reviews / stats.total_views
          : 0;
      const engagementScore = Math.min(
        (reviewRate * 100 + stats.total_reviews / normalization.maxReviews) / 2,
        1
      );

      // ─── Combine Weighted Scores ────────────────────────────
      let baseScore =
        ratingScore * this.config.rating +
        viewsScore * this.config.popularity +
        salesScore * this.config.sales +
        recencyScore * this.config.recency +
        engagementScore * this.config.engagement;

      // ─── Apply Boost Multiplier ─────────────────────────────
      if (product.isBoostActive()) {
        const boostDaysRemaining =
          (new Date(product.boost_end_time).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24);
        const boostFactor =
          1 +
          (this.config.boostMultiplier - 1) *
            (boostDaysRemaining / this.config.maxBoostDays);
        baseScore *= Math.max(1, Math.min(boostFactor, this.config.boostMultiplier));
      }

      // ─── Availability Factor ────────────────────────────────
      const totalStock = product.getTotalStock();
      const availabilityFactor = totalStock > 0 ? 1 : 0.3;

      // ─── Final Score ────────────────────────────────────────
      const finalScore = baseScore * availabilityFactor;

      return parseFloat(Math.max(0, Math.min(finalScore, 10)).toFixed(4));
    } catch (error) {
      this.logger.error(`Score calculation failed for product ${product.id}`, error);
      return 0;
    }
  }

  /**
   * Fallback score for products without stats
   */
  private calculateBaseScore(product: Product): number {
    const daysSinceCreated =
      (Date.now() - new Date(product.created_at).getTime()) /
      (1000 * 60 * 60 * 24);
    const recencyScore = Math.exp(
      -daysSinceCreated / this.config.normalization.recencyHalfLifeDays
    );

    let score = 0.05 + recencyScore * 0.15;

    if (product.isBoostActive()) {
      score *= this.config.boostMultiplier;
    }

    const availabilityFactor = product.isInStock ? 1 : 0.3;
    return parseFloat((score * availabilityFactor).toFixed(4));
  }

  /**
   * Check if score needs recalculation (optimization)
   */
  needsRecalculation(
    product: Product,
    stats: ProductStats | null,
    lastCalculatedAt?: Date
  ): boolean {
    if (!lastCalculatedAt) return true;

    const statsUpdated = stats?.updated_at
      ? stats.updated_at > lastCalculatedAt
      : false;
    const productUpdated = product.updated_at > lastCalculatedAt;
    const boostChanged =
      product.is_boosted &&
      product.boost_end_time &&
      new Date(product.boost_end_time) > new Date();

    return statsUpdated || productUpdated || boostChanged;
  }
}