import { describe, expect, it } from "bun:test";
import { aDevice } from "../../../../test/builders/device.builder";
import { applyCritiqueRule } from "./critique-rules";
import { aRecommendationQuery } from "./recommendation-query.builder";

describe("Critique Rules", () => {
  it("moreOf increases the specified aspect weight", () => {
    const ref = aDevice().withId("ref-1").build();
    const query = aRecommendationQuery().build();

    const updated = applyCritiqueRule({
      query,
      critique: { kind: "moreOf", aspect: "battery" },
      referenceDevice: ref,
    });

    expect(updated.weights.battery).toBeGreaterThan(query.weights.battery);
    expect(updated.referenceDeviceId).toBe("ref-1");
  });

  it("cheaper sets maxPrice to 90% of reference price", () => {
    const ref = aDevice().withId("ref-1").withPriceCents(200000).build();
    const query = aRecommendationQuery().build();

    const updated = applyCritiqueRule({
      query,
      critique: { kind: "cheaper" },
      referenceDevice: ref,
    });

    const maxPrice = updated.constraints.find((c) => c.kind === "maxPrice");
    expect(maxPrice).toBeDefined();
    expect((maxPrice as any).value).toBe(180000);
  });

  it("similarTo sets a price envelope around reference price", () => {
    const ref = aDevice().withId("ref-1").withPriceCents(200000).build();
    const query = aRecommendationQuery().build();

    const updated = applyCritiqueRule({
      query,
      critique: { kind: "similarTo" },
      referenceDevice: ref,
    });

    const minPrice = updated.constraints.find((c) => c.kind === "minPrice");
    const maxPrice = updated.constraints.find((c) => c.kind === "maxPrice");
    expect((minPrice as any).value).toBe(170000);
    expect((maxPrice as any).value).toBe(230000);
  });
});
