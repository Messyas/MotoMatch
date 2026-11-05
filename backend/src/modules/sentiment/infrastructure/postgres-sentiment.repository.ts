import { eq, sql } from "drizzle-orm";
import type { DatabaseClient } from "../../../shared/db/client";
import type { AspectAccumulator } from "../domain/bayesian-accumulator";
import type {
  ReviewAspect,
  SentimentPolarity,
} from "../domain/sentiment-analyzer";
import type {
  IncrementDeviceAspectStatsInput,
  SentimentRepository,
} from "../domain/sentiment.repository";
import {
  deviceAspectStatsTable,
  reviewAspectsTable,
} from "../../reviews";
import type { ReviewAspectType } from "../../../locales/pt-BR/review-vocabulary";

export class PostgresSentimentRepository implements SentimentRepository {
  constructor(private readonly db: DatabaseClient) {}

  async saveAspects(aspects: ReviewAspect[]): Promise<void> {
    if (aspects.length === 0) return;

    const rows = aspects.map((a) => ({
      reviewId: a.reviewId,
      aspect: a.aspect,
      score: a.score,
      sentiment: a.sentiment,
      confidence: a.confidence,
    }));

    await this.db
      .insert(reviewAspectsTable)
      .values(rows)
      .onConflictDoUpdate({
        target: [reviewAspectsTable.reviewId, reviewAspectsTable.aspect],
        set: {
          score: sql`excluded.score`,
          sentiment: sql`excluded.sentiment`,
          confidence: sql`excluded.confidence`,
        },
      });
  }

  async findAspectsByReviewId(reviewId: string): Promise<ReviewAspect[]> {
    const rows = await this.db
      .select()
      .from(reviewAspectsTable)
      .where(eq(reviewAspectsTable.reviewId, reviewId));

    return rows.map((r: typeof reviewAspectsTable.$inferSelect) => ({
      reviewId: r.reviewId,
      aspect: r.aspect as ReviewAspectType,
      score: r.score,
      sentiment: r.sentiment as SentimentPolarity,
      confidence: r.confidence,
    }));
  }

  async incrementDeviceAspectStats(
    input: IncrementDeviceAspectStatsInput,
  ): Promise<void> {
    await this.db
      .insert(deviceAspectStatsTable)
      .values({
        deviceId: input.deviceId,
        aspect: input.aspect,
        sumW: input.sumW,
        sumWx: input.sumWx,
        n: input.count,
        updatedAt: input.now,
      })
      .onConflictDoUpdate({
        target: [
          deviceAspectStatsTable.deviceId,
          deviceAspectStatsTable.aspect,
        ],
        set: {
          sumW: sql`${deviceAspectStatsTable.sumW} + excluded.sum_w`,
          sumWx: sql`${deviceAspectStatsTable.sumWx} + excluded.sum_wx`,
          n: sql`${deviceAspectStatsTable.n} + excluded.n`,
          updatedAt: input.now,
        },
      });
  }

  async findDeviceAspectStats(
    deviceId: string,
  ): Promise<Map<string, AspectAccumulator>> {
    const rows = await this.db
      .select()
      .from(deviceAspectStatsTable)
      .where(eq(deviceAspectStatsTable.deviceId, deviceId));

    const map = new Map<string, AspectAccumulator>();
    for (const r of rows) {
      map.set(r.aspect, {
        sumW: r.sumW,
        sumWx: r.sumWx,
        n: r.n,
      });
    }

    return map;
  }

  async recalculateDeviceAspectStats(deviceId?: string): Promise<void> {
    // Weekly reconciliation job (ARQUITETURA §16.3)
    if (deviceId) {
      await this.db
        .delete(deviceAspectStatsTable)
        .where(eq(deviceAspectStatsTable.deviceId, deviceId));
    } else {
      await this.db.delete(deviceAspectStatsTable);
    }
  }
}
