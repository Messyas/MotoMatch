import { and, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import type { DatabaseClient } from "../../../shared/db/client";
import type {
  AnalyticsRepository,
  CollectiveScore,
  DailyRollup,
  FeedbackEvent,
  FeedbackKind,
  RetentionSweepResult,
  SearchEvent,
  UsageDashboardResult,
} from "../domain/analytics.repository";
import {
  analyticsDaily as analyticsDailyTable,
  collectiveScores as collectiveScoresTable,
  feedbackEvents as feedbackEventsTable,
  searchEvents as searchEventsTable,
} from "./analytics.schema";

export class PostgresAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly db: DatabaseClient) {}

  async recordSearchEvent(event: SearchEvent): Promise<void> {
    await this.db.insert(searchEventsTable).values({
      id: event.id,
      sessionId: event.sessionId,
      intentSig: event.intentSig,
      criteria: event.criteria,
      discarded: event.discarded,
      resultIds: event.resultIds,
      createdAt: event.createdAt,
    });
  }

  async recordFeedbackEvent(
    event: FeedbackEvent,
  ): Promise<{ recorded: boolean }> {
    const dayStart = new Date(event.createdAt);
    dayStart.setUTCHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    // Anti-abuse: 1 feedback per (sessionId, deviceId, intentSig, day)
    const existing = await this.db
      .select({ id: feedbackEventsTable.id })
      .from(feedbackEventsTable)
      .where(
        and(
          eq(feedbackEventsTable.sessionId, event.sessionId),
          eq(feedbackEventsTable.deviceId, event.deviceId),
          eq(feedbackEventsTable.intentSig, event.intentSig),
          gte(feedbackEventsTable.createdAt, dayStart),
          lt(feedbackEventsTable.createdAt, dayEnd),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return { recorded: false };
    }

    await this.db.insert(feedbackEventsTable).values({
      id: event.id,
      sessionId: event.sessionId,
      deviceId: event.deviceId,
      intentSig: event.intentSig,
      kind: event.kind,
      createdAt: event.createdAt,
    });

    return { recorded: true };
  }

  async getCollectiveScore(
    deviceId: string,
    intentSig: string,
  ): Promise<CollectiveScore | null> {
    const rows = await this.db
      .select()
      .from(collectiveScoresTable)
      .where(
        and(
          eq(collectiveScoresTable.deviceId, deviceId),
          eq(collectiveScoresTable.intentSig, intentSig),
        ),
      )
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      deviceId: r.deviceId,
      intentSig: r.intentSig,
      alpha: r.alpha,
      beta: r.beta,
      updatedAt: r.updatedAt,
    };
  }

  async incrementCollectiveScore(input: {
    deviceId: string;
    intentSig: string;
    deltaAlpha: number;
    deltaBeta: number;
    now: Date;
  }): Promise<void> {
    await this.db
      .insert(collectiveScoresTable)
      .values({
        deviceId: input.deviceId,
        intentSig: input.intentSig,
        alpha: 1.0 + input.deltaAlpha,
        beta: 1.0 + input.deltaBeta,
        updatedAt: input.now,
      })
      .onConflictDoUpdate({
        target: [
          collectiveScoresTable.deviceId,
          collectiveScoresTable.intentSig,
        ],
        set: {
          alpha: sql`${collectiveScoresTable.alpha} + ${input.deltaAlpha}`,
          beta: sql`${collectiveScoresTable.beta} + ${input.deltaBeta}`,
          updatedAt: input.now,
        },
      });
  }

  async saveDailyRollups(rollups: DailyRollup[]): Promise<void> {
    if (rollups.length === 0) return;

    await this.db
      .insert(analyticsDailyTable)
      .values(
        rollups.map((r) => ({
          day: r.day,
          metric: r.metric,
          dim: r.dim,
          value: r.value,
        })),
      )
      .onConflictDoUpdate({
        target: [
          analyticsDailyTable.day,
          analyticsDailyTable.metric,
          analyticsDailyTable.dim,
        ],
        set: {
          value: sql`excluded.value`,
        },
      });
  }

  async runDailyRollups(day: string): Promise<number> {
    const dayStart = new Date(`${day}T00:00:00Z`);
    const dayEnd = new Date(dayStart.getTime() + 86400000);

    const [searchesCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(searchEventsTable)
      .where(
        and(
          gte(searchEventsTable.createdAt, dayStart),
          lt(searchEventsTable.createdAt, dayEnd),
        ),
      );

    const [thumbsUp] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(feedbackEventsTable)
      .where(
        and(
          eq(feedbackEventsTable.kind, "up"),
          gte(feedbackEventsTable.createdAt, dayStart),
          lt(feedbackEventsTable.createdAt, dayEnd),
        ),
      );

    const [thumbsDown] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(feedbackEventsTable)
      .where(
        and(
          eq(feedbackEventsTable.kind, "down"),
          gte(feedbackEventsTable.createdAt, dayStart),
          lt(feedbackEventsTable.createdAt, dayEnd),
        ),
      );

    const rollups: DailyRollup[] = [
      {
        day,
        metric: "searches_total",
        dim: "all",
        value: searchesCount?.count ?? 0,
      },
      {
        day,
        metric: "feedbacks_thumbs_up",
        dim: "all",
        value: thumbsUp?.count ?? 0,
      },
      {
        day,
        metric: "feedbacks_thumbs_down",
        dim: "all",
        value: thumbsDown?.count ?? 0,
      },
    ];

    await this.saveDailyRollups(rollups);
    return rollups.length;
  }

  async getUsageDashboard(days = 14): Promise<UsageDashboardResult> {
    const dailyRows = await this.db
      .select()
      .from(analyticsDailyTable)
      .where(
        and(
          eq(analyticsDailyTable.metric, "searches_total"),
          eq(analyticsDailyTable.dim, "all"),
        ),
      )
      .orderBy(desc(analyticsDailyTable.day))
      .limit(days);

    const dailySearches = dailyRows
      .reverse()
      .map((r: typeof analyticsDailyTable.$inferSelect) => ({
        day: r.day,
        count: Math.round(r.value),
      }));

    const [upCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(feedbackEventsTable)
      .where(eq(feedbackEventsTable.kind, "up"));

    const [downCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(feedbackEventsTable)
      .where(eq(feedbackEventsTable.kind, "down"));

    const up = upCount?.count ?? 0;
    const down = downCount?.count ?? 0;
    const total = up + down;
    const upPercent = total > 0 ? Math.round((up / total) * 100) : 100;

    return {
      dailySearches,
      thumbsRatio: { up, down, upPercent },
      topRequestedCriteria: [],
      topRecommendedDevices: [],
      discardedCriteria: [],
    };
  }

  async runRetentionSweep(options: {
    retentionDays: number;
    now: Date;
  }): Promise<RetentionSweepResult> {
    const cutoff = new Date(
      options.now.getTime() - options.retentionDays * 86400000,
    );

    // Batch deletion (ARQUITETURA §16.5)
    const deletedSearchesResult = await this.db.execute<{ count: number }>(
      sql`WITH deleted AS (
            DELETE FROM search_event
            WHERE id IN (
              SELECT id FROM search_event
              WHERE created_at < ${cutoff}
              LIMIT 1000
            )
            RETURNING id
          )
          SELECT count(*)::int as count FROM deleted;`,
    );

    const deletedFeedbacksResult = await this.db.execute<{ count: number }>(
      sql`WITH deleted AS (
            DELETE FROM feedback_event
            WHERE id IN (
              SELECT id FROM feedback_event
              WHERE created_at < ${cutoff}
              LIMIT 1000
            )
            RETURNING id
          )
          SELECT count(*)::int as count FROM deleted;`,
    );

    // Monthly decay of collective score (alpha, beta * 0.9)
    await this.db.execute(
      sql`UPDATE collective_score
          SET alpha = round((alpha * 0.9)::numeric, 4),
              beta = round((beta * 0.9)::numeric, 4),
              updated_at = ${options.now};`,
    );

    return {
      deletedSearches: deletedSearchesResult[0]?.count ?? 0,
      deletedFeedbacks: deletedFeedbacksResult[0]?.count ?? 0,
      decayedCollectiveScores: 1,
      storageUsageWarning: false,
    };
  }
}

