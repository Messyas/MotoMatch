import type {
  JobRunContext,
  JobRunResult,
  JobState,
  ScheduledJob,
} from "../../scheduler";
import type { RollupDailyMetricsUseCase } from "../application/rollup-daily-metrics.use-case";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export class AnalyticsRollupJob implements ScheduledJob {
  readonly name = "analytics_rollup";

  constructor(
    private readonly rollupUseCase: RollupDailyMetricsUseCase,
  ) {}

  nextDueAt(_state: JobState | null, now: Date): Date {
    return new Date(now.getTime() + TWENTY_FOUR_HOURS_MS);
  }

  async run(_context: JobRunContext): Promise<JobRunResult> {
    const result = await this.rollupUseCase.execute();
    return {
      status: "ok",
      summary: result,
    };
  }
}

