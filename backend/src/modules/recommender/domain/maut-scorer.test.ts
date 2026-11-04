import { describe, expect, it } from "bun:test";
import { aDevice } from "../../../../test/builders/device.builder";
import { DEFAULT_ASPECT_WEIGHTS } from "./aspect";
import { scoreDeviceMaut } from "./maut-scorer";
import { computeCatalogStats } from "./percentile-normalizer";

describe("MAUT Scorer", () => {
  it("scores device combining spec score and opinion score with weights", () => {
    const d1 = aDevice()
      .withBatteryMah(5000)
      .withRamGb(8)
      .withPriceCents(180000)
      .build();

    const stats = computeCatalogStats([d1]);

    const result = scoreDeviceMaut({
      device: d1,
      weights: DEFAULT_ASPECT_WEIGHTS,
      catalogStats: stats,
      opinionScores: {
        battery: 4.5,
        camera: 4.2,
      },
      collectiveBonus: 0.02,
    });

    expect(result.utility).toBeGreaterThan(0.5);
    expect(result.fitPercent).toBeGreaterThanOrEqual(50);
    expect(result.aspectScores.battery).toBeDefined();
    expect(result.details).toHaveLength(6);
    expect(result.topAspects).toHaveLength(2);
  });
});
