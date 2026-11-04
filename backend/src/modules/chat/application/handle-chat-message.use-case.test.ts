import { describe, expect, it } from "bun:test";
import { aDevice } from "../../../../test/builders/device.builder";
import type { CatalogApi } from "../../catalog";
import type { RecommenderApi } from "../../recommender";
import { RuleBasedCriteriaExtractor } from "../domain/rule-based-criteria-extractor";
import { HandleChatMessageUseCase } from "./handle-chat-message.use-case";

describe("HandleChatMessageUseCase", () => {
  const d1 = aDevice().withId("d1").withModel("Galaxy A55").withPriceCents(199900).build();

  const fakeCatalogApi: CatalogApi = {
    findDeviceById: async (id) => (id === "d1" ? d1 : null),
    findByBrandAndModel: async () => null,
    listActiveDevices: async () => ({ items: [d1] }),
  };

  const fakeRecommenderApi: RecommenderApi = {
    recommend: async () => ({
      items: [
        {
          device: d1,
          utility: 0.85,
          fitPercent: 85,
          aspectScores: { battery: 0.8, camera: 0.8, performance: 0.8, screen: 0.8, storage: 0.8, valueForMoney: 0.8 },
          details: [],
          topAspects: ["battery", "camera"],
        },
      ],
      dropped: [],
      totalEvaluated: 1,
    }),
  };

  it("handles a regular search message and returns conversational reply with results", async () => {
    const extractor = new RuleBasedCriteriaExtractor();
    const useCase = new HandleChatMessageUseCase({
      criteriaExtractor: extractor,
      recommenderApi: fakeRecommenderApi,
      catalogApi: fakeCatalogApi,
    });

    const result = await useCase.execute({
      message: "Quero um celular até 2000 reais com boa bateria",
    });

    expect(result.reply).toContain("Encontrei");
    expect(result.results).toHaveLength(1);
    expect(result.state.constraints.some((c) => c.kind === "maxPrice")).toBe(true);
    expect(result.state.referenceDeviceId).toBe("d1");
  });

  it("handles rapid critique without invoking criteria extractor", async () => {
    let extractorCalled = false;
    const fakeExtractor = {
      extract: async () => {
        extractorCalled = true;
        return { constraints: [], prioritizedAspects: [], rawKeywords: [] };
      },
    };

    const useCase = new HandleChatMessageUseCase({
      criteriaExtractor: fakeExtractor,
      recommenderApi: fakeRecommenderApi,
      catalogApi: fakeCatalogApi,
    });

    const result = await useCase.execute({
      message: "tem um mais barato?",
      state: {
        constraints: [],
        weights: { battery: 0.2, camera: 0.2, performance: 0.2, screen: 0.2, storage: 0.1, valueForMoney: 0.1 },
        referenceDeviceId: "d1",
      },
    });

    expect(extractorCalled).toBe(false); // Verified no LLM invocation!
    expect(result.reply).toContain("mais em conta");
    expect(result.results).toHaveLength(1);
  });
});
