import type { JobRun, JobState } from "../domain/job";
import type { QuotaUsage } from "../domain/quota";
import type {
  ReserveQuotaInput,
  SchedulerRepository,
} from "../domain/scheduler.repository";

export class InMemorySchedulerRepository implements SchedulerRepository {
  private jobStates = new Map<string, JobState>();
  private jobRuns: JobRun[] = [];
  private quotaUsages = new Map<string, QuotaUsage>();
  private heldLocks = new Set<number>();

  async getJobState(name: string): Promise<JobState | null> {
    return this.jobStates.get(name) ?? null;
  }

  async saveJobState(state: JobState): Promise<void> {
    this.jobStates.set(state.name, state);
  }

  async recordJobRun(run: JobRun): Promise<void> {
    this.jobRuns.unshift(run);
  }

  async findDueJobs(now: Date): Promise<string[]> {
    const due: string[] = [];
    for (const [name, state] of this.jobStates.entries()) {
      if (state.nextDueAt <= now) {
        due.push(name);
      }
    }
    return due;
  }

  async tryAdvisoryLock(lockId: number): Promise<boolean> {
    if (this.heldLocks.has(lockId)) {
      return false;
    }
    this.heldLocks.add(lockId);
    return true;
  }

  async releaseAdvisoryLock(lockId: number): Promise<void> {
    this.heldLocks.delete(lockId);
  }

  async getQuotaUsage(
    day: string,
    provider: string,
  ): Promise<QuotaUsage | null> {
    return this.quotaUsages.get(`${day}:${provider}`) ?? null;
  }

  async reserveQuota(input: ReserveQuotaInput): Promise<boolean> {
    const key = `${input.day}:${input.provider}`;
    const current = this.quotaUsages.get(key) ?? {
      day: input.day,
      provider: input.provider,
      used: 0,
      limit: input.limit,
    };

    if (current.used + input.units > input.limit) {
      return false;
    }

    this.quotaUsages.set(key, {
      ...current,
      used: current.used + input.units,
      limit: input.limit,
    });
    return true;
  }

  async getAllQuotaUsage(day: string): Promise<QuotaUsage[]> {
    const list: QuotaUsage[] = [];
    for (const [key, usage] of this.quotaUsages.entries()) {
      if (key.startsWith(`${day}:`)) {
        list.push(usage);
      }
    }
    return list;
  }

  async getRecentJobRuns(limit: number): Promise<JobRun[]> {
    return this.jobRuns.slice(0, limit);
  }

  async getAllJobStates(): Promise<JobState[]> {
    return Array.from(this.jobStates.values());
  }

  // Test inspection helper
  clear(): void {
    this.jobStates.clear();
    this.jobRuns = [];
    this.quotaUsages.clear();
    this.heldLocks.clear();
  }
}

