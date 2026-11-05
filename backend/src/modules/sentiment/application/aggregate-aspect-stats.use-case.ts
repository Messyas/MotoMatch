import type { Clock } from "../../../shared/time/clock";
import type { Logger } from "../../../shared/logging/logger";
import type { ReviewsApi } from "../../reviews";
import type { SentimentRepository } from "../domain/sentiment.repository";

export interface AggregateAspectStatsDeps {
  readonly reviewsApi: ReviewsApi;
  readonly sentimentRepository: SentimentRepository;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface AggregateAspectStatsInput {
  readonly limit?: number;
}

export interface AggregateAspectStatsResult {
  readonly aggregatedReviewsCount: number;
}

const DEFAULT_LIMIT = 100;

export class AggregateAspectStatsUseCase {
  constructor(private readonly deps: AggregateAspectStatsDeps) {}

  async execute(
    input: AggregateAspectStatsInput = {},
  ): Promise<AggregateAspectStatsResult> {
    const now = this.deps.clock.now();
    const limit = input.limit ?? DEFAULT_LIMIT;

    const unaggregated =
      await this.deps.reviewsApi.findUnaggregatedAnalyzedReviews(limit);

    let aggregatedCount = 0;

    for (const review of unaggregated) {
      // Atomic idempotency barrier (ARQUITETURA §16.3)
      // Only returns true if the review was not yet marked aggregated
      const marked = await this.deps.reviewsApi.markReviewAggregated(
        review.id,
        now,
      );

      if (!marked) {
        continue; // Already aggregated concurrently, do not increment
      }

      const aspects = await this.deps.sentimentRepository.findAspectsByReviewId(
        review.id,
      );

      // Video phase weighting (PLANO_ATUALIZACAO §4.3)
      let phaseWeight = 1.0;
      if (review.videoPhase === "long") {
        phaseWeight = 1.25;
      } else if (review.videoPhase === "mid") {
        phaseWeight = 1.1;
      }

      for (const a of aspects) {
        const weight = Number((phaseWeight * a.confidence).toFixed(2));
        await this.deps.sentimentRepository.incrementDeviceAspectStats({
          deviceId: review.deviceId,
          aspect: a.aspect,
          sumW: weight,
          sumWx: Number((weight * a.score).toFixed(2)),
          count: 1,
          now,
        });
      }

      aggregatedCount++;
    }

    if (aggregatedCount > 0) {
      this.deps.logger.info("sentiment.stats_aggregated", {
        aggregatedCount,
      });
    }

    return { aggregatedReviewsCount: aggregatedCount };
  }
}
