import type { Clock } from "../../shared/time/clock";
import type { Logger } from "../../shared/logging/logger";
import type { DatabaseClient } from "../../shared/db/client";
import { PostgresSchedulerRepository } from "./infrastructure/postgres-scheduler.repository";
import { InMemorySchedulerRepository } from "./infrastructure/in-memory-scheduler.repository";
import { TickUseCase } from "./application/tick.use-case";
import { RunJobUseCase } from "./application/run-job.use-case";
import { createSchedulerRoutes } from "./http/scheduler.routes";
import type {
  JobRun,
  JobState,
  ScheduledJob,
} from "./domain/job";
import type { QuotaUsage } from "./domain/quota";
import type {
  ReserveQuotaInput,
  SchedulerRepository,
} from "./domain/scheduler.repository";

export interface SchedulerModuleDeps {
  readonly db?: DatabaseClient;
  readonly repository?: SchedulerRepository;
  readonly jobs: readonly ScheduledJob[];
  readonly clock: Clock;
  readonly logger: Logger;
  readonly cronSecret: string;
}

export interface SchedulerApi {
  tick(): Promise<any>;
  runJob(name: string): Promise<any>;
  getAllJobStates(): Promise<JobState[]>;
  getRecentJobRuns(limit?: number): Promise<JobRun[]>;
  getAllQuotaUsage(day: string): Promise<QuotaUsage[]>;
  reserveQuota(input: ReserveQuotaInput): Promise<boolean>;
}

export function createSchedulerModule(deps: SchedulerModuleDeps) {
  const repository: SchedulerRepository =
    deps.repository ??
    (deps.db
      ? new PostgresSchedulerRepository(deps.db)
      : new InMemorySchedulerRepository());

  const tickUseCase = new TickUseCase({
    schedulerRepository: repository,
    jobs: deps.jobs,
    clock: deps.clock,
    logger: deps.logger,
  });

  const runJobUseCase = new RunJobUseCase({
    schedulerRepository: repository,
    jobs: deps.jobs,
    clock: deps.clock,
    logger: deps.logger,
  });

  const routes = createSchedulerRoutes({
    tickUseCase,
    runJobUseCase,
    cronSecret: deps.cronSecret,
  });

  const api: SchedulerApi = {
    tick: () => tickUseCase.execute(),
    runJob: (name) => runJobUseCase.execute(name),
    getAllJobStates: () => repository.getAllJobStates(),
    getRecentJobRuns: (limit = 20) => repository.getRecentJobRuns(limit),
    getAllQuotaUsage: (day) => repository.getAllQuotaUsage(day),
    reserveQuota: (input) => repository.reserveQuota(input),
  };

  /**
   * Catch-up in background after boot delay (ARQUITETURA §16.2).
   * Server starts answering /health immediately.
   */
  const catchUpInBackground = () => {
    setTimeout(async () => {
      try {
        deps.logger.info("scheduler.catchup_started");
        await tickUseCase.execute();
      } catch (err) {
        deps.logger.error("scheduler.catchup_failed", { error: err });
      }
    }, 500);
  };

  return {
    routes,
    api,
    repository,
    catchUpInBackground,
  };
}

