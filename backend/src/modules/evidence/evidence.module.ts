import type { DatabaseClient } from "../../shared/db/client";
import type { EventBus } from "../../shared/events/event-bus";
import type { Logger } from "../../shared/logging/logger";
import { EmbedPendingReviewsUseCase } from "./application/embed-pending-reviews.use-case";
import { FindEvidenceUseCase } from "./application/find-evidence.use-case";
import {
  type EmbeddingService,
  InMemoryEmbeddingService,
} from "./domain/embedding.service";
import type { EvidenceRepository } from "./domain/evidence.repository";
import { createEvidenceRoutes } from "./http/evidence.routes";
import { GeminiEmbeddingService } from "./infrastructure/gemini-embedding.service";
import { InMemoryEvidenceRepository } from "./infrastructure/in-memory-evidence.repository";
import { PostgresEvidenceRepository } from "./infrastructure/postgres-evidence.repository";
import { EmbedPendingJob } from "./jobs/embed-pending.job";

export interface EvidenceModuleDeps {
  readonly db?: DatabaseClient;
  readonly repository?: EvidenceRepository;
  readonly embeddingService?: EmbeddingService;
  readonly geminiApiKey?: string;
  readonly geminiEmbeddingModel?: string;
  readonly eventBus?: EventBus;
  readonly logger: Logger;
}

export interface EvidenceModule {
  readonly repository: EvidenceRepository;
  readonly embeddingService: EmbeddingService;
  readonly findEvidenceUseCase: FindEvidenceUseCase;
  readonly embedPendingReviewsUseCase: EmbedPendingReviewsUseCase;
  readonly jobs: [EmbedPendingJob];
  readonly routes: ReturnType<typeof createEvidenceRoutes>;
}

export function createEvidenceModule(deps: EvidenceModuleDeps): EvidenceModule {
  const repository =
    deps.repository ??
    (deps.db
      ? new PostgresEvidenceRepository(deps.db)
      : new InMemoryEvidenceRepository());

  const embeddingService =
    deps.embeddingService ??
    (deps.geminiApiKey
      ? new GeminiEmbeddingService({
          apiKey: deps.geminiApiKey,
          model: deps.geminiEmbeddingModel,
          logger: deps.logger,
        })
      : new InMemoryEmbeddingService());

  const embedPendingReviewsUseCase = new EmbedPendingReviewsUseCase({
    evidenceRepository: repository,
    embeddingService,
    logger: deps.logger,
  });

  const findEvidenceUseCase = new FindEvidenceUseCase({
    evidenceRepository: repository,
    embeddingService,
  });

  const embedPendingJob = new EmbedPendingJob(embedPendingReviewsUseCase);
  const routes = createEvidenceRoutes(findEvidenceUseCase);

  // React to review.analyzed event
  if (deps.eventBus) {
    deps.eventBus.subscribe("review.analyzed", async () => {
      try {
        await embedPendingReviewsUseCase.execute();
      } catch (err) {
        deps.logger.error("evidence.embed_on_event_failed", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  return {
    repository,
    embeddingService,
    findEvidenceUseCase,
    embedPendingReviewsUseCase,
    jobs: [embedPendingJob],
    routes,
  };
}

