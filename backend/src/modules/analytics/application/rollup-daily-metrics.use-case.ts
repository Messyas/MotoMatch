import type { Clock } from "../../../shared/time/clock";
import type { Logger } from "../../../shared/logging/logger";
import type { AnalyticsRepository } from "../domain/analytics.repository";

export interface RollupDailyMetricsDeps {
  readonly analyticsRepository: AnalyticsRepository;
  readonly clock: Clock;
  readonly logger: Logger;
}

export class RollupDailyMetricsUseCase {
  constructor(private readonly deps: RollupDailyMetricsDeps) {}

  async execute(day?: string): Promise<{ day: string; rollupsCount: number }> {
    const targetDay = day ?? this.deps.clock.todayUtcString();
    const count = await this.deps.analyticsRepository.runDailyRollups(targetDay);

    this.deps.logger.info("analytics.rollup_completed", {
      day: targetDay,
      count,
    });

    return { day: targetDay, rollupsCount: count };
  }
}

