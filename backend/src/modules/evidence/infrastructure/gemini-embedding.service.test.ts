import { describe, expect, it } from "bun:test";
import { GeminiEmbeddingService } from "./gemini-embedding.service";

describe("Gemini Embedding Service", () => {
  it("parses valid batch response from Gemini", async () => {
    const fakeFetch = (async () =>
      new Response(
        JSON.stringify({
          embeddings: [{ values: new Array(768).fill(0.1) }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )) as unknown as typeof fetch;

    const service = new GeminiEmbeddingService({
      apiKey: "test-key",
      fetchFn: fakeFetch,
    });

    const result = await service.embed(["teste"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(768);
    expect(result[0]![0]).toBe(0.1);
  });

  it("falls back gracefully to pseudo-embeddings on HTTP error", async () => {
    const fakeFetch = (async () =>
      new Response("Rate limited", { status: 429 })) as unknown as typeof fetch;

    const service = new GeminiEmbeddingService({
      apiKey: "test-key",
      fetchFn: fakeFetch,
    });

    const result = await service.embed(["bateria dura muito"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(768);
  });
});
