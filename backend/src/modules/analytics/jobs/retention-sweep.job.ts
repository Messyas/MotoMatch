import type {
  JobRunContext,
  JobRunResult,
  JobState,
  ScheduledJob,
} from "../../scheduler";
import type { RetentionSweepUseCase } from "../application/retention-sweep.use-case";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export class RetentionSweepJob implements ScheduledJob {
  readonly name = "retention_sweep";

  constructor(
    private readonly sweepUseCase: RetentionSweepUseCase,
  ) {}

  nextDueAt(_state: JobState | null, now: Date): Date {
    return new Date(now.getTime() + TWENTY_FOUR_HOURS_MS);
  }

  async run(_context: JobRunContext): Promise<JobRunResult> {
    const result = await this.sweepUseCase.execute();
    return {
      status: "ok",
      summary: result as unknown as Record<string, unknown>,
    };
  }
}
