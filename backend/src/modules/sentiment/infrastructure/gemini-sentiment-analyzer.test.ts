import { describe, expect, it } from "bun:test";
import { GeminiSentimentAnalyzer } from "./gemini-sentiment-analyzer";

describe("GeminiSentimentAnalyzer", () => {
  it("parses valid Gemini response into typed ReviewAspect map", async () => {
    const mockFetcher = async () => {
      const responsePayload = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify([
                    {
                      reviewId: "r1",
                      aspects: [
                        {
                          aspect: "battery",
                          score: 5,
                          sentiment: "positive",
                          confidence: 0.95,
                        },
                      ],
                    },
                  ]),
                },
              ],
            },
          },
        ],
      };

      return new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const analyzer = new GeminiSentimentAnalyzer({
      apiKey: "test-key",
      fetcher: mockFetcher,
    });

    const result = await analyzer.analyzeBatch([
      { id: "r1", content: "Bateria sensacional dura 2 dias" },
    ]);

    const r1 = result.get("r1");
    expect(r1).toBeDefined();
    expect(r1).toHaveLength(1);
    expect(r1![0]!.aspect).toBe("battery");
    expect(r1![0]!.score).toBe(5);
  });

  it("falls back to RuleBasedSentimentAnalyzer on fetch error", async () => {
    const mockFetcher = async () => {
      return new Response("Internal Server Error", { status: 500 });
    };

    const analyzer = new GeminiSentimentAnalyzer({
      apiKey: "test-key",
      fetcher: mockFetcher,
    });

    const result = await analyzer.analyzeBatch([
      { id: "r2", content: "A bateria dura muito e carrega rápido" },
    ]);

    const r2 = result.get("r2");
    expect(r2).toBeDefined();
    expect(r2![0]!.aspect).toBe("battery");
    expect(r2![0]!.sentiment).toBe("positive");
  });
});
