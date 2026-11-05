import { describe, expect, it } from "bun:test";
import {
  calculatePosterior,
  calculateConfidence,
  type AspectAccumulator,
  DEFAULT_BAYESIAN_CONFIG,
} from "./bayesian-accumulator";

describe("BayesianAccumulator", () => {
  it("with no reviews, posterior returns the prior mean with zero confidence", () => {
    const stats: AspectAccumulator = { sumW: 0, sumWx: 0, n: 0 };
    const posterior = calculatePosterior(stats, DEFAULT_BAYESIAN_CONFIG);
    const confidence = calculateConfidence(stats.n);

    expect(posterior).toBeCloseTo(DEFAULT_BAYESIAN_CONFIG.priorMean, 2);
    expect(confidence).toBe(0);
  });

  it("with few positive reviews, shrinks towards prior mean", () => {
    // 1 review with score 5 and weight 1
    const stats: AspectAccumulator = { sumW: 1, sumWx: 5, n: 1 };
    const posterior = calculatePosterior(stats, DEFAULT_BAYESIAN_CONFIG);

    // prior: k=5, mu0=3.0 -> sum_w=1, sum_wx=5 -> (5 + 5*3)/(1 + 5) = 20/6 = 3.33
    expect(posterior).toBeCloseTo(3.33, 2);
    expect(posterior).toBeLessThan(5.0);
    expect(posterior).toBeGreaterThan(3.0);
  });

  it("with many positive reviews, converges close to the observed score", () => {
    // 50 reviews with score 5 and weight 1
    const stats: AspectAccumulator = { sumW: 50, sumWx: 250, n: 50 };
    const posterior = calculatePosterior(stats, DEFAULT_BAYESIAN_CONFIG);
    const confidence = calculateConfidence(stats.n);

    // (250 + 15) / 55 = 265 / 55 = 4.818
    expect(posterior).toBeGreaterThan(4.8);
    expect(confidence).toBeGreaterThan(0.65);
  });
});
