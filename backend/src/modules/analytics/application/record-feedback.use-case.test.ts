import { describe, expect, it } from "bun:test";
import { FixedClock } from "../../../shared/time/clock";
import { MemoryLogger } from "../../../shared/logging/logger";
import { InProcessEventBus } from "../../../shared/events/event-bus";
import { InMemoryAnalyticsRepository } from "../infrastructure/in-memory-analytics.repository";
import { RecordFeedbackUseCase } from "./record-feedback.use-case";

describe("RecordFeedbackUseCase", () => {
  it("records thumbs up feedback, updates collective score and emits event", async () => {
    const clock = new FixedClock(new Date("2026-05-10T12:00:00Z"));
    const logger = new MemoryLogger();
    const eventBus = new InProcessEventBus(logger);
    const repo = new InMemoryAnalyticsRepository();

    const useCase = new RecordFeedbackUseCase({
      analyticsRepository: repo,
      eventBus,
      clock,
      logger,
    });

    const result = await useCase.execute({
      sessionId: "sess-1",
      deviceId: "dev-1",
      intentSig: "price:<=2000|bat:high",
      kind: "up",
    });

    expect(result.recorded).toBe(true);

    const score = await repo.getCollectiveScore("dev-1", "price:<=2000|bat:high");
    expect(score).not.toBeNull();
    expect(score!.alpha).toBe(2.0); // 1.0 initial + 1.0 delta
    expect(score!.beta).toBe(1.0);

    // Test anti-abuse duplicate within same day
    const duplicateResult = await useCase.execute({
      sessionId: "sess-1",
      deviceId: "dev-1",
      intentSig: "price:<=2000|bat:high",
      kind: "up",
    });

    expect(duplicateResult.recorded).toBe(false);
    // Score should not increment on duplicate
    const scoreAfter = await repo.getCollectiveScore("dev-1", "price:<=2000|bat:high");
    expect(scoreAfter!.alpha).toBe(2.0);
  });
});
