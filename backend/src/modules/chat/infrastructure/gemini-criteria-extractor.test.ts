import { describe, expect, it } from "bun:test";
import { GeminiCriteriaExtractor, type HttpFetcher } from "./gemini-criteria-extractor";

describe("GeminiCriteriaExtractor", () => {
  it("parses valid Gemini response into typed ExtractedCriteria", async () => {
    const mockFetcher: HttpFetcher = async () => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      constraints: [
                        { kind: "maxPrice", value: 200000 },
                        { kind: "requires5g" },
                      ],
                      prioritizedAspects: [
                        { aspect: "battery", weight: 0.4 },
                        { aspect: "camera", weight: 0.3 },
                      ],
                      rawKeywords: ["bateria", "5g"],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      );
    };

    const extractor = new GeminiCriteriaExtractor({
      apiKey: "test-key",
      fetcher: mockFetcher,
    });

    const result = await extractor.extract("quero um celular com 5g até 2000");
    expect(result.constraints).toHaveLength(2);
    expect(result.prioritizedAspects).toHaveLength(2);
    expect(result.rawKeywords).toEqual(["bateria", "5g"]);
  });

  it("gracefully falls back to RuleBasedCriteriaExtractor on fetch failure", async () => {
    const failingFetcher: HttpFetcher = async () => {
      return new Response("Internal Server Error", { status: 500 });
    };

    const extractor = new GeminiCriteriaExtractor({
      apiKey: "test-key",
      fetcher: failingFetcher,
    });

    const result = await extractor.extract("Samsung com 8GB de RAM até 1500");
    expect(result.constraints.some((c) => c.kind === "brand")).toBe(true);
    expect(result.constraints.some((c) => c.kind === "minRamGb")).toBe(true);
    expect(result.constraints.some((c) => c.kind === "maxPrice")).toBe(true);
  });
});
