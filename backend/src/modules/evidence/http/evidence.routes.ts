import { Hono } from "hono";
import type { FindEvidenceUseCase } from "../application/find-evidence.use-case";

export function createEvidenceRoutes(findEvidenceUseCase: FindEvidenceUseCase) {
  const router = new Hono();

  router.get("/v1/devices/:id/evidence", async (c) => {
    const deviceId = c.req.param("id");
    const aspectsParam = c.req.query("aspects");
    const limitParam = c.req.query("limit");
    const sentimentParam = c.req.query("targetSentiment") as
      | "positive"
      | "negative"
      | "neutral"
      | undefined;
    const queryText = c.req.query("q");

    const aspects = aspectsParam
      ? aspectsParam
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean)
      : undefined;

    const limitPerAspect = limitParam ? parseInt(limitParam, 10) : 1;

    const items = await findEvidenceUseCase.execute({
      deviceId,
      aspects,
      limitPerAspect: isNaN(limitPerAspect) ? 1 : limitPerAspect,
      targetSentiment: sentimentParam,
      queryText,
    });

    return c.json({ data: items });
  });

  return router;
}
