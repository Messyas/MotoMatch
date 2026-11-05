import type { Clock } from "../../shared/time/clock";
import type { Logger } from "../../shared/logging/logger";
import type { DatabaseClient } from "../../shared/db/client";
import { PostgresReviewRepository } from "./infrastructure/postgres-review.repository";
import { InMemoryReviewRepository } from "./infrastructure/in-memory-review.repository";
import { YoutubeReviewSource } from "./infrastructure/youtube.review-source";
import { MercadoLivreReviewSource } from "./infrastructure/mercadolivre.review-source";
import { CollectReviewsJob } from "./jobs/collect-reviews.job";
import { CollectReviewsUseCase } from "./application/collect-reviews.use-case";
import { ImportReviewsUseCase } from "./application/import-reviews.use-case";
import { LinkReviewSourceUseCase } from "./application/link-review-source.use-case";
import { createReviewsRoutes } from "./http/reviews.routes";
import type { ReviewRepository } from "./domain/review.repository";
import type {
  Review,
  ReviewProvider,
  ReviewSourceLink,
} from "./domain/review";

export interface ReviewsModuleDeps {
  readonly db?: DatabaseClient;
  readonly repository?: ReviewRepository;
  readonly clock: Clock;
  readonly logger: Logger;
  readonly youtubeApiKey?: string;
  readonly mercadoLivreConfig?: {
    readonly clientId?: string;
    readonly clientSecret?: string;
    readonly baseUrl?: string;
  };
}

export interface ReviewsApi {
  collectReviews(link: ReviewSourceLink): Promise<any>;
  importReviews(input: {
    items: Array<{
      deviceId: string;
      content: string;
      provider?: ReviewProvider;
      rating?: number;
      externalRef?: string;
    }>;
  }): Promise<any>;
  linkSource(input: {
    deviceId: string;
    provider: ReviewProvider;
    externalRef: string;
    intervalDays?: number;
  }): Promise<ReviewSourceLink>;
  findDueLinks(now: Date, limit: number): Promise<ReviewSourceLink[]>;
  acquirePendingReviewsBatch(options: {
    batchSize: number;
    leaseDurationMs: number;
    now: Date;
  }): Promise<Review[]>;
  markReviewAnalyzed(options: { reviewId: string; now: Date }): Promise<void>;
  markReviewIrrelevant(reviewId: string): Promise<void>;
  markReviewFailed(options: {
    reviewId: string;
    errorCode: string;
    errorMessage: string;
    nextAttemptAt: Date;
  }): Promise<void>;
  findUnaggregatedAnalyzedReviews(limit: number): Promise<Review[]>;
  markReviewAggregated(reviewId: string, now: Date): Promise<boolean>;
  countByStatus(): Promise<Record<string, number>>;
}

export function createReviewsModule(deps: ReviewsModuleDeps) {
  const repository: ReviewRepository =
    deps.repository ??
    (deps.db
      ? new PostgresReviewRepository(deps.db)
      : new InMemoryReviewRepository());

  const youtubeSource = deps.youtubeApiKey
    ? new YoutubeReviewSource({ apiKey: deps.youtubeApiKey })
    : undefined;

  const mlSource = deps.mercadoLivreConfig
    ? new MercadoLivreReviewSource(deps.mercadoLivreConfig)
    : undefined;

  const collectUseCase = new CollectReviewsUseCase({
    reviewRepository: repository,
    clock: deps.clock,
    logger: deps.logger,
  });

  const importUseCase = new ImportReviewsUseCase({
    reviewRepository: repository,
    clock: deps.clock,
    logger: deps.logger,
  });

  const linkUseCase = new LinkReviewSourceUseCase({
    reviewRepository: repository,
    clock: deps.clock,
  });

  const routes = createReviewsRoutes({
    linkReviewSourceUseCase: linkUseCase,
    importReviewsUseCase: importUseCase,
    mercadoLivreReviewSource: mlSource,
  });

  const api: ReviewsApi = {
    collectReviews: async (link) => {
      const source =
        link.provider === "youtube"
          ? youtubeSource
          : link.provider === "mercadolivre"
            ? mlSource
            : undefined;

      if (!source) {
        throw new Error(`No review source configured for provider ${link.provider}`);
      }
      return collectUseCase.execute({ link, source });
    },
    importReviews: (input) => importUseCase.execute(input),
    linkSource: (input) => linkUseCase.execute(input),
    findDueLinks: (now, limit) => repository.findSourceLinksDue(now, limit),
    acquirePendingReviewsBatch: (options) =>
      repository.acquirePendingReviewsBatch(options),
    markReviewAnalyzed: (options) => repository.markReviewAnalyzed(options),
    markReviewIrrelevant: (reviewId) => repository.markReviewIrrelevant(reviewId),
    markReviewFailed: (options) => repository.markReviewFailed(options),
    findUnaggregatedAnalyzedReviews: (limit) =>
      repository.findUnaggregatedAnalyzedReviews(limit),
    markReviewAggregated: (reviewId, now) =>
      repository.markReviewAggregated(reviewId, now),
    countByStatus: () => repository.countByStatus(),
  };

  return {
    routes,
    api,
    repository,
    jobs: [new CollectReviewsJob(api)],
  };
}

