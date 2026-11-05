import type { Clock } from "../../../shared/time/clock";
import type { Logger } from "../../../shared/logging/logger";
import type { ReviewRepository } from "../domain/review.repository";
import type { ReviewSource } from "../domain/review-source";
import {
  createReview,
  type Review,
  type ReviewSourceLink,
} from "../domain/review";
import { evaluateComment } from "../domain/relevance-filter";

export interface CollectReviewsUseCaseDeps {
  readonly reviewRepository: ReviewRepository;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface CollectReviewsInput {
  readonly link: ReviewSourceLink;
  readonly source: ReviewSource;
  readonly budgetCount?: number;
}

export interface CollectReviewsResult {
  readonly linkId: string;
  readonly collectedCount: number;
  readonly relevantCount: number;
  readonly insertedCount: number;
  readonly nextCursor: string | null;
  readonly nextDueAt: Date;
}

const MIN_INTERVAL_DAYS = 1;
const MAX_INTERVAL_DAYS = 30;

export class CollectReviewsUseCase {
  constructor(private readonly deps: CollectReviewsUseCaseDeps) {}

  async execute(input: CollectReviewsInput): Promise<CollectReviewsResult> {
    const now = this.deps.clock.now();
    const { link, source, budgetCount } = input;

    const { reviews: rawReviews, nextCursor } = await source.collect(
      link,
      budgetCount,
    );

    let relevantCount = 0;
    const domainReviews: Review[] = [];

    for (const raw of rawReviews) {
      const verdict = evaluateComment(raw.content);
      const isRelevant = verdict.isRelevant;
      if (isRelevant) relevantCount++;

      domainReviews.push(
        createReview(
          {
            deviceId: link.deviceId,
            provider: link.provider,
            externalRef: raw.externalRef,
            authorHash: raw.authorHash,
            rating: raw.rating,
            content: raw.content,
            publishedAt: raw.publishedAt,
            videoPhase: raw.videoPhase,
            daysSinceLaunch: raw.daysSinceLaunch,
            status: isRelevant ? "pending" : "irrelevant",
          },
          { now },
        ),
      );
    }

    const { insertedCount } = await this.deps.reviewRepository.saveReviews(
      domainReviews,
    );

    // Adaptive interval policy (PLANO_ATUALIZACAO §5.2)
    let nextIntervalDays = link.intervalDays;
    if (insertedCount <= 2) {
      nextIntervalDays = Math.min(MAX_INTERVAL_DAYS, link.intervalDays * 2);
    } else if (insertedCount >= 10) {
      nextIntervalDays = MIN_INTERVAL_DAYS;
    }

    const nextDueAt = new Date(
      now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000,
    );

    const updatedLink: ReviewSourceLink = {
      ...link,
      cursor: nextCursor ?? null,
      nextDueAt,
      intervalDays: nextIntervalDays,
      lastNewCount: insertedCount,
    };

    await this.deps.reviewRepository.updateSourceLink(updatedLink);

    this.deps.logger.info("reviews.collected", {
      deviceId: link.deviceId,
      provider: link.provider,
      collected: rawReviews.length,
      relevant: relevantCount,
      inserted: insertedCount,
      nextIntervalDays,
    });

    return {
      linkId: link.id,
      collectedCount: rawReviews.length,
      relevantCount,
      insertedCount,
      nextCursor: nextCursor ?? null,
      nextDueAt,
    };
  }
}
