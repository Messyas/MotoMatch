import { describe, expect, it } from "bun:test";
import {
  computeCollectiveBonus,
  expectedBetaValue,
  sampleBeta,
} from "./thompson-sampling";

describe("ThompsonSampling", () => {
  it("prior (alpha=1, beta=1) has expected value 0.5 and bonus 0", () => {
    const mean = expectedBetaValue(1, 1);
    expect(mean).toBe(0.5);

    const bonus = computeCollectiveBonus({ alpha: 1, beta: 1, useExpectedValue: true });
    expect(bonus).toBe(0);
  });

  it("high positive feedback yields positive bonus bounded by epsilon", () => {
    const mean = expectedBetaValue(20, 2);
    expect(mean).toBeGreaterThan(0.9);

    const bonus = computeCollectiveBonus({
      alpha: 20,
      beta: 2,
      epsilon: 0.05,
      useExpectedValue: true,
    });
    expect(bonus).toBeGreaterThan(0.015);
    expect(bonus).toBeLessThanOrEqual(0.05);
  });

  it("high negative feedback yields negative bonus", () => {
    const mean = expectedBetaValue(2, 20);
    expect(mean).toBeLessThan(0.15);

    const bonus = computeCollectiveBonus({
      alpha: 2,
      beta: 20,
      epsilon: 0.05,
      useExpectedValue: true,
    });
    expect(bonus).toBeLessThan(-0.015);
    expect(bonus).toBeGreaterThanOrEqual(-0.05);
  });

  it("sampleBeta generates values strictly within (0, 1)", () => {
    for (let i = 0; i < 20; i++) {
      const s = sampleBeta(5, 5);
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThan(1);
    }
  });
});
