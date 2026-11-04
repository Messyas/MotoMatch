import { describe, expect, it } from "bun:test";
import { RecommendationQueryBuilder } from "./recommendation-query.builder";

describe("RecommendationQueryBuilder", () => {
  it("builds a query with constraints, normalized weights and limit", () => {
    const query = new RecommendationQueryBuilder()
      .withMaxPrice(200000)
      .require5g()
      .withMinRam(8)
      .prioritize("battery", 0.5)
      .withLimit(3)
      .build();

    expect(query.limit).toBe(3);
    expect(query.constraints).toHaveLength(3);
    expect(query.weights.battery).toBeGreaterThan(query.weights.camera);
    const sum = Object.values(query.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 2);
  });
});
