import type {
  JobRunContext,
  JobRunResult,
  JobState,
  ScheduledJob,
} from "../../scheduler";
import type { ReviewsApi } from "../reviews.module";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export class CollectReviewsJob implements ScheduledJob {
  readonly name = "collect_reviews";

  constructor(private readonly reviewsApi: ReviewsApi) {}

  nextDueAt(_state: JobState | null, now: Date): Date {
    return new Date(now.getTime() + SIX_HOURS_MS);
  }

  async run(context: JobRunContext): Promise<JobRunResult> {
    const dueLinks = await this.reviewsApi.findDueLinks(context.now, 10);
    let collectedCount = 0;

    for (const link of dueLinks) {
      if (context.deadline.isExpired()) {
        return {
          status: "partial",
          summary: { collectedLinks: collectedCount, remaining: dueLinks.length - collectedCount },
        };
      }

      try {
        await this.reviewsApi.collectReviews(link);
        collectedCount++;
      } catch {
        // Logged inside use case; continue to next link
      }
    }

    return {
      status: "ok",
      summary: { collectedLinks: collectedCount, totalDue: dueLinks.length },
    };
  }
}

