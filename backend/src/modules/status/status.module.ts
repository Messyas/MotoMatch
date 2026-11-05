import type { Clock } from "../../shared/time/clock";
import type { SchedulerRepository } from "../scheduler";
import type { ReviewRepository } from "../reviews";
import type { CatalogApi } from "../catalog";
import { GetSystemStatusUseCase } from "./application/get-system-status.use-case";
import { createStatusRoutes } from "./http/status.routes";

export interface StatusModuleDeps {
  readonly schedulerRepository: SchedulerRepository;
  readonly reviewRepository?: ReviewRepository;
  readonly catalogApi?: CatalogApi;
  readonly clock: Clock;
}

export function createStatusModule(deps: StatusModuleDeps) {
  const getSystemStatusUseCase = new GetSystemStatusUseCase({
    schedulerRepository: deps.schedulerRepository,
    reviewRepository: deps.reviewRepository,
    catalogApi: deps.catalogApi,
    clock: deps.clock,
  });

  const routes = createStatusRoutes({
    getSystemStatusUseCase,
  });

  return {
    routes,
    api: {
      getStatus: () => getSystemStatusUseCase.execute(),
    },
  };
}
