import type { Logger } from "../../../shared/logging/logger";
import {
  type EmbeddingService,
  generatePseudoEmbedding,
} from "../domain/embedding.service";

export interface GeminiEmbeddingServiceDeps {
  readonly apiKey: string;
  readonly model?: string; // defaults to "text-embedding-004"
  readonly fetchFn?: typeof fetch;
  readonly logger?: Logger;
}

export class GeminiEmbeddingService implements EmbeddingService {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchFn: typeof fetch;
  private readonly logger?: Logger;

  constructor(deps: GeminiEmbeddingServiceDeps) {
    this.apiKey = deps.apiKey;
    this.model = deps.model ?? "text-embedding-004";
    this.fetchFn = deps.fetchFn ?? fetch;
    this.logger = deps.logger;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:batchEmbedContents?key=${this.apiKey}`;
      const requests = texts.map((t) => ({
        model: `models/${this.model}`,
        content: {
          parts: [{ text: t }],
        },
        outputDimensionality: 768,
      }));

      const response = await this.fetchFn(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        throw new Error(
          `Gemini batchEmbedContents failed with status ${response.status}`,
        );
      }

      const data = (await response.json()) as {
        embeddings?: Array<{ values: number[] }>;
      };

      if (!data.embeddings || data.embeddings.length !== texts.length) {
        throw new Error("Invalid embedding response length");
      }

      return data.embeddings.map((e) => e.values);
    } catch (err) {
      this.logger?.warn("gemini.embedding_fallback", {
        reason: err instanceof Error ? err.message : String(err),
      });

      // Graceful fallback to deterministic pseudo-embedding
      return texts.map((t) => generatePseudoEmbedding(t));
    }
  }
}

