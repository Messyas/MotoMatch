import { describe, expect, it } from "bun:test";
import { InMemoryEmbeddingService } from "../domain/embedding.service";
import { InMemoryEvidenceRepository } from "../infrastructure/in-memory-evidence.repository";
import { FindEvidenceUseCase } from "./find-evidence.use-case";

describe("Find Evidence Use Case", () => {
  it("retrieves snippets per aspect and formats realistic quote string", async () => {
    const repo = new InMemoryEvidenceRepository();
    const embeddingService = new InMemoryEmbeddingService();

    await repo.saveSnippets([
      {
        reviewId: "r-1",
        chunkIndex: 0,
        deviceId: "dev-10",
        aspect: "battery",
        text: "aguenta o dia todo jogando",
        sentiment: "positive",
        provider: "youtube",
        publishedAt: new Date("2026-03-10T10:00:00Z"),
      },
      {
        reviewId: "r-2",
        chunkIndex: 0,
        deviceId: "dev-10",
        aspect: "camera",
        text: "fotos nitidas com boa iluminacao",
        sentiment: "positive",
        provider: "youtube",
        publishedAt: new Date("2026-03-12T10:00:00Z"),
      },
    ]);

    const useCase = new FindEvidenceUseCase({
      evidenceRepository: repo,
      embeddingService,
    });

    const items = await useCase.execute({
      deviceId: "dev-10",
      aspects: ["battery", "camera"],
    });

    expect(items).toHaveLength(2);

    const battery = items.find((i) => i.aspect === "battery");
    expect(battery).toBeDefined();
    expect(battery!.quote).toBe(
      '"aguenta o dia todo jogando" (YouTube, mar/2026)',
    );

    const map = await useCase.executeAsMap({
      deviceId: "dev-10",
      aspects: ["battery"],
    });
    expect(map.battery).toBeDefined();
    expect(map.battery!.quote).toContain("aguenta o dia todo");
  });
});
