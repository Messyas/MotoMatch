import { describe, expect, it } from "bun:test";
import { FixedClock } from "../../../shared/time/clock";
import { MemoryLogger } from "../../../shared/logging/logger";
import { InMemoryReviewRepository } from "../infrastructure/in-memory-review.repository";
import { ImportReviewsUseCase } from "./import-reviews.use-case";

describe("ImportReviewsUseCase", () => {
  it("imports valid reviews, assigns status, and skips duplicates", async () => {
    const clock = new FixedClock(new Date("2026-05-10T12:00:00Z"));
    const repo = new InMemoryReviewRepository();
    const logger = new MemoryLogger();

    const useCase = new ImportReviewsUseCase({
      reviewRepository: repo,
      clock,
      logger,
    });

    const result = await useCase.execute({
      items: [
        {
          deviceId: "device-1",
          content: "Comprei e a bateria dura mais de 24 horas jogando bastante",
          provider: "csv",
          externalRef: "csv-row-1",
          rating: 5,
        },
        {
          deviceId: "device-1",
          content: "muito curto",
          provider: "manual",
          externalRef: "manual-row-2",
        },
      ],
    });

    expect(result.total).toBe(2);
    expect(result.relevant).toBe(1);
    expect(result.inserted).toBe(2);

    const counts = await repo.countByStatus();
    expect(counts["pending"]).toBe(1);
    expect(counts["irrelevant"]).toBe(1);
  });
});
