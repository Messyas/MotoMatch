import { describe, expect, it } from "bun:test";
import {
  EMBEDDING_DIMENSION,
  generatePseudoEmbedding,
  InMemoryEmbeddingService,
} from "./embedding.service";

describe("Embedding Service", () => {
  it("generates deterministic unit-normalized 768-dimensional vectors", () => {
    const text1 = "A bateria dura muito o dia inteiro";
    const vec1a = generatePseudoEmbedding(text1);
    const vec1b = generatePseudoEmbedding(text1);

    expect(vec1a).toHaveLength(EMBEDDING_DIMENSION);
    expect(vec1a).toEqual(vec1b);

    // Check Euclidean norm is approx 1
    const norm = Math.sqrt(vec1a.reduce((acc, val) => acc + val * val, 0));
    expect(Math.abs(norm - 1.0)).toBeLessThan(0.01);
  });

  it("produces different embeddings for distinct text inputs", () => {
    const vecA = generatePseudoEmbedding("celular rapido para jogos");
    const vecB = generatePseudoEmbedding("camera ruim a noite");

    expect(vecA).not.toEqual(vecB);
  });

  it("InMemoryEmbeddingService embeds batch of strings", async () => {
    const service = new InMemoryEmbeddingService();
    const result = await service.embed(["teste 1", "teste 2"]);
    expect(result).toHaveLength(2);
    expect(result[0]!).toHaveLength(EMBEDDING_DIMENSION);
    expect(result[1]!).toHaveLength(EMBEDDING_DIMENSION);
  });
});

