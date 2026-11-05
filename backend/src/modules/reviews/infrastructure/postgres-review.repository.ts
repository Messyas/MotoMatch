import { and, eq, isNull, lte, lt, or, sql } from "drizzle-orm";
import type { DatabaseClient } from "../../../shared/db/client";
import type {
  AcquireBatchOptions,
  MarkAnalyzedOptions,
  MarkFailedOptions,
  ReviewRepository,
} from "../domain/review.repository";
import type {
  Review,
  ReviewProvider,
  ReviewSourceLink,
  ReviewStatus,
  VideoPhase,
} from "../domain/review";
import {
  reviews as reviewsTable,
  reviewSourceLinks as reviewSourceLinksTable,
} from "./reviews.schema";

export class PostgresReviewRepository implements ReviewRepository {
  constructor(private readonly db: DatabaseClient) {}

  async saveReviews(reviews: Review[]): Promise<{ insertedCount: number }> {
    if (reviews.length === 0) return { insertedCount: 0 };

    const rows = reviews.map((r) => ({
      id: r.id,
      deviceId: r.deviceId,
      provider: r.provider,
      externalRef: r.externalRef,
      authorHash: r.authorHash,
      rating: r.rating,
      content: r.content,
      publishedAt: r.publishedAt,
      videoPhase: r.videoPhase,
      daysSinceLaunch: r.daysSinceLaunch,
      status: r.status,
      leaseUntil: r.leaseUntil,
      attempts: r.attempts,
      nextAttemptAt: r.nextAttemptAt,
      analyzedAt: r.analyzedAt,
      aggregatedAt: r.aggregatedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    const result = await this.db
      .insert(reviewsTable)
      .values(rows)
      .onConflictDoNothing({
        target: [reviewsTable.provider, reviewsTable.externalRef],
      })
      .returning({ id: reviewsTable.id });

    return { insertedCount: result.length };
  }

  async findSourceLinksDue(
    now: Date,
    limit: number,
  ): Promise<ReviewSourceLink[]> {
    const rows = await this.db
      .select()
      .from(reviewSourceLinksTable)
      .where(lte(reviewSourceLinksTable.nextDueAt, now))
      .limit(limit);

    return rows.map((r: typeof reviewSourceLinksTable.$inferSelect) => ({
      id: r.id,
      deviceId: r.deviceId,
      provider: r.provider as ReviewProvider,
      externalRef: r.externalRef,
      cursor: r.cursor,
      nextDueAt: r.nextDueAt,
      intervalDays: r.intervalDays,
      lastNewCount: r.lastNewCount,
    }));
  }

  async saveSourceLink(link: ReviewSourceLink): Promise<void> {
    await this.db.insert(reviewSourceLinksTable).values({
      id: link.id,
      deviceId: link.deviceId,
      provider: link.provider,
      externalRef: link.externalRef,
      cursor: link.cursor,
      nextDueAt: link.nextDueAt,
      intervalDays: link.intervalDays,
      lastNewCount: link.lastNewCount,
    });
  }

  async updateSourceLink(link: ReviewSourceLink): Promise<void> {
    await this.db
      .update(reviewSourceLinksTable)
      .set({
        cursor: link.cursor,
        nextDueAt: link.nextDueAt,
        intervalDays: link.intervalDays,
        lastNewCount: link.lastNewCount,
      })
      .where(eq(reviewSourceLinksTable.id, link.id));
  }

  async findSourceLink(
    provider: ReviewProvider,
    externalRef: string,
  ): Promise<ReviewSourceLink | null> {
    const rows = await this.db
      .select()
      .from(reviewSourceLinksTable)
      .where(
        and(
          eq(reviewSourceLinksTable.provider, provider),
          eq(reviewSourceLinksTable.externalRef, externalRef),
        ),
      )
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      id: r.id,
      deviceId: r.deviceId,
      provider: r.provider as ReviewProvider,
      externalRef: r.externalRef,
      cursor: r.cursor,
      nextDueAt: r.nextDueAt,
      intervalDays: r.intervalDays,
      lastNewCount: r.lastNewCount,
    };
  }

  async acquirePendingReviewsBatch(
    options: AcquireBatchOptions,
  ): Promise<Review[]> {
    const { batchSize, leaseDurationMs, now } = options;
    const leaseUntil = new Date(now.getTime() + leaseDurationMs);

    const candidates = await this.db
      .select()
      .from(reviewsTable)
      .where(
        or(
          eq(reviewsTable.status, "pending"),
          and(
            eq(reviewsTable.status, "analyzing"),
            lt(reviewsTable.leaseUntil, now),
          ),
        ),
      )
      .limit(batchSize);

    if (candidates.length === 0) return [];

    const acquired: Review[] = [];
    for (const c of candidates) {
      await this.db
        .update(reviewsTable)
        .set({
          status: "analyzing",
          leaseUntil,
          attempts: c.attempts + 1,
          updatedAt: now,
        })
        .where(eq(reviewsTable.id, c.id));

      acquired.push({
        id: c.id,
        deviceId: c.deviceId,
        provider: c.provider as ReviewProvider,
        externalRef: c.externalRef,
        authorHash: c.authorHash,
        rating: c.rating,
        content: c.content,
        publishedAt: c.publishedAt,
        videoPhase: c.videoPhase as VideoPhase,
        daysSinceLaunch: c.daysSinceLaunch,
        status: "analyzing",
        leaseUntil,
        attempts: c.attempts + 1,
        nextAttemptAt: c.nextAttemptAt,
        errorCode: c.errorCode,
        errorMessage: c.errorMessage,
        analyzedAt: c.analyzedAt,
        aggregatedAt: c.aggregatedAt,
        contentPurgedAt: c.contentPurgedAt,
        createdAt: c.createdAt,
        updatedAt: now,
      });
    }

    return acquired;
  }

  async markReviewAnalyzed(options: MarkAnalyzedOptions): Promise<void> {
    await this.db
      .update(reviewsTable)
      .set({
        status: "analyzed",
        leaseUntil: null,
        analyzedAt: options.now,
        updatedAt: options.now,
      })
      .where(eq(reviewsTable.id, options.reviewId));
  }

  async markReviewIrrelevant(reviewId: string): Promise<void> {
    await this.db
      .update(reviewsTable)
      .set({
        status: "irrelevant",
        leaseUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(reviewsTable.id, reviewId));
  }

  async markReviewFailed(options: MarkFailedOptions): Promise<void> {
    await this.db
      .update(reviewsTable)
      .set({
        status: "failed",
        leaseUntil: null,
        errorCode: options.errorCode,
        errorMessage: options.errorMessage,
        nextAttemptAt: options.nextAttemptAt,
        updatedAt: new Date(),
      })
      .where(eq(reviewsTable.id, options.reviewId));
  }

  async findUnaggregatedAnalyzedReviews(limit: number): Promise<Review[]> {
    const rows = await this.db
      .select()
      .from(reviewsTable)
      .where(
        and(
          eq(reviewsTable.status, "analyzed"),
          isNull(reviewsTable.aggregatedAt),
        ),
      )
      .limit(limit);

    return rows.map((r: typeof reviewsTable.$inferSelect) => ({
      id: r.id,
      deviceId: r.deviceId,
      provider: r.provider as ReviewProvider,
      externalRef: r.externalRef,
      authorHash: r.authorHash,
      rating: r.rating,
      content: r.content,
      publishedAt: r.publishedAt,
      videoPhase: r.videoPhase as VideoPhase,
      daysSinceLaunch: r.daysSinceLaunch,
      status: r.status as ReviewStatus,
      leaseUntil: r.leaseUntil,
      attempts: r.attempts,
      nextAttemptAt: r.nextAttemptAt,
      errorCode: r.errorCode,
      errorMessage: r.errorMessage,
      analyzedAt: r.analyzedAt,
      aggregatedAt: r.aggregatedAt,
      contentPurgedAt: r.contentPurgedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async markReviewAggregated(reviewId: string, now: Date): Promise<boolean> {
    const result = await this.db
      .update(reviewsTable)
      .set({
        aggregatedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(reviewsTable.id, reviewId),
          isNull(reviewsTable.aggregatedAt),
        ),
      )
      .returning({ id: reviewsTable.id });

    return result.length > 0;
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.db
      .select({
        status: reviewsTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(reviewsTable)
      .groupBy(reviewsTable.status);

    const counts: Record<string, number> = {};
    for (const r of rows) {
      counts[r.status] = r.count;
    }
    return counts;
  }
}
