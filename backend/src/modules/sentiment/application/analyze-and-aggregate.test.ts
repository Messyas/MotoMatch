import { describe, expect, it } from "bun:test";
import { FixedClock } from "../../../shared/time/clock";
import { MemoryLogger } from "../../../shared/logging/logger";
import { InMemoryReviewRepository } from "../../reviews";
import { createReviewsModule } from "../../reviews/reviews.module";
import { InMemorySentimentRepository } from "../infrastructure/in-memory-sentiment.repository";
import { RuleBasedSentimentAnalyzer } from "../domain/rule-based-sentiment-analyzer";
import { AnalyzePendingReviewsUseCase } from "./analyze-pending-reviews.use-case";
import { AggregateAspectStatsUseCase } from "./aggregate-aspect-stats.use-case";

describe("Analyze & Aggregate Reviews", () => {
  it("leases pending reviews, analyzes sentiment, and aggregates into aspect stats idempotently", async () => {
    const clock = new FixedClock(new Date("2026-05-10T12:00:00Z"));
    const logger = new MemoryLogger();
    const reviewRepo = new InMemoryReviewRepository();
    const sentimentRepo = new InMemorySentimentRepository();

    const reviewsModule = createReviewsModule({
      repository: reviewRepo,
      clock,
      logger,
    });

    // 1. Seed reviews
    await reviewsModule.api.importReviews({
      items: [
        {
          deviceId: "d1",
          content: "A bateria dura muito mais de 24 horas tranquilamente",
          externalRef: "r1",
        },
        {
          deviceId: "d1",
          content: "O desempenho é péssimo esquenta e trava no jogo",
          externalRef: "r2",
        },
      ],
    });

    const analyzeUseCase = new AnalyzePendingReviewsUseCase({
      reviewsApi: reviewsModule.api,
      sentimentRepository: sentimentRepo,
      sentimentAnalyzer: new RuleBasedSentimentAnalyzer(),
      clock,
      logger,
    });

    const analyzeResult = await analyzeUseCase.execute({ batchSize: 10 });
    expect(analyzeResult.processedCount).toBe(2);
    expect(analyzeResult.aspectsExtractedCount).toBeGreaterThanOrEqual(2);

    // 2. Aggregate
    const aggregateUseCase = new AggregateAspectStatsUseCase({
      reviewsApi: reviewsModule.api,
      sentimentRepository: sentimentRepo,
      clock,
      logger,
    });

    const aggResult = await aggregateUseCase.execute({ limit: 10 });
    expect(aggResult.aggregatedReviewsCount).toBe(2);

    // 3. Verify stats
    const stats = await sentimentRepo.findDeviceAspectStats("d1");
    expect(stats.get("battery")).toBeDefined();
    expect(stats.get("battery")!.n).toBe(1);
    expect(stats.get("battery")!.sumWx).toBeGreaterThanOrEqual(4);

    expect(stats.get("performance")).toBeDefined();
    expect(stats.get("performance")!.n).toBe(1);
    expect(stats.get("performance")!.sumWx).toBeLessThanOrEqual(2);

    // 4. Test idempotence: running aggregation again processes 0 reviews and does not double-count
    const aggResult2 = await aggregateUseCase.execute({ limit: 10 });
    expect(aggResult2.aggregatedReviewsCount).toBe(0);

    const statsAfter = await sentimentRepo.findDeviceAspectStats("d1");
    expect(statsAfter.get("battery")!.n).toBe(1);
  });
});
