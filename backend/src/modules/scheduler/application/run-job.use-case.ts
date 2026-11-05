import { NotFoundError } from "../../../shared/errors/app-error";
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

export interface RunJobUseCaseDeps {
  readonly schedulerRepository: SchedulerRepository;
  readonly jobs: readonly ScheduledJob[];
  readonly clock: Clock;
  readonly logger: Logger;
  readonly maxTimeoutMs?: number;
}

export interface RunJobResult {
  readonly jobName: string;
  readonly status: string;
  readonly summary: Record<string, unknown>;
  readonly durationMs: number;
}

const DEFAULT_MANUAL_TIMEOUT_MS = 60_000;

export class RunJobUseCase {
  private readonly maxTimeoutMs: number;

  constructor(private readonly deps: RunJobUseCaseDeps) {
    this.maxTimeoutMs = deps.maxTimeoutMs ?? DEFAULT_MANUAL_TIMEOUT_MS;
  }

  async execute(jobName: string): Promise<RunJobResult> {
    const job = this.deps.jobs.find((j) => j.name === jobName);
    if (!job) {
      throw new NotFoundError(`Scheduled job with name '${jobName}' was not found`, {
        context: { jobName },
      });
    }

    const now = this.deps.clock.now();
    const currentState = await this.deps.schedulerRepository.getJobState(job.name);
    const deadline = createJobDeadline(this.maxTimeoutMs, this.deps.clock);

    const context: JobRunContext = {
      deadline,
      now,
      isManual: true,
    };

    const runStartedAt = this.deps.clock.now();
    let status: "ok" | "partial" | "failed" = "ok";
    let summary: Record<string, unknown> = {};

    try {
      const result = await job.run(context);
      status = result.status === "skipped" ? "ok" : result.status;
      summary = result.summary ?? {};
    } catch (err) {
      status = "failed";
      summary = { error: err instanceof Error ? err.message : String(err) };
      this.deps.logger.error("scheduler.manual_job_failed", {
        job: job.name,
        error: err,
      });
    }

    const runFinishedAt = this.deps.clock.now();
    const durationMs = runFinishedAt.getTime() - runStartedAt.getTime();
    const nextDueAt = job.nextDueAt(currentState, runFinishedAt);

    const updatedState: JobState = {
      name: job.name,
      lastRunAt: runFinishedAt,
      lastStatus: status,
      nextDueAt,
      consecutiveFailures: status === "failed" ? (currentState?.consecutiveFailures ?? 0) + 1 : 0,
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

    this.deps.logger.info("scheduler.manual_job_completed", {
      job: job.name,
      status,
      durationMs,
    });

    return {
      jobName: job.name,
      status,
      summary,
      durationMs,
    };
  }
}

