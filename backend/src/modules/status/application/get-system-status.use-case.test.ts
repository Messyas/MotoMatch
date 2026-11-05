import { describe, expect, it } from "bun:test";
import { FixedClock } from "../../../shared/time/clock";
import { InMemorySchedulerRepository } from "../../scheduler";
import { InMemoryReviewRepository } from "../../reviews";
import { GetSystemStatusUseCase } from "./get-system-status.use-case";

describe("GetSystemStatusUseCase", () => {
  it("assembles complete system status overview from modules", async () => {
    const clock = new FixedClock(new Date("2026-05-10T12:00:00Z"));
    const schedulerRepo = new InMemorySchedulerRepository();
    const reviewRepo = new InMemoryReviewRepository();

    // Seed some data
    await schedulerRepo.saveJobState({
      name: "collect_reviews",
      lastRunAt: clock.now(),
      lastStatus: "ok",
      nextDueAt: new Date("2026-05-10T18:00:00Z"),
      consecutiveFailures: 0,
    });

    await schedulerRepo.reserveQuota({
      day: "2026-05-10",
      provider: "youtube",
      units: 15,
      limit: 10000,
    });

    const useCase = new GetSystemStatusUseCase({
      schedulerRepository: schedulerRepo,
      reviewRepository: reviewRepo,
      catalogApi: {
        findDeviceById: async () => null,
        findByBrandAndModel: async () => null,
        listActiveDevices: async () => ({ items: [] }),
      },
      clock,
    });

    const status = await useCase.execute();

    expect(status.status).toBe("healthy");
    expect(status.timestamp).toBe("2026-05-10T12:00:00.000Z");
    expect(status.jobs).toHaveLength(1);
    expect(status.jobs[0]!.name).toBe("collect_reviews");
    expect(status.quotas).toHaveLength(1);
    expect(status.quotas[0]!.provider).toBe("youtube");
    expect(status.quotas[0]!.used).toBe(15);
  });
});
