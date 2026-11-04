import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { RecommendUseCase } from "../application/recommend.use-case";
import { normalizeWeights } from "../domain/aspect";
import { recommendBodySchema } from "./recommender.dto";

export interface RecommenderRoutesDeps {
  readonly recommend: RecommendUseCase;
}

export function createRecommenderRoutes(deps: RecommenderRoutesDeps) {
  const routes = new Hono();

  // POST /v1/recommend
  routes.post("/", zValidator("json", recommendBodySchema), async (c) => {
    const body = c.req.valid("json");
    const weights = normalizeWeights(body.weights ?? {});

    const result = await deps.recommend.execute({
      constraints: body.constraints,
      weights,
      referenceDeviceId: body.referenceDeviceId,
      limit: body.limit,
    });

    return c.json(result);
  });

  return routes;
}
