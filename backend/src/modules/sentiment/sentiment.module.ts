import type { Clock } from "../../shared/time/clock";
import type { Logger } from "../../shared/logging/logger";
import type { DatabaseClient } from "../../shared/db/client";
import type { ReviewsApi } from "../reviews";
import { PostgresSentimentRepository } from "./infrastructure/postgres-sentiment.repository";
import { InMemorySentimentRepository } from "./infrastructure/in-memory-sentiment.repository";
import { GeminiSentimentAnalyzer } from "./infrastructure/gemini-sentiment-analyzer";
import { RuleBasedSentimentAnalyzer } from "./domain/rule-based-sentiment-analyzer";
import { AnalyzePendingReviewsJob } from "./jobs/analyze-pending-reviews.job";
import { AggregateStatsJob } from "./jobs/aggregate-stats.job";
import { AnalyzePendingReviewsUseCase } from "./application/analyze-pending-reviews.use-case";
import { AggregateAspectStatsUseCase } from "./application/aggregate-aspect-stats.use-case";
import {
  calculateConfidence,
  calculatePosterior,
  posteriorToUtility,
  type AspectAccumulator,
  type BayesianConfig,
  DEFAULT_BAYESIAN_CONFIG,
} from "./domain/bayesian-accumulator";
import type { SentimentRepository } from "./domain/sentiment.repository";
import type { SentimentAnalyzer } from "./domain/sentiment-analyzer";
import type { ReviewAspectType } from "../../locales/pt-BR/review-vocabulary";

export interface SentimentModuleDeps {
  readonly db?: DatabaseClient;
  readonly repository?: SentimentRepository;
  readonly reviewsApi: ReviewsApi;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly geminiApiKey?: string;
  readonly geminiModel?: string;
  readonly bayesianConfig?: BayesianConfig;
}

export interface DeviceAspectOpinion {
  readonly aspect: ReviewAspectType;
  readonly posteriorMean: number; // 1 to 5
  readonly utility: number; // 0.0 to 1.0
  readonly confidence: number; // 0.0 to 1.0
  readonly sampleSize: number;
}

export interface SentimentApi {
  analyzePending(options?: {
    batchSize?: number;
    leaseDurationMs?: number;
  }): Promise<{ processedCount: number; aspectsExtractedCount: number }>;
  aggregateStats(options?: {
    limit?: number;
  }): Promise<{ aggregatedReviewsCount: number }>;
  getDeviceAspectStats(
    deviceId: string,
  ): Promise<Map<string, AspectAccumulator>>;
  getDeviceAspectOpinions(
    deviceId: string,
  ): Promise<Record<string, DeviceAspectOpinion>>;
  getDeviceAspectScores(
    deviceId: string,
  ): Promise<Partial<Record<ReviewAspectType, number>>>;
}

export function createSentimentModule(deps: SentimentModuleDeps) {
  const repository: SentimentRepository =
    deps.repository ??
    (deps.db
      ? new PostgresSentimentRepository(deps.db)
      : new InMemorySentimentRepository());

  const analyzer: SentimentAnalyzer = deps.geminiApiKey
    ? new GeminiSentimentAnalyzer({
        apiKey: deps.geminiApiKey,
        model: deps.geminiModel,
        fallbackAnalyzer: new RuleBasedSentimentAnalyzer(),
      })
    : new RuleBasedSentimentAnalyzer();

  const analyzeUseCase = new AnalyzePendingReviewsUseCase({
    reviewsApi: deps.reviewsApi,
    sentimentRepository: repository,
    sentimentAnalyzer: analyzer,
    clock: deps.clock,
    logger: deps.logger,
  });

  const aggregateUseCase = new AggregateAspectStatsUseCase({
    reviewsApi: deps.reviewsApi,
    sentimentRepository: repository,
    clock: deps.clock,
    logger: deps.logger,
  });

  const bayesianConfig = deps.bayesianConfig ?? DEFAULT_BAYESIAN_CONFIG;

  const api: SentimentApi = {
    analyzePending: (options) => analyzeUseCase.execute(options),
    aggregateStats: (options) => aggregateUseCase.execute(options),
    getDeviceAspectStats: (deviceId) =>
      repository.findDeviceAspectStats(deviceId),
    getDeviceAspectOpinions: async (deviceId) => {
      const statsMap = await repository.findDeviceAspectStats(deviceId);
      const opinions: Record<string, DeviceAspectOpinion> = {};

      for (const [aspect, stats] of statsMap.entries()) {
        const posteriorMean = calculatePosterior(stats, bayesianConfig);
        const utility = posteriorToUtility(posteriorMean);
        const confidence = calculateConfidence(stats.n);

        opinions[aspect] = {
          aspect: aspect as ReviewAspectType,
          posteriorMean,
          utility,
          confidence,
          sampleSize: stats.n,
        };
      }

      return opinions;
    },
    getDeviceAspectScores: async (deviceId) => {
      const statsMap = await repository.findDeviceAspectStats(deviceId);
      const scores: Partial<Record<ReviewAspectType, number>> = {};

      for (const [aspect, stats] of statsMap.entries()) {
        const posteriorMean = calculatePosterior(stats, bayesianConfig);
        scores[aspect as ReviewAspectType] = posteriorToUtility(posteriorMean);
      }

      return scores;
    },
  };

  return {
    api,
    repository,
    jobs: [new AnalyzePendingReviewsJob(api), new AggregateStatsJob(api)],
  };
}

