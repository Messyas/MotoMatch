export {
  createReviewsModule,
  type ReviewsApi,
  type ReviewsModuleDeps,
} from "./reviews.module";

export {
  type Review,
  type ReviewProvider,
  type ReviewStatus,
  type VideoPhase,
  type ReviewSourceLink,
  createReview,
} from "./domain/review";

export {
  evaluateComment,
  type CommentVerdict,
} from "./domain/relevance-filter";

export {
  normalizeText,
  findAspects,
} from "./domain/text-normalizer";

export {
  type ReviewRepository,
  type AcquireBatchOptions,
} from "./domain/review.repository";

export { InMemoryReviewRepository } from "./infrastructure/in-memory-review.repository";
export { PostgresReviewRepository } from "./infrastructure/postgres-review.repository";
export {
  reviews as reviewsTable,
  reviewSourceLinks as reviewSourceLinksTable,
  reviewAspects as reviewAspectsTable,
  deviceAspectStats as deviceAspectStatsTable,
  reviewAspects,
  deviceAspectStats,
} from "./infrastructure/reviews.schema";
