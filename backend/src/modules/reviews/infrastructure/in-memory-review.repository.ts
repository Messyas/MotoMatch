import type {
  AcquireBatchOptions,
  MarkAnalyzedOptions,
  MarkFailedOptions,
  ReviewRepository,
} from "../domain/review.repository";
import type { Review, ReviewProvider, ReviewSourceLink } from "../domain/review";

export class InMemoryReviewRepository implements ReviewRepository {
  private reviews = new Map<string, Review>();
  private sourceLinks = new Map<string, ReviewSourceLink>();

  async saveReviews(reviews: Review[]): Promise<{ insertedCount: number }> {
    let inserted = 0;
    for (const r of reviews) {
      const dedupeKey = `${r.provider}:${r.externalRef}`;
      const existing = Array.from(this.reviews.values()).find(
        (it) => `${it.provider}:${it.externalRef}` === dedupeKey,
      );
      if (!existing) {
        this.reviews.set(r.id, r);
        inserted++;
      }
    }
    return { insertedCount: inserted };
  }

  async findSourceLinksDue(
    now: Date,
    limit: number,
  ): Promise<ReviewSourceLink[]> {
    return Array.from(this.sourceLinks.values())
      .filter((l) => l.nextDueAt <= now)
      .slice(0, limit);
  }

  async saveSourceLink(link: ReviewSourceLink): Promise<void> {
    this.sourceLinks.set(link.id, link);
  }

  async updateSourceLink(link: ReviewSourceLink): Promise<void> {
    this.sourceLinks.set(link.id, link);
  }

  async findSourceLink(
    provider: ReviewProvider,
    externalRef: string,
  ): Promise<ReviewSourceLink | null> {
    for (const link of this.sourceLinks.values()) {
      if (link.provider === provider && link.externalRef === externalRef) {
        return link;
      }
    }
    return null;
  }

  async acquirePendingReviewsBatch(
    options: AcquireBatchOptions,
  ): Promise<Review[]> {
    const acquired: Review[] = [];

    for (const review of this.reviews.values()) {
      if (acquired.length >= options.batchSize) break;

      const isPending = review.status === "pending";
      const isExpiredLease =
        review.status === "analyzing" &&
        review.leaseUntil !== null &&
        review.leaseUntil < options.now;

      if (isPending || isExpiredLease) {
        const leaseUntil = new Date(
          options.now.getTime() + options.leaseDurationMs,
        );
        const updated: Review = {
          ...review,
          status: "analyzing",
          leaseUntil,
          attempts: review.attempts + 1,
          updatedAt: options.now,
        };
        this.reviews.set(review.id, updated);
        acquired.push(updated);
      }
    }

    return acquired;
  }

  async markReviewAnalyzed(options: MarkAnalyzedOptions): Promise<void> {
    const existing = this.reviews.get(options.reviewId);
    if (!existing) return;

    this.reviews.set(options.reviewId, {
      ...existing,
      status: "analyzed",
      leaseUntil: null,
      analyzedAt: options.now,
      updatedAt: options.now,
    });
  }

  async markReviewIrrelevant(reviewId: string): Promise<void> {
    const existing = this.reviews.get(reviewId);
    if (!existing) return;

    this.reviews.set(reviewId, {
      ...existing,
      status: "irrelevant",
      leaseUntil: null,
      updatedAt: new Date(),
    });
  }

  async markReviewFailed(options: MarkFailedOptions): Promise<void> {
    const existing = this.reviews.get(options.reviewId);
    if (!existing) return;

    this.reviews.set(options.reviewId, {
      ...existing,
      status: "failed",
      leaseUntil: null,
      errorCode: options.errorCode,
      errorMessage: options.errorMessage,
      nextAttemptAt: options.nextAttemptAt,
      updatedAt: new Date(),
    });
  }

  async findUnaggregatedAnalyzedReviews(limit: number): Promise<Review[]> {
    return Array.from(this.reviews.values())
      .filter((r) => r.status === "analyzed" && r.aggregatedAt === null)
      .slice(0, limit);
  }

  async markReviewAggregated(reviewId: string, now: Date): Promise<boolean> {
    const existing = this.reviews.get(reviewId);
    if (!existing || existing.aggregatedAt !== null) {
      return false;
    }

    this.reviews.set(reviewId, {
      ...existing,
      aggregatedAt: now,
      updatedAt: now,
    });
    return true;
  }

  async countByStatus(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const r of this.reviews.values()) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    }
    return counts;
  }

  // Test inspection helper
  get(id: string): Review | undefined {
    return this.reviews.get(id);
  }
}
