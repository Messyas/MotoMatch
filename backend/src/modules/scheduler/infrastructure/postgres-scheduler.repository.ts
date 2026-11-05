import { desc, eq, lte, sql } from "drizzle-orm";
import type { DatabaseClient } from "../../../shared/db/client";
import type { JobRun, JobState, JobStatus } from "../domain/job";
import type { QuotaUsage } from "../domain/quota";
import type {
  ReserveQuotaInput,
  SchedulerRepository,
} from "../domain/scheduler.repository";
import {
  jobRuns as jobRunsTable,
  jobs as jobsTable,
  quotaUsages as quotaUsagesTable,
} from "./scheduler.schema";

export class PostgresSchedulerRepository implements SchedulerRepository {
  constructor(private readonly db: DatabaseClient) {}

  async getJobState(name: string): Promise<JobState | null> {
    const rows = await this.db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.name, name))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      name: r.name,
      lastRunAt: r.lastRunAt,
      lastStatus: r.lastStatus as JobStatus | null,
      nextDueAt: r.nextDueAt,
      consecutiveFailures: r.consecutiveFailures,
      meta: (r.meta as Record<string, unknown>) ?? undefined,
    };
  }

  async saveJobState(state: JobState): Promise<void> {
    await this.db
      .insert(jobsTable)
      .values({
        name: state.name,
        lastRunAt: state.lastRunAt,
        lastStatus: state.lastStatus,
        nextDueAt: state.nextDueAt,
        consecutiveFailures: state.consecutiveFailures,
        meta: state.meta,
      })
      .onConflictDoUpdate({
        target: jobsTable.name,
        set: {
          lastRunAt: state.lastRunAt,
          lastStatus: state.lastStatus,
          nextDueAt: state.nextDueAt,
          consecutiveFailures: state.consecutiveFailures,
          meta: state.meta,
        },
      });
  }

  async recordJobRun(run: JobRun): Promise<void> {
    // Ensure parent job exists first
    await this.db
      .insert(jobsTable)
      .values({
        name: run.jobName,
        nextDueAt: run.finishedAt,
      })
      .onConflictDoNothing();

    await this.db.insert(jobRunsTable).values({
      id: run.id,
      jobName: run.jobName,
      windowStart: run.windowStart,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      status: run.status,
      summary: run.summary,
    });
  }

  async findDueJobs(now: Date): Promise<string[]> {
    const rows = await this.db
      .select({ name: jobsTable.name })
      .from(jobsTable)
      .where(lte(jobsTable.nextDueAt, now));

    return rows.map((r) => r.name);
  }

  async tryAdvisoryLock(lockId: number): Promise<boolean> {
    const result = await this.db.execute<{ locked: boolean }>(
      sql`SELECT pg_try_advisory_lock(${lockId}) as locked;`,
    );
    const row = result[0];
    return Boolean(row?.locked);
  }

  async releaseAdvisoryLock(lockId: number): Promise<void> {
    await this.db.execute(sql`SELECT pg_advisory_unlock(${lockId});`);
  }

  async getQuotaUsage(
    day: string,
    provider: string,
  ): Promise<QuotaUsage | null> {
    const rows = await this.db
      .select()
      .from(quotaUsagesTable)
      .where(
        sql`${quotaUsagesTable.day} = ${day} AND ${quotaUsagesTable.provider} = ${provider}`,
      )
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0]!;
    return {
      day: r.day,
      provider: r.provider,
      used: r.used,
      limit: r.limit,
    };
  }

  async reserveQuota(input: ReserveQuotaInput): Promise<boolean> {
    const result = await this.db.execute<{ used: number }>(
      sql`INSERT INTO quota_usage (day, provider, used, "limit")
          VALUES (${input.day}, ${input.provider}, ${input.units}, ${input.limit})
          ON CONFLICT (day, provider) DO UPDATE
          SET used = quota_usage.used + EXCLUDED.used
          WHERE quota_usage.used + EXCLUDED.used <= quota_usage."limit"
          RETURNING used;`,
    );

    return result.length > 0;
  }

  async getAllQuotaUsage(day: string): Promise<QuotaUsage[]> {
    const rows = await this.db
      .select()
      .from(quotaUsagesTable)
      .where(eq(quotaUsagesTable.day, day));

    return rows.map((r: typeof quotaUsagesTable.$inferSelect) => ({
      day: r.day,
      provider: r.provider,
      used: r.used,
      limit: r.limit,
    }));
  }

  async getRecentJobRuns(limit: number): Promise<JobRun[]> {
    const rows = await this.db
      .select()
      .from(jobRunsTable)
      .orderBy(desc(jobRunsTable.startedAt))
      .limit(limit);

    return rows.map((r: typeof jobRunsTable.$inferSelect) => ({
      id: r.id,
      jobName: r.jobName,
      windowStart: r.windowStart,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      status: r.status as JobStatus,
      summary: (r.summary as Record<string, unknown>) ?? {},
    }));
  }

  async getAllJobStates(): Promise<JobState[]> {
    const rows = await this.db.select().from(jobsTable);
    return rows.map((r: typeof jobsTable.$inferSelect) => ({
      name: r.name,
      lastRunAt: r.lastRunAt,
      lastStatus: r.lastStatus as JobStatus | null,
      nextDueAt: r.nextDueAt,
      consecutiveFailures: r.consecutiveFailures,
      meta: (r.meta as Record<string, unknown>) ?? undefined,
    }));
  }
}
