import type { Clock } from "../../../shared/time/clock";

export type JobStatus = "ok" | "partial" | "failed" | "skipped";

export interface JobState {
  readonly name: string;
  readonly lastRunAt: Date | null;
  readonly lastStatus: JobStatus | null;
  readonly nextDueAt: Date;
  readonly consecutiveFailures: number;
  readonly meta?: Record<string, unknown>;
}

export interface JobRun {
  readonly id: string;
  readonly jobName: string;
  readonly windowStart?: Date | null;
  readonly startedAt: Date;
  readonly finishedAt: Date;
  readonly status: JobStatus;
  readonly summary: Record<string, unknown>;
}

export interface JobDeadline {
  isExpired(): boolean;
  remainingMs(): number;
}

export function createJobDeadline(timeoutMs: number, clock: Clock): JobDeadline {
  const startTime = clock.now().getTime();
  const endTime = startTime + timeoutMs;
  return {
    isExpired: () => clock.now().getTime() >= endTime,
    remainingMs: () => Math.max(0, endTime - clock.now().getTime()),
  };
}

export interface JobRunContext {
  readonly deadline: JobDeadline;
  readonly now: Date;
  readonly isManual?: boolean;
}

export interface JobRunResult {
  readonly status: JobStatus;
  readonly summary?: Record<string, unknown>;
}

export interface ScheduledJob {
  readonly name: string;
  nextDueAt(state: JobState | null, now: Date): Date;
  run(context: JobRunContext): Promise<JobRunResult>;
}
