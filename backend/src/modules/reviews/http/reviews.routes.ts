import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { LinkReviewSourceUseCase } from "../application/link-review-source.use-case";
import type { ImportReviewsUseCase } from "../application/import-reviews.use-case";
import type { MercadoLivreReviewSource } from "../infrastructure/mercadolivre.review-source";
import { importReviewsSchema, linkSourceSchema } from "./reviews.dto";

export interface ReviewsRoutesDeps {
  readonly linkReviewSourceUseCase: LinkReviewSourceUseCase;
  readonly importReviewsUseCase: ImportReviewsUseCase;
  readonly mercadoLivreReviewSource?: MercadoLivreReviewSource;
}

export function createReviewsRoutes(deps: ReviewsRoutesDeps) {
  const routes = new Hono();

  // POST /v1/admin/devices/:id/sources
  routes.post(
    "/v1/admin/devices/:id/sources",
    zValidator("param", z.object({ id: z.string().uuid() })),
    zValidator("json", linkSourceSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const body = c.req.valid("json");

      const link = await deps.linkReviewSourceUseCase.execute({
        deviceId: id,
        provider: body.provider,
        externalRef: body.externalRef,
        intervalDays: body.intervalDays,
      });

      return c.json({ data: link }, 201);
    },
  );

  // POST /v1/admin/reviews/import
  routes.post(
    "/v1/admin/reviews/import",
    zValidator("json", importReviewsSchema),
    async (c) => {
      const body = c.req.valid("json");
      const result = await deps.importReviewsUseCase.execute({
        items: body.items,
      });

      return c.json({ data: result }, 200);
    },
  );

  // GET /v1/admin/catalog/search?q=
  routes.get(
    "/v1/admin/catalog/search",
    zValidator("query", z.object({ q: z.string().min(1) })),
    async (c) => {
      const { q } = c.req.valid("query");
      if (!deps.mercadoLivreReviewSource) {
        return c.json({ data: [] }, 200);
      }

      const results = await deps.mercadoLivreReviewSource.searchCatalog(q);
      return c.json({ data: results }, 200);
    },
  );

  return routes;
}
