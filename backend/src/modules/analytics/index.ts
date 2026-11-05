export {
  createAnalyticsModule,
  type AnalyticsApi,
  type AnalyticsModuleDeps,
} from "./analytics.module";

export {
  computeIntentSignature,
  type IntentCriteriaInput,
} from "./domain/intent-signature";

export {
  sampleBeta,
  expectedBetaValue,
  computeCollectiveBonus,
  type CollectiveBonusOptions,
} from "./domain/thompson-sampling";

export {
  type SearchEvent,
  type FeedbackEvent,
  type FeedbackKind,
  type CollectiveScore,
  type DailyRollup,
  type UsageDashboardResult,
  type RetentionSweepResult,
  type AnalyticsRepository,
} from "./domain/analytics.repository";

export { InMemoryAnalyticsRepository } from "./infrastructure/in-memory-analytics.repository";
export { PostgresAnalyticsRepository } from "./infrastructure/postgres-analytics.repository";
export {
  searchEvents as searchEventsTable,
  feedbackEvents as feedbackEventsTable,
  collectiveScores as collectiveScoresTable,
  analyticsDaily as analyticsDailyTable,
} from "./infrastructure/analytics.schema";

