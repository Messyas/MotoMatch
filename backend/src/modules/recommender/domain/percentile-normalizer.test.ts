import { describe, expect, it } from "bun:test";
import { aDevice } from "../../../../test/builders/device.builder";
import {
  computeCatalogStats,
  computePercentile,
  computeSpecScore,
} from "./percentile-normalizer";

describe("Percentile Normalizer", () => {
  it("computePercentile returns values between 0.05 and 1.0", () => {
    const sorted = [4000, 5000, 5000, 6000];
    expect(computePercentile(4000, sorted)).toBeLessThan(computePercentile(5000, sorted));
    expect(computePercentile(5000, sorted)).toBeLessThan(computePercentile(6000, sorted));
    expect(computePercentile(6000, sorted)).toBe(1.0);
  });

  it("computes stats across active devices and calculates aspect scores", () => {
    const d1 = aDevice().withId("d1").withBatteryMah(4500).withPriceCents(120000).build();
    const d2 = aDevice().withId("d2").withBatteryMah(5000).withPriceCents(180000).build();
    const d3 = aDevice().withId("d3").withBatteryMah(6000).withPriceCents(250000).build();

    const stats = computeCatalogStats([d1, d2, d3]);
    expect(stats.sampleCount).toBe(3);
    expect(stats.sortedValues.battery_mah).toEqual([4500, 5000, 6000]);

    const s1 = computeSpecScore(d1, "battery", stats);
    const s2 = computeSpecScore(d2, "battery", stats);
    const s3 = computeSpecScore(d3, "battery", stats);

    expect(s1).toBeLessThan(s2);
    expect(s2).toBeLessThan(s3);

    // Value for money: cheaper device (d1) has higher score than expensive device (d3)
    const vfm1 = computeSpecScore(d1, "valueForMoney", stats);
    const vfm3 = computeSpecScore(d3, "valueForMoney", stats);
    expect(vfm1).toBeGreaterThan(vfm3);
  });
});
