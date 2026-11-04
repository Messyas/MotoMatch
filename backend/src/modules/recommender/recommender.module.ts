import type { CatalogApi } from "../catalog";
import { type RecommendationResult, RecommendUseCase } from "./application/recommend.use-case";
import type { RecommendationQuery } from "./domain/recommendation-query.builder";
import { createRecommenderRoutes } from "./http/recommender.routes";

export interface RecommenderModuleDeps {
  readonly catalog: CatalogApi;
}

export interface RecommenderApi {
  recommend(query: RecommendationQuery): Promise<RecommendationResult>;
}

export function createRecommenderModule(deps: RecommenderModuleDeps) {
  const recommend = new RecommendUseCase({ catalogApi: deps.catalog });
  const routes = createRecommenderRoutes({ recommend });

  const api: RecommenderApi = {
    recommend: (query: RecommendationQuery) => recommend.execute(query),
  };

  return {
    api,
    routes,
    jobs: [],
  };
}
