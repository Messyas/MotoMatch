import type {
  JobRunContext,
  JobRunResult,
  JobState,
  ScheduledJob,
} from "../../scheduler";
import type { EmbedPendingReviewsUseCase } from "../application/embed-pending-reviews.use-case";

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export class EmbedPendingJob implements ScheduledJob {
  readonly name = "embed_pending";

  constructor(
    private readonly embedPendingReviewsUseCase: EmbedPendingReviewsUseCase,
  ) {}

  nextDueAt(_state: JobState | null, now: Date): Date {
    return new Date(now.getTime() + THIRTY_MINUTES_MS);
  }

  async run(_context: JobRunContext): Promise<JobRunResult> {
    const result = await this.embedPendingReviewsUseCase.execute();

    return {
      status: "ok",
      summary: {
        processedReviews: result.processedReviews,
        snippetsSaved: result.snippetsSaved,
        snippetsPruned: result.snippetsPruned,
      },
    };
  }
}
