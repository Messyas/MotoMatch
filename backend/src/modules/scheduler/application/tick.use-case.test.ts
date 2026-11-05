import { describe, expect, it } from "bun:test";
import { FixedClock } from "../../../shared/time/clock";
import { MemoryLogger } from "../../../shared/logging/logger";
import { InMemorySchedulerRepository } from "../infrastructure/in-memory-scheduler.repository";
import { TickUseCase } from "./tick.use-case";
import type { ScheduledJob, JobRunContext, JobRunResult, JobState } from "../domain/job";

class TestJob implements ScheduledJob {
  constructor(
    readonly name: string,
    public executionCount = 0,
  ) {}

  nextDueAt(_state: JobState | null, now: Date): Date {
    return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later
  }

  async run(_context: JobRunContext): Promise<JobRunResult> {
    this.executionCount++;
    return { status: "ok", summary: { items: 5 } };
  }
}

describe("TickUseCase", () => {
  it("runs due jobs, records job run and advances nextDueAt", async () => {
    const clock = new FixedClock(new Date("2026-05-10T12:00:00Z"));
    const logger = new MemoryLogger();
    const repo = new InMemorySchedulerRepository();

    const job1 = new TestJob("collect_reviews");
    const job2 = new TestJob("analyze_pending");

    const tickUseCase = new TickUseCase({
      schedulerRepository: repo,
      jobs: [job1, job2],
      clock,
      logger,
    });

    const result = await tickUseCase.execute();

    expect(result.ran).toBe(true);
    expect(result.executedJobs).toHaveLength(2);
    expect(job1.executionCount).toBe(1);
    expect(job2.executionCount).toBe(1);

    const runs = await repo.getRecentJobRuns(10);
    expect(runs).toHaveLength(2);
    expect(runs[0]!.status).toBe("ok");

    // Re-running immediately skips jobs because nextDueAt is 1 hour in the future
    const secondResult = await tickUseCase.execute();
    expect(secondResult.ran).toBe(true);
    expect(secondResult.executedJobs).toHaveLength(0);
  });

  it("exclusivity: skips execution when advisory lock is already held", async () => {
    const clock = new FixedClock(new Date("2026-05-10T12:00:00Z"));
    const logger = new MemoryLogger();
    const repo = new InMemorySchedulerRepository();

    const job = new TestJob("sample_job");
    const tickUseCase = new TickUseCase({
      schedulerRepository: repo,
      jobs: [job],
      clock,
      logger,
    });

    // Simulate concurrent lock
    await repo.tryAdvisoryLock(8675309);

    const result = await tickUseCase.execute();
    expect(result.ran).toBe(false);
    expect(result.reason).toBe("locked");
    expect(job.executionCount).toBe(0);
  });
});

