import { describe, expect, it } from "bun:test";
import { scoreProcessor } from "./processor-tiers";

describe("Processor Tiers", () => {
  it("recognizes flagship processors as tier 1", () => {
    expect(scoreProcessor("Snapdragon 8 Gen 3")).toBe(1.0);
    expect(scoreProcessor("Apple A18 Pro")).toBe(1.0);
    expect(scoreProcessor("MediaTek Dimensity 9300")).toBe(1.0);
  });

  it("recognizes mid-range processors appropriately", () => {
    expect(scoreProcessor("Exynos 1480")).toBe(0.7);
    expect(scoreProcessor("Snapdragon 6s Gen 3")).toBe(0.55);
    expect(scoreProcessor("Helio G99")).toBe(0.55);
  });

  it("recognizes budget entry-level processors", () => {
    expect(scoreProcessor("Unisoc T606")).toBe(0.4);
    expect(scoreProcessor("Helio G36")).toBe(0.25);
  });

  it("uses benchmark score when provided instead of pattern matching", () => {
    const score = scoreProcessor("Unknown SoC", 1_100_000);
    expect(score).toBeCloseTo(0.5, 2);
  });

  it("falls back to neutral 0.50 for unknown or missing processors", () => {
    expect(scoreProcessor("")).toBe(0.5);
    expect(scoreProcessor(null)).toBe(0.5);
    expect(scoreProcessor("Custom Silicon XYZ")).toBe(0.5);
  });
});
