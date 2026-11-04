export {
  ALL_ASPECTS,
  DEFAULT_ASPECT_PRIORS,
  DEFAULT_ASPECT_WEIGHTS,
  DEFAULT_SPEC_VS_OPINION_LAMBDAS,
  normalizeWeights,
  type Aspect,
  type AspectWeights,
} from "./domain/aspect";
export {
  applyHardConstraints,
  type HardConstraint,
  type HardConstraintsResult,
} from "./domain/hard-constraints";
export {
  applyParetoFilter,
  type ParetoDroppedItem,
  type ParetoResult,
  type ScoredCandidate,
} from "./domain/pareto-filter";
export {
  applyCritiqueRule,
  type ApplyCritiqueInput,
  type CritiqueAction,
} from "./domain/critique-rules";
export {
  aRecommendationQuery,
  RecommendationQueryBuilder,
  type RecommendationQuery,
} from "./domain/recommendation-query.builder";
export {
  computeCatalogStats,
  computePercentile,
  computeSpecScore,
  type CatalogStats,
} from "./domain/percentile-normalizer";
export {
  scoreDeviceMaut,
  type AspectScoreDetail,
  type MautScorerInput,
  type ScoredDeviceResult,
} from "./domain/maut-scorer";
export {
  scoreProcessor,
  type ProcessorTierRule,
} from "./domain/processor-tiers";
export {
  RecommendUseCase,
  type RecommendationResult,
  type RecommendUseCaseDeps,
} from "./application/recommend.use-case";
export {
  createRecommenderModule,
  type RecommenderApi,
  type RecommenderModuleDeps,
} from "./recommender.module";
