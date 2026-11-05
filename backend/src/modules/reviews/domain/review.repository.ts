import type {
  Review,
  ReviewProvider,
  ReviewSourceLink,
} from "./review";

export interface AcquireBatchOptions {
  readonly batchSize: number;
  readonly leaseDurationMs: number;
  readonly now: Date;
}

export interface MarkAnalyzedOptions {
  readonly reviewId: string;
  readonly now: Date;
}

export interface MarkFailedOptions {
  readonly reviewId: string;
  readonly errorCode: string;
  readonly errorMessage: string;
  readonly nextAttemptAt: Date;
}

export interface ReviewRepository {
  saveReviews(reviews: Review[]): Promise<{ insertedCount: number }>;
  findSourceLinksDue(now: Date, limit: number): Promise<ReviewSourceLink[]>;
  saveSourceLink(link: ReviewSourceLink): Promise<void>;
  updateSourceLink(link: ReviewSourceLink): Promise<void>;
  findSourceLink(
    provider: ReviewProvider,
    externalRef: string,
  ): Promise<ReviewSourceLink | null>;
  acquirePendingReviewsBatch(options: AcquireBatchOptions): Promise<Review[]>;
  markReviewAnalyzed(options: MarkAnalyzedOptions): Promise<void>;
  markReviewIrrelevant(reviewId: string): Promise<void>;
  markReviewFailed(options: MarkFailedOptions): Promise<void>;
  findUnaggregatedAnalyzedReviews(limit: number): Promise<Review[]>;
  markReviewAggregated(reviewId: string, now: Date): Promise<boolean>;
  countByStatus(): Promise<Record<string, number>>;
}
