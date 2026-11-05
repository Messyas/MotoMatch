import { describe, expect, it } from "bun:test";
import { FixedClock } from "../../../shared/time/clock";
import { MemoryLogger } from "../../../shared/logging/logger";
import { InMemoryReviewRepository } from "../infrastructure/in-memory-review.repository";
import { CollectReviewsUseCase } from "./collect-reviews.use-case";
import type { ReviewSource, ReviewSourceCollectResult } from "../domain/review-source";
import type { ReviewSourceLink } from "../domain/review";

class FakeReviewSource implements ReviewSource {
  readonly provider = "youtube";
  constructor(private result: ReviewSourceCollectResult) {}

  async collect(): Promise<ReviewSourceCollectResult> {
    return this.result;
  }
}

describe("CollectReviewsUseCase", () => {
  it("collects reviews, filters relevance, saves to repository and adapts interval", () => {
    const clock = new FixedClock(new Date("2026-05-10T12:00:00Z"));
    const repo = new InMemoryReviewRepository();
    const logger = new MemoryLogger();

    const link: ReviewSourceLink = {
      id: "link-1",
      deviceId: "device-1",
      provider: "youtube",
      externalRef: "video-123",
      cursor: null,
      nextDueAt: clock.now(),
      intervalDays: 1,
      lastNewCount: 0,
    };

    const fakeSource = new FakeReviewSource({
      reviews: [
        {
          externalRef: "comment-1",
          authorHash: "hash1",
          content: "Comprei o celular ha 2 meses e a bateria dura mais de 24h fácil!",
          publishedAt: new Date("2026-05-09T10:00:00Z"),
          videoPhase: "launch",
        },
        {
          externalRef: "comment-2",
          authorHash: "hash2",
          content: "Primeiro a comentar!!!",
          publishedAt: new Date("2026-05-09T10:05:00Z"),
          videoPhase: "launch",
        },
      ],
      nextCursor: "cursor-page-2",
    });

    const useCase = new CollectReviewsUseCase({
      reviewRepository: repo,
      clock,
      logger,
    });

    return useCase.execute({ link, source: fakeSource }).then((res) => {
      expect(res.collectedCount).toBe(2);
      expect(res.relevantCount).toBe(1);
      expect(res.insertedCount).toBe(2);

      // Verify link updated
      return repo.findSourceLink("youtube", "video-123").then((updatedLink) => {
        expect(updatedLink).not.toBeNull();
        expect(updatedLink?.cursor).toBe("cursor-page-2");
      });
    });
  });

  it("is idempotent: re-collecting duplicate externalRefs does not duplicate reviews", async () => {
    const clock = new FixedClock(new Date("2026-05-10T12:00:00Z"));
    const repo = new InMemoryReviewRepository();
    const logger = new MemoryLogger();

    const link: ReviewSourceLink = {
      id: "link-1",
      deviceId: "device-1",
      provider: "youtube",
      externalRef: "video-123",
      cursor: null,
      nextDueAt: clock.now(),
      intervalDays: 1,
      lastNewCount: 0,
    };

    const fakeSource = new FakeReviewSource({
      reviews: [
        {
          externalRef: "comment-1",
          content: "Comprei e a bateria dura muito bem no dia a dia",
        },
      ],
      nextCursor: null,
    });

    const useCase = new CollectReviewsUseCase({
      reviewRepository: repo,
      clock,
      logger,
    });

    const firstRun = await useCase.execute({ link, source: fakeSource });
    expect(firstRun.insertedCount).toBe(1);

    const secondRun = await useCase.execute({ link, source: fakeSource });
    expect(secondRun.insertedCount).toBe(0);
  });
});
