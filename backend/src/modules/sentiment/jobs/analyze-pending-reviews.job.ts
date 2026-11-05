import type {
  JobRunContext,
  JobRunResult,
  JobState,
  ScheduledJob,
} from "../../scheduler";
import type { SentimentApi } from "../sentiment.module";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export class AnalyzePendingReviewsJob implements ScheduledJob {
  readonly name = "analyze_pending_reviews";

  constructor(private readonly sentimentApi: SentimentApi) {}

  nextDueAt(_state: JobState | null, now: Date): Date {
    return new Date(now.getTime() + TWO_HOURS_MS);
  }

  async run(_context: JobRunContext): Promise<JobRunResult> {
    const result = await this.sentimentApi.analyzePending({ batchSize: 20 });
    return {
      status: "ok",
      summary: result,
    };
  }
}
