/**
 * Offline Bayesian Priors Calibration Script (PLANO_ATUALIZACAO §4.1, §10 Fase 3)
 * Calibrates prior mean (mu0) and pseudo-observations shrinkage weight (k)
 * from empirical review ratings distribution.
 */

export interface ReviewRatingSample {
  readonly rating: number; // 1 to 5
  readonly aspectScores?: Partial<Record<string, number>>;
}

export interface CalibrationResult {
  readonly totalReviews: number;
  readonly meanRating: number;
  readonly variance: number;
  readonly recommendedK: number;
  readonly recommendedPriorMean: number;
}

export function calibratePriors(
  samples: readonly ReviewRatingSample[],
  options: { minK?: number; maxK?: number } = {},
): CalibrationResult {
  const minK = options.minK ?? 3.0;
  const maxK = options.maxK ?? 10.0;

  if (samples.length === 0) {
    return {
      totalReviews: 0,
      meanRating: 3.0,
      variance: 1.0,
      recommendedK: 5.0,
      recommendedPriorMean: 3.0,
    };
  }

  const ratings = samples.map((s) => s.rating);
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  const mean = sum / ratings.length;

  const squaredDiffs = ratings.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0);
  const variance = squaredDiffs / (ratings.length > 1 ? ratings.length - 1 : 1);

  // Empirical Bayes shrinkage: higher variance -> larger k needed to regularize small samples
  const rawK = Math.sqrt(variance) * 4.0;
  const recommendedK = Number(Math.max(minK, Math.min(maxK, rawK)).toFixed(2));
  const recommendedPriorMean = Number(mean.toFixed(2));

  return {
    totalReviews: samples.length,
    meanRating: Number(mean.toFixed(2)),
    variance: Number(variance.toFixed(4)),
    recommendedK,
    recommendedPriorMean,
  };
}

// If executed directly
if (import.meta.main) {
  // Representative B2W distribution sample for Brazilian electronics e-commerce
  const sampleDistribution: ReviewRatingSample[] = [
    ...Array(40).fill({ rating: 5 }),
    ...Array(25).fill({ rating: 4 }),
    ...Array(15).fill({ rating: 3 }),
    ...Array(10).fill({ rating: 2 }),
    ...Array(10).fill({ rating: 1 }),
  ];

  const result = calibratePriors(sampleDistribution);
  console.log("=== PhoneMatch Bayesian Priors Calibration ===");
  console.log(`Samples: ${result.totalReviews}`);
  console.log(`Mean Rating (mu0): ${result.recommendedPriorMean}`);
  console.log(`Variance: ${result.variance}`);
  console.log(`Recommended shrinkage weight (k): ${result.recommendedK}`);
}
