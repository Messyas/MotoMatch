import { Hono } from "hono";
import type { GetSystemStatusUseCase } from "../application/get-system-status.use-case";

export interface StatusRoutesDeps {
  readonly getSystemStatusUseCase: GetSystemStatusUseCase;
}

export function createStatusRoutes(deps: StatusRoutesDeps) {
  const routes = new Hono();

  // GET /v1/status
  routes.get("/v1/status", async (c) => {
    const status = await deps.getSystemStatusUseCase.execute();
    return c.json({ data: status }, 200);
  });

  return routes;
}
