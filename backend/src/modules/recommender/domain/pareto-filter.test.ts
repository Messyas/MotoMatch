import { describe, expect, it } from "bun:test";
import { aDevice } from "../../../../test/builders/device.builder";
import { DEFAULT_ASPECT_WEIGHTS } from "./aspect";
import { applyParetoFilter, type ScoredCandidate } from "./pareto-filter";

describe("Pareto Filter", () => {
  it("drops Pareto-dominated devices that have lower or equal scores and higher price", () => {
    // d1: Good device, price 1500
    const d1 = aDevice().withId("d1").withModel("Strong Choice").withPriceCents(150000).build();
    // d2: Worse or equal in all aspects and more expensive (1800) -> strictly dominated by d1
    const d2 = aDevice().withId("d2").withModel("Dominated Choice").withPriceCents(180000).build();

    const candidates: ScoredCandidate[] = [
      {
        device: d1,
        aspectScores: {
          battery: 0.8,
          camera: 0.8,
          performance: 0.8,
          screen: 0.8,
          storage: 0.8,
          valueForMoney: 0.8,
        },
        utility: 0.8,
      },
      {
        device: d2,
        aspectScores: {
          battery: 0.7,
          camera: 0.7,
          performance: 0.7,
          screen: 0.7,
          storage: 0.7,
          valueForMoney: 0.6,
        },
        utility: 0.68,
      },
    ];

    const result = applyParetoFilter(candidates, DEFAULT_ASPECT_WEIGHTS);
    expect(result.nonDominated).toHaveLength(1);
    expect(result.nonDominated[0]?.device.id).toBe("d1");
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]?.deviceId).toBe("d2");
    expect(result.dropped[0]?.dominatedByModel).toBe("Strong Choice");
  });

  it("retains trade-off devices where one has better aspect even if more expensive", () => {
    // d1: Cheaper (1200) but lower camera (0.6)
    const d1 = aDevice().withId("d1").withPriceCents(120000).build();
    // d2: More expensive (1600) but better camera (0.9)
    const d2 = aDevice().withId("d2").withPriceCents(160000).build();

    const candidates: ScoredCandidate[] = [
      {
        device: d1,
        aspectScores: { battery: 0.8, camera: 0.6, performance: 0.7, screen: 0.7, storage: 0.7, valueForMoney: 0.8 },
        utility: 0.72,
      },
      {
        device: d2,
        aspectScores: { battery: 0.8, camera: 0.9, performance: 0.7, screen: 0.7, storage: 0.7, valueForMoney: 0.6 },
        utility: 0.74,
      },
    ];

    const result = applyParetoFilter(candidates, DEFAULT_ASPECT_WEIGHTS);
    expect(result.nonDominated).toHaveLength(2);
    expect(result.dropped).toHaveLength(0);
  });
});
