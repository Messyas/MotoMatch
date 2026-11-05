import type { Clock } from "../../../shared/time/clock";
import type { Logger } from "../../../shared/logging/logger";
import type { ReviewsApi } from "../../reviews";
import type { SentimentAnalyzer } from "../domain/sentiment-analyzer";
import type { SentimentRepository } from "../domain/sentiment.repository";

export interface AnalyzePendingReviewsDeps {
  readonly reviewsApi: ReviewsApi;
  readonly sentimentRepository: SentimentRepository;
  readonly sentimentAnalyzer: SentimentAnalyzer;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface AnalyzePendingReviewsInput {
  readonly batchSize?: number;
  readonly leaseDurationMs?: number;
}

export interface AnalyzePendingReviewsResult {
  readonly processedCount: number;
  readonly aspectsExtractedCount: number;
}

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_LEASE_DURATION_MS = 60_000; // 1 minute lease

export class AnalyzePendingReviewsUseCase {
  constructor(private readonly deps: AnalyzePendingReviewsDeps) {}

  async execute(
    input: AnalyzePendingReviewsInput = {},
  ): Promise<AnalyzePendingReviewsResult> {
    const now = this.deps.clock.now();
    const batchSize = input.batchSize ?? DEFAULT_BATCH_SIZE;
    const leaseDurationMs = input.leaseDurationMs ?? DEFAULT_LEASE_DURATION_MS;

    const reviews = await this.deps.reviewsApi.acquirePendingReviewsBatch({
      batchSize,
      leaseDurationMs,
      now,
    });

    if (reviews.length === 0) {
      return { processedCount: 0, aspectsExtractedCount: 0 };
    }

    try {
      const aspectsMap = await this.deps.sentimentAnalyzer.analyzeBatch(
        reviews.map((r) => ({ id: r.id, content: r.content })),
      );

      let totalAspects = 0;
      for (const review of reviews) {
        const aspects = aspectsMap.get(review.id) ?? [];
        if (aspects.length > 0) {
          await this.deps.sentimentRepository.saveAspects(aspects);
          totalAspects += aspects.length;
        }

        await this.deps.reviewsApi.markReviewAnalyzed({
          reviewId: review.id,
          now,
        });
      }

      this.deps.logger.info("sentiment.reviews_analyzed", {
        processed: reviews.length,
        aspectsExtracted: totalAspects,
      });

      return {
        processedCount: reviews.length,
        aspectsExtractedCount: totalAspects,
      };
    } catch (err) {
      // On fatal batch error, mark reviews failed with backoff
      const nextAttemptAt = new Date(now.getTime() + 5 * 60 * 1000);
      for (const review of reviews) {
        await this.deps.reviewsApi.markReviewFailed({
          reviewId: review.id,
          errorCode: "ANALYSIS_FAILED",
          errorMessage: err instanceof Error ? err.message : String(err),
          nextAttemptAt,
        });
      }
      throw err;
    }
  }
}
