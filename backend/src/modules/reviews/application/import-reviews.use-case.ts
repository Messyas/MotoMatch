import type { Clock } from "../../../shared/time/clock";
import type { Logger } from "../../../shared/logging/logger";
import type { ReviewRepository } from "../domain/review.repository";
import {
  createReview,
  type Review,
  type ReviewProvider,
} from "../domain/review";
import { evaluateComment } from "../domain/relevance-filter";

export interface ImportReviewsDeps {
  readonly reviewRepository: ReviewRepository;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface ImportReviewItem {
  readonly deviceId: string;
  readonly content: string;
  readonly provider?: ReviewProvider;
  readonly externalRef?: string;
  readonly rating?: number;
  readonly publishedAt?: Date;
}

export interface ImportReviewsInput {
  readonly items: readonly ImportReviewItem[];
}

export interface ImportReviewsResult {
  readonly total: number;
  readonly relevant: number;
  readonly inserted: number;
}

export class ImportReviewsUseCase {
  constructor(private readonly deps: ImportReviewsDeps) {}

  async execute(input: ImportReviewsInput): Promise<ImportReviewsResult> {
    const now = this.deps.clock.now();
    let relevantCount = 0;
    const domainReviews: Review[] = [];

    for (const item of input.items) {
      const verdict = evaluateComment(item.content);
      const isRelevant = verdict.isRelevant;
      if (isRelevant) relevantCount++;

      const provider = item.provider ?? "manual";
      const externalRef =
        item.externalRef ??
        `import-${provider}-${crypto.randomUUID().slice(0, 8)}`;

      domainReviews.push(
        createReview(
          {
            deviceId: item.deviceId,
            provider,
            externalRef,
            rating: item.rating,
            content: item.content,
            publishedAt: item.publishedAt,
            status: isRelevant ? "pending" : "irrelevant",
          },
          { now },
        ),
      );
    }

    const { insertedCount } = await this.deps.reviewRepository.saveReviews(
      domainReviews,
    );

    this.deps.logger.info("reviews.imported", {
      total: input.items.length,
      relevant: relevantCount,
      inserted: insertedCount,
    });

    return {
      total: input.items.length,
      relevant: relevantCount,
      inserted: insertedCount,
    };
  }
}
