import type { Clock } from "../../../shared/time/clock";
import type { Logger } from "../../../shared/logging/logger";
import type {
  AnalyticsRepository,
  RetentionSweepResult,
} from "../domain/analytics.repository";

export interface RetentionSweepDeps {
  readonly analyticsRepository: AnalyticsRepository;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly defaultRetentionDays?: number;
}

const DEFAULT_RETENTION_DAYS = 30;

export class RetentionSweepUseCase {
  private readonly retentionDays: number;

  constructor(private readonly deps: RetentionSweepDeps) {
    this.retentionDays = deps.defaultRetentionDays ?? DEFAULT_RETENTION_DAYS;
  }

  async execute(): Promise<RetentionSweepResult> {
    const now = this.deps.clock.now();
    const result = await this.deps.analyticsRepository.runRetentionSweep({
      retentionDays: this.retentionDays,
      now,
    });

    this.deps.logger.info("analytics.retention_sweep_completed", {
      deletedSearches: result.deletedSearches,
      deletedFeedbacks: result.deletedFeedbacks,
      decayedScores: result.decayedCollectiveScores,
    });

    return result;
  }
}

