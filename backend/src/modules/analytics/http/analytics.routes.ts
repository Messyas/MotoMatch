import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { RecordFeedbackUseCase } from "../application/record-feedback.use-case";
import type { AnalyticsRepository } from "../domain/analytics.repository";
import { feedbackBodySchema } from "./analytics.dto";

export interface AnalyticsRoutesDeps {
  readonly recordFeedbackUseCase: RecordFeedbackUseCase;
  readonly analyticsRepository: AnalyticsRepository;
}

export function createAnalyticsRoutes(deps: AnalyticsRoutesDeps) {
  const routes = new Hono();

  // POST /v1/feedback
  routes.post(
    "/v1/feedback",
    zValidator("json", feedbackBodySchema),
    async (c) => {
      const body = c.req.valid("json");
      const result = await deps.recordFeedbackUseCase.execute({
        sessionId: body.sessionId,
        deviceId: body.deviceId,
        intentSig: body.intentSig,
        kind: body.kind,
      });

      return c.json({ data: result }, 200);
    },
  );

  // GET /v1/analytics
  routes.get("/v1/analytics", async (c) => {
    const dashboard = await deps.analyticsRepository.getUsageDashboard();
    return c.json({ data: dashboard }, 200);
  });

  return routes;
}
