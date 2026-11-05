import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { TickUseCase } from "../application/tick.use-case";
import type { RunJobUseCase } from "../application/run-job.use-case";
import { createCronAuthMiddleware } from "../../../shared/http/cron-auth.middleware";

export interface SchedulerRoutesDeps {
  readonly tickUseCase: TickUseCase;
  readonly runJobUseCase: RunJobUseCase;
  readonly cronSecret: string;
}

export function createSchedulerRoutes(deps: SchedulerRoutesDeps) {
  const routes = new Hono();

  // POST /internal/tick (protected by X-Cron-Secret)
  routes.post(
    "/internal/tick",
    createCronAuthMiddleware(deps.cronSecret),
    async (c) => {
      const result = await deps.tickUseCase.execute();
      return c.json({ data: result }, 200);
    },
  );

  // POST /v1/admin/jobs/:name/run
  routes.post(
    "/v1/admin/jobs/:name/run",
    zValidator("param", z.object({ name: z.string().min(1) })),
    async (c) => {
      const { name } = c.req.valid("param");
      const result = await deps.runJobUseCase.execute(name);
      return c.json({ data: result }, 200);
    },
  );

  return routes;
}

