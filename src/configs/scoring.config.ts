export interface ScoringWeights {
  // Core weights (should sum to 1.0 for baseline)
  rating: number;        // Quality signal (reviews)
  popularity: number;    // Views signal
  sales: number;         // Conversion signal
  recency: number;       // Freshness signal
  engagement: number;    // Interaction rate

  // Multipliers
  boostMultiplier: number;
  maxBoostDays: number;

  // Normalization baselines (adjust based on your data)
  normalization: {
    maxRating: number;
    maxViews: number;
    maxSold: number;
    maxReviews: number;
    recencyHalfLifeDays: number;
  };

  // Thresholds
  minReviewsForRatingWeight: number;
  minScoreThreshold: number; // Products below this won't appear in top lists
}

export const DEFAULT_SCORING_CONFIG: ScoringWeights = {
  rating: 0.30,
  popularity: 0.25,
  sales: 0.25,
  recency: 0.10,
  engagement: 0.10,

  boostMultiplier: 1.5,
  maxBoostDays: 3,

  normalization: {
    maxRating: 5.0,
    maxViews: 10000,
    maxSold: 500,
    maxReviews: 200,
    recencyHalfLifeDays: 30,
  },

  minReviewsForRatingWeight: 5,
  minScoreThreshold: 0.1,
};