export {
  createSentimentModule,
  type SentimentApi,
  type SentimentModuleDeps,
  type DeviceAspectOpinion,
} from "./sentiment.module";

export {
  type AspectAccumulator,
  type BayesianConfig,
  DEFAULT_BAYESIAN_CONFIG,
  calculatePosterior,
  posteriorToUtility,
  calculateConfidence,
} from "./domain/bayesian-accumulator";

export {
  type ReviewAspect,
  type SentimentPolarity,
  type SentimentAnalyzer,
} from "./domain/sentiment-analyzer";

export { RuleBasedSentimentAnalyzer } from "./domain/rule-based-sentiment-analyzer";
export { InMemorySentimentRepository } from "./infrastructure/in-memory-sentiment.repository";
export { PostgresSentimentRepository } from "./infrastructure/postgres-sentiment.repository";
export {
  type SentimentRepository,
  type IncrementDeviceAspectStatsInput,
} from "./domain/sentiment.repository";
