import type { Clock } from "../../shared/time/clock";
import type { Logger } from "../../shared/logging/logger";
import type { EventBus } from "../../shared/events/event-bus";
import type { DatabaseClient } from "../../shared/db/client";
import { PostgresAnalyticsRepository } from "./infrastructure/postgres-analytics.repository";
import { InMemoryAnalyticsRepository } from "./infrastructure/in-memory-analytics.repository";
import { RecordFeedbackUseCase } from "./application/record-feedback.use-case";
import { RecordSearchUseCase } from "./application/record-search.use-case";
import { RollupDailyMetricsUseCase } from "./application/rollup-daily-metrics.use-case";
import { RetentionSweepUseCase } from "./application/retention-sweep.use-case";
import { AnalyticsRollupJob } from "./jobs/analytics-rollup.job";
import { RetentionSweepJob } from "./jobs/retention-sweep.job";
import { createAnalyticsRoutes } from "./http/analytics.routes";
import {
  computeCollectiveBonus,
  type CollectiveBonusOptions,
} from "./domain/thompson-sampling";
import type {
  AnalyticsRepository,
  FeedbackKind,
  UsageDashboardResult,
} from "./domain/analytics.repository";

export interface AnalyticsModuleDeps {
  readonly db?: DatabaseClient;
  readonly repository?: AnalyticsRepository;
  readonly eventBus?: EventBus;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface AnalyticsApi {
  recordSearch(input: {
    sessionId: string;
    intentSig: string;
    criteria?: Record<string, unknown>;
    discarded?: Record<string, unknown>;
    resultIds: string[];
  }): Promise<void>;
  recordFeedback(input: {
    sessionId: string;
    deviceId: string;
    intentSig: string;
    kind: FeedbackKind;
  }): Promise<{ recorded: boolean }>;
  getCollectiveBonus(
    deviceId: string,
    intentSig: string,
    options?: Partial<CollectiveBonusOptions>,
  ): Promise<number>;
  getUsageDashboard(days?: number): Promise<UsageDashboardResult>;
}

export function createAnalyticsModule(deps: AnalyticsModuleDeps) {
  const repository: AnalyticsRepository =
    deps.repository ??
    (deps.db
      ? new PostgresAnalyticsRepository(deps.db)
      : new InMemoryAnalyticsRepository());

  const recordFeedbackUseCase = new RecordFeedbackUseCase({
    analyticsRepository: repository,
    eventBus: deps.eventBus,
    clock: deps.clock,
    logger: deps.logger,
  });

  const recordSearchUseCase = new RecordSearchUseCase({
    analyticsRepository: repository,
    clock: deps.clock,
    logger: deps.logger,
  });

  const rollupUseCase = new RollupDailyMetricsUseCase({
    analyticsRepository: repository,
    clock: deps.clock,
    logger: deps.logger,
  });

  const sweepUseCase = new RetentionSweepUseCase({
    analyticsRepository: repository,
    clock: deps.clock,
    logger: deps.logger,
  });

  const routes = createAnalyticsRoutes({
    recordFeedbackUseCase,
    analyticsRepository: repository,
  });

  const jobs = [
    new AnalyticsRollupJob(rollupUseCase),
    new RetentionSweepJob(sweepUseCase),
  ];

  const api: AnalyticsApi = {
    recordSearch: (input) => recordSearchUseCase.execute(input),
    recordFeedback: (input) => recordFeedbackUseCase.execute(input),
    getCollectiveBonus: async (deviceId, intentSig, options = {}) => {
      const score = await repository.getCollectiveScore(deviceId, intentSig);
      if (!score) return 0.0;
      return computeCollectiveBonus({
        alpha: score.alpha,
        beta: score.beta,
        epsilon: options.epsilon,
        useExpectedValue: options.useExpectedValue,
      });
    },
    getUsageDashboard: (days) => repository.getUsageDashboard(days),
  };

  return {
    routes,
    api,
    repository,
    jobs,
  };
}

