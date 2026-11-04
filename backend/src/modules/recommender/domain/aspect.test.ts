import { describe, expect, it } from "bun:test";
import {
  ALL_ASPECTS,
  DEFAULT_ASPECT_WEIGHTS,
  normalizeWeights,
} from "./aspect";

describe("Aspects and Weights", () => {
  it("default aspect weights sum to 1.0", () => {
    const sum = Object.values(DEFAULT_ASPECT_WEIGHTS).reduce((acc, w) => acc + w, 0);
    expect(sum).toBeCloseTo(1.0, 4);
    expect(ALL_ASPECTS).toHaveLength(6);
  });

  it("normalizes custom weights so they sum to 1.0", () => {
    const custom = normalizeWeights({
      battery: 0.8,
      camera: 0.4,
    });
    const sum = Object.values(custom).reduce((acc, w) => acc + w, 0);
    expect(sum).toBeCloseTo(1.0, 2);
    expect(custom.battery).toBeGreaterThan(custom.camera);
  });

  it("falls back to default weights when all inputs are 0 or invalid", () => {
    const res = normalizeWeights({
      battery: 0,
      camera: 0,
      performance: 0,
      screen: 0,
      storage: 0,
      valueForMoney: 0,
    });
    expect(res).toEqual(DEFAULT_ASPECT_WEIGHTS);
  });
});
