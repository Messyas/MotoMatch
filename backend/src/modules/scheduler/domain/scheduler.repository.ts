import type { JobRun, JobState } from "./job";
import type { QuotaUsage } from "./quota";

export interface ReserveQuotaInput {
  readonly day: string; // YYYY-MM-DD
  readonly provider: string;
  readonly units: number;
  readonly limit: number;
}

export interface SchedulerRepository {
  getJobState(name: string): Promise<JobState | null>;
  saveJobState(state: JobState): Promise<void>;
  recordJobRun(run: JobRun): Promise<void>;
  findDueJobs(now: Date): Promise<string[]>;
  tryAdvisoryLock(lockId: number): Promise<boolean>;
  releaseAdvisoryLock(lockId: number): Promise<void>;
  getQuotaUsage(day: string, provider: string): Promise<QuotaUsage | null>;
  reserveQuota(input: ReserveQuotaInput): Promise<boolean>;
  getAllQuotaUsage(day: string): Promise<QuotaUsage[]>;
  getRecentJobRuns(limit: number): Promise<JobRun[]>;
  getAllJobStates(): Promise<JobState[]>;
}
