export interface AspectAccumulator {
  readonly sumW: number;
  readonly sumWx: number;
  readonly n: number;
}

export interface BayesianConfig {
  readonly priorK: number; // weight of the prior (e.g. 5)
  readonly priorMean: number; // prior mean on 1-5 scale (e.g. 3.0 or 3.2 from B2W calibration)
}

export const DEFAULT_BAYESIAN_CONFIG: BayesianConfig = {
  priorK: 5.0,
  priorMean: 3.0,
};

export function calculatePosterior(
  stats: AspectAccumulator,
  config: BayesianConfig = DEFAULT_BAYESIAN_CONFIG,
): number {
  const { sumW, sumWx } = stats;
  const { priorK, priorMean } = config;

  const totalWeight = sumW + priorK;
  if (totalWeight <= 0) return priorMean;

  const posterior = (sumWx + priorK * priorMean) / totalWeight;
  return Number(Math.max(1.0, Math.min(5.0, posterior)).toFixed(4));
}

/**
 * Normalized utility in [0.0, 1.0] from a 1-5 posterior mean.
 */
export function posteriorToUtility(posterior: number): number {
  const utility = (posterior - 1.0) / 4.0;
  return Number(Math.max(0.0, Math.min(1.0, utility)).toFixed(4));
}

/**
 * Confidence metric in [0.0, 1.0) based on sample size n:
 * 1 - 1 / sqrt(1 + n / 5)
 */
export function calculateConfidence(n: number): number {
  if (n <= 0) return 0;
  const conf = 1 - 1 / Math.sqrt(1 + n / 5);
  return Number(Math.max(0.0, Math.min(1.0, conf)).toFixed(4));
}

export function updateAccumulator(
  current: AspectAccumulator,
  score: number,
  weight = 1.0,
): AspectAccumulator {
  return {
    sumW: current.sumW + weight,
    sumWx: current.sumWx + weight * score,
    n: current.n + 1,
  };
}
