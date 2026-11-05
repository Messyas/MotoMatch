import type { ReviewProvider, ReviewSourceLink, VideoPhase } from "./review";

export interface RawReview {
  readonly externalRef: string;
  readonly authorHash?: string | null;
  readonly rating?: number | null;
  readonly content: string;
  readonly publishedAt?: Date | null;
  readonly videoPhase?: VideoPhase;
  readonly daysSinceLaunch?: number | null;
}

export interface ReviewSourceCollectResult {
  readonly reviews: RawReview[];
  readonly nextCursor?: string | null;
}

export interface ReviewSource {
  readonly provider: ReviewProvider;
  collect(
    link: ReviewSourceLink,
    budgetCount?: number,
  ): Promise<ReviewSourceCollectResult>;
}
