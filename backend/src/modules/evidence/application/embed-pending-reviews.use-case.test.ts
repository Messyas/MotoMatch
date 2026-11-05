import { describe, expect, it } from "bun:test";
import { StructuredLogger } from "../../../shared/logging/logger";
import { InMemoryEmbeddingService } from "../domain/embedding.service";
import { InMemoryEvidenceRepository } from "../infrastructure/in-memory-evidence.repository";
import { EmbedPendingReviewsUseCase } from "./embed-pending-reviews.use-case";

describe("Embed Pending Reviews Use Case", () => {
  it("chunks reviews, computes embeddings, saves snippets and prunes excess", async () => {
    const repo = new InMemoryEvidenceRepository();
    const embeddingService = new InMemoryEmbeddingService();
    const logger = new StructuredLogger({ minLevel: "error" });

    repo.pendingReviews = [
      {
        id: "rev-1",
        deviceId: "dev-1",
        provider: "youtube",
        content:
          "A bateria dura um dia inteiro tranquilamente. As cameras tiram fotos boas em qualquer luz.",
        publishedAt: new Date("2026-03-01T12:00:00Z"),
      },
    ];

    const useCase = new EmbedPendingReviewsUseCase({
      evidenceRepository: repo,
      embeddingService,
      logger,
    });

    const result = await useCase.execute();

    expect(result.processedReviews).toBe(1);
    expect(result.snippetsSaved).toBe(2);

    const count = await repo.countSnippets();
    expect(count).toBe(2);

    const batterySnippets = await repo.findEvidence({
      deviceId: "dev-1",
      aspects: ["battery"],
    });
    expect(batterySnippets).toHaveLength(1);
    expect(batterySnippets[0]!.aspect).toBe("battery");
    expect(batterySnippets[0]!.embedding).toBeDefined();
    expect(batterySnippets[0]!.embedding).toHaveLength(768);
  });
});
