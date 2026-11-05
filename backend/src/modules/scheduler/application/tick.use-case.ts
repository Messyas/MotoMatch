import type { Clock } from "../../../shared/time/clock";
import type { Logger } from "../../../shared/logging/logger";
import type { SchedulerRepository } from "../domain/scheduler.repository";
import {
  createJobDeadline,
  type JobRun,
  type JobRunContext,
  type JobState,
  type ScheduledJob,
} from "../domain/job";

export interface TickUseCaseDeps {
  readonly schedulerRepository: SchedulerRepository;
  readonly jobs: readonly ScheduledJob[];
  readonly clock: Clock;
  readonly logger: Logger;
  readonly maxTickDurationMs?: number;
  readonly lockId?: number;
}

export interface TickResult {
  readonly ran: boolean;
  readonly reason?: string;
  readonly executedJobs?: Array<{
    name: string;
    status: string;
    durationMs: number;
  }>;
}

const DEFAULT_TICK_LOCK_ID = 8675309;
const DEFAULT_MAX_TICK_DURATION_MS = 60_000;

export class TickUseCase {
  private readonly lockId: number;
  private readonly maxTickDurationMs: number;

  constructor(private readonly deps: TickUseCaseDeps) {
    this.lockId = deps.lockId ?? DEFAULT_TICK_LOCK_ID;
    this.maxTickDurationMs =
      deps.maxTickDurationMs ?? DEFAULT_MAX_TICK_DURATION_MS;
  }

  async execute(): Promise<TickResult> {
    const acquired = await this.deps.schedulerRepository.tryAdvisoryLock(
      this.lockId,
    );

    if (!acquired) {
      this.deps.logger.info("scheduler.tick_skipped", { reason: "locked" });
      return { ran: false, reason: "locked" };
    }

    try {
      const now = this.deps.clock.now();
      const deadline = createJobDeadline(
        this.maxTickDurationMs,
        this.deps.clock,
      );

      const executedJobs: Array<{
        name: string;
        status: string;
        durationMs: number;
      }> = [];

      for (const job of this.deps.jobs) {
        if (deadline.isExpired()) {
          this.deps.logger.warn("scheduler.tick_deadline_reached", {
            skippedJob: job.name,
          });
          break;
        }

        const currentState = await this.deps.schedulerRepository.getJobState(
          job.name,
        );

        // Check if due: either never run (currentState === null) or nextDueAt <= now
        const isDue = !currentState || currentState.nextDueAt <= now;
        if (!isDue) {
          continue;
        }

        const runStartedAt = this.deps.clock.now();
        const context: JobRunContext = {
          deadline,
          now: runStartedAt,
        };

        let status: "ok" | "partial" | "failed" = "ok";
        let summary: Record<string, unknown> = {};

        try {
          const result = await job.run(context);
          status = result.status === "skipped" ? "ok" : result.status;
          summary = result.summary ?? {};
        } catch (err) {
          status = "failed";
          summary = {
            error: err instanceof Error ? err.message : String(err),
          };
          this.deps.logger.error("scheduler.job_failed", {
            job: job.name,
            error: err,
          });
        }

        const runFinishedAt = this.deps.clock.now();
        const durationMs =
          runFinishedAt.getTime() - runStartedAt.getTime();

        const nextDueAt = job.nextDueAt(currentState, runFinishedAt);
        const consecutiveFailures =
          status === "failed"
            ? (currentState?.consecutiveFailures ?? 0) + 1
            : 0;

        const updatedState: JobState = {
          name: job.name,
          lastRunAt: runFinishedAt,
          lastStatus: status,
          nextDueAt,
          consecutiveFailures,
        };

        const runRecord: JobRun = {
          id: crypto.randomUUID(),
          jobName: job.name,
          startedAt: runStartedAt,
          finishedAt: runFinishedAt,
          status,
          summary,
        };

        await this.deps.schedulerRepository.saveJobState(updatedState);
        await this.deps.schedulerRepository.recordJobRun(runRecord);

        executedJobs.push({
          name: job.name,
          status,
          durationMs,
        });
      }

      this.deps.logger.info("scheduler.tick_completed", {
        executedCount: executedJobs.length,
      });

      return { ran: true, executedJobs };
    } finally {
      await this.deps.schedulerRepository.releaseAdvisoryLock(this.lockId);
    }
  }
}
