import type { Clock } from "../../../shared/time/clock";
import type { SchedulerRepository } from "../../scheduler";
import type { ReviewRepository } from "../../reviews";
import type { CatalogApi } from "../../catalog";

export interface GetSystemStatusDeps {
  readonly schedulerRepository: SchedulerRepository;
  readonly reviewRepository?: ReviewRepository;
  readonly catalogApi?: CatalogApi;
  readonly clock: Clock;
}

export interface SystemStatusResult {
  readonly status: "healthy" | "degraded" | "unhealthy";
  readonly timestamp: string;
  readonly uptimeSec: number;
  readonly jobs: Array<{
    name: string;
    lastRunAt: string | null;
    lastStatus: string | null;
    nextDueAt: string;
    consecutiveFailures: number;
  }>;
  readonly recentRuns: Array<{
    id: string;
    jobName: string;
    status: string;
    startedAt: string;
    finishedAt: string;
    summary: Record<string, unknown>;
  }>;
  readonly quotas: Array<{
    provider: string;
    used: number;
    limit: number;
    percentUsed: number;
  }>;
  readonly reviews: Record<string, number>;
  readonly catalog: {
    activeDevicesCount: number;
  };
}

const startTime = Date.now();

export class GetSystemStatusUseCase {
  constructor(private readonly deps: GetSystemStatusDeps) {}

  async execute(): Promise<SystemStatusResult> {
    const now = this.deps.clock.now();
    const dayStr = this.deps.clock.todayUtcString();

    const [jobStates, recentRuns, quotaUsages, reviewsCounts, devicesResult] =
      await Promise.all([
        this.deps.schedulerRepository.getAllJobStates(),
        this.deps.schedulerRepository.getRecentJobRuns(10),
        this.deps.schedulerRepository.getAllQuotaUsage(dayStr),
        this.deps.reviewRepository
          ? this.deps.reviewRepository.countByStatus()
          : Promise.resolve({}),
        this.deps.catalogApi
          ? this.deps.catalogApi.listActiveDevices({ limit: 100 })
          : Promise.resolve({ items: [] }),
      ]);

    const formattedJobs = jobStates.map((j) => ({
      name: j.name,
      lastRunAt: j.lastRunAt ? j.lastRunAt.toISOString() : null,
      lastStatus: j.lastStatus,
      nextDueAt: j.nextDueAt.toISOString(),
      consecutiveFailures: j.consecutiveFailures,
    }));

    const formattedRuns = recentRuns.map((r) => ({
      id: r.id,
      jobName: r.jobName,
      status: r.status,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt.toISOString(),
      summary: r.summary,
    }));

    const formattedQuotas = quotaUsages.map((q) => ({
      provider: q.provider,
      used: q.used,
      limit: q.limit,
      percentUsed: q.limit > 0 ? Math.round((q.used / q.limit) * 100) : 0,
    }));

    const hasConsecutiveFailures = jobStates.some(
      (j) => j.consecutiveFailures >= 3,
    );
    const overallStatus = hasConsecutiveFailures ? "degraded" : "healthy";

    return {
      status: overallStatus,
      timestamp: now.toISOString(),
      uptimeSec: Math.floor((Date.now() - startTime) / 1000),
      jobs: formattedJobs,
      recentRuns: formattedRuns,
      quotas: formattedQuotas,
      reviews: reviewsCounts,
      catalog: {
        activeDevicesCount: devicesResult.items.length,
      },
    };
  }
}
