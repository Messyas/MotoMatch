/**
 * Thompson Sampling and Beta Distribution for Collective Signals (PLANO_ATUALIZACAO §3.6).
 * Maintains a Beta(alpha, beta) posterior per (device, intentSignature).
 */

export function expectedBetaValue(alpha: number, beta: number): number {
  const sum = alpha + beta;
  if (sum <= 0) return 0.5;
  return Number((alpha / sum).toFixed(4));
}

/**
 * Samples a Gamma(shape, 1) variate using Marsaglia and Tsang's method (2000).
 */
function sampleGamma(shape: number, randomFn: () => number): number {
  if (shape < 1) {
    const u = randomFn();
    return sampleGamma(shape + 1, randomFn) * Math.pow(u, 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    // Generate standard normal variate via Box-Muller
    const u1 = randomFn();
    const u2 = randomFn();
    const z = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.cos(2.0 * Math.PI * u2);

    const v = 1 + c * z;
    if (v <= 0) continue;

    const v3 = v * v * v;
    const u = randomFn();

    if (u < 1 - 0.0331 * z * z * z * z) {
      return d * v3;
    }

    if (Math.log(u || 0.0001) < 0.5 * z * z + d * (1 - v3 + Math.log(v3))) {
      return d * v3;
    }
  }
}

/**
 * Samples from Beta(alpha, beta) using X / (X + Y) where X ~ Gamma(alpha), Y ~ Gamma(beta).
 */
export function sampleBeta(
  alpha: number,
  beta: number,
  randomFn: () => number = Math.random,
): number {
  const a = Math.max(0.1, alpha);
  const b = Math.max(0.1, beta);

  const x = sampleGamma(a, randomFn);
  const y = sampleGamma(b, randomFn);

  const total = x + y;
  if (total <= 0) return 0.5;
  const sample = x / total;
  return Number(Math.max(0.001, Math.min(0.999, sample)).toFixed(4));
}

export interface CollectiveBonusOptions {
  readonly alpha: number;
  readonly beta: number;
  readonly epsilon?: number; // default 0.05
  readonly useExpectedValue?: boolean;
}

export const DEFAULT_COLLECTIVE_EPSILON = 0.05;

/**
 * Computes collective learning bonus: B = ε · (sample − 0.5)
 * Bounded by [-ε, +ε].
 */
export function computeCollectiveBonus(options: CollectiveBonusOptions): number {
  const epsilon = options.epsilon ?? DEFAULT_COLLECTIVE_EPSILON;
  const val = options.useExpectedValue
    ? expectedBetaValue(options.alpha, options.beta)
    : sampleBeta(options.alpha, options.beta);

  const bonus = epsilon * (val - 0.5);
  return Number(Math.max(-epsilon, Math.min(epsilon, bonus)).toFixed(4));
}
