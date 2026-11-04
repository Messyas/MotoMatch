import { describe, expect, it } from "bun:test";
import { aDevice } from "../../../../test/builders/device.builder";
import type { CatalogApi } from "../../catalog";
import { aRecommendationQuery } from "../domain/recommendation-query.builder";
import { RecommendUseCase } from "./recommend.use-case";

describe("RecommendUseCase", () => {
  it("runs recommendation pipeline and returns top 3 ranked devices", async () => {
    const d1 = aDevice().withId("d1").withModel("Budget Champ").withPriceCents(120000).withBatteryMah(6000).withRamGb(6).build();
    const d2 = aDevice().withId("d2").withModel("Performance Mid").withPriceCents(180000).withBatteryMah(5000).withRamGb(12).build();
    const d3 = aDevice().withId("d3").withModel("Flagship").withPriceCents(350000).withBatteryMah(4800).build();
    const d4 = aDevice().withId("d4").withModel("Older Model").withPriceCents(190000).withBatteryMah(4000).build();

    const fakeCatalogApi: CatalogApi = {
      findDeviceById: async () => null,
      findByBrandAndModel: async () => null,
      listActiveDevices: async () => ({ items: [d1, d2, d3, d4] }),
    };

    const useCase = new RecommendUseCase({ catalogApi: fakeCatalogApi });

    const query = aRecommendationQuery()
      .withMaxPrice(200000)
      .prioritize("battery", 0.6)
      .withLimit(2)
      .build();

    const result = await useCase.execute(query);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.device.id).toBe("d1"); // d1 has 6000mAh and price <= 200000
    expect(result.items[0]?.fitPercent).toBeGreaterThanOrEqual(60);
  });

  it("handles empty catalog gracefully", async () => {
    const fakeCatalogApi: CatalogApi = {
      findDeviceById: async () => null,
      findByBrandAndModel: async () => null,
      listActiveDevices: async () => ({ items: [] }),
    };

    const useCase = new RecommendUseCase({ catalogApi: fakeCatalogApi });
    const query = aRecommendationQuery().build();
    const result = await useCase.execute(query);

    expect(result.items).toHaveLength(0);
    expect(result.totalEvaluated).toBe(0);
  });
});
