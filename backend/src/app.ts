import { Hono } from "hono";
import { cors } from "hono/cors";
import { createCatalogModule, type DeviceRepository } from "./modules/catalog";
import { createChatModule, type CriteriaExtractor } from "./modules/chat";
import { createRecommenderModule } from "./modules/recommender";
import { createReviewsModule, type ReviewRepository } from "./modules/reviews";
import { createSchedulerModule, type SchedulerRepository } from "./modules/scheduler";
import { createSentimentModule, type SentimentRepository } from "./modules/sentiment";
import { createStatusModule } from "./modules/status";
import type { AppConfig } from "./shared/config/config.schema";
import { createDatabase, type Database } from "./shared/db/client";
import { type EventBus, InProcessEventBus } from "./shared/events/event-bus";
import { createAdminAuthMiddleware } from "./shared/http/admin-auth.middleware";
import { createErrorHandler } from "./shared/http/error-handler";
import { type Logger, StructuredLogger } from "./shared/logging/logger";
import { type Clock, SystemClock } from "./shared/time/clock";

export interface AppDeps {
  readonly config: AppConfig;
  readonly clock?: Clock;
  readonly logger?: Logger;
  readonly db?: Database;
  readonly eventBus?: EventBus;
  readonly deviceRepo?: DeviceRepository;
  readonly criteriaExtractor?: CriteriaExtractor;
  readonly reviewRepo?: ReviewRepository;
  readonly sentimentRepo?: SentimentRepository;
  readonly schedulerRepo?: SchedulerRepository;
}

export function createApp(deps: AppDeps) {
  const clock = deps.clock ?? new SystemClock();
  const logger = deps.logger ?? new StructuredLogger();
  const events = deps.eventBus ?? new InProcessEventBus(logger);
  const db =
    deps.db ??
    (deps.deviceRepo || deps.schedulerRepo || deps.reviewRepo
      ? undefined
      : createDatabase(deps.config.database));

  const catalog = createCatalogModule({
    db,
    deviceRepo: deps.deviceRepo,
    events,
    clock,
  });

  const recommender = createRecommenderModule({
    catalog: catalog.api,
  });

  const chat = createChatModule({
    catalog: catalog.api,
    recommender: recommender.api,
    config: {
      apiKey: deps.config.gemini.apiKey,
      model: deps.config.gemini.model,
    },
    criteriaExtractor: deps.criteriaExtractor,
  });

  const reviews = createReviewsModule({
    db,
    repository: deps.reviewRepo,
    clock,
    logger,
    youtubeApiKey: deps.config.youtube.apiKey,
    mercadoLivreConfig: deps.config.mercadoLivre,
  });

  const sentiment = createSentimentModule({
    db,
    repository: deps.sentimentRepo,
    reviewsApi: reviews.api,
    clock,
    logger,
    geminiApiKey: deps.config.gemini.apiKey,
    geminiModel: deps.config.gemini.model,
  });

  const scheduler = createSchedulerModule({
    db,
    repository: deps.schedulerRepo,
    jobs: [...reviews.jobs, ...sentiment.jobs],
    clock,
    logger,
    cronSecret: deps.config.cron.secret,
  });

  const status = createStatusModule({
    schedulerRepository: scheduler.repository,
    reviewRepository: reviews.repository,
    catalogApi: catalog.api,
    clock,
  });

  const app = new Hono();
  app.onError(createErrorHandler(logger));

  app.use(
    "*",
    cors({
      origin: deps.config.server.corsOrigin,
      allowHeaders: ["Content-Type", "Authorization", "X-Admin-Key", "X-Cron-Secret", "Idempotency-Key"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    }),
  );

  // GET /health — lightweight, never touches database (ARQUITETURA §9, PLANO_ATUALIZACAO §10)
  app.get("/health", (c) =>
    c.json({
      status: "ok",
      timestamp: clock.now().toISOString(),
    }),
  );

  // Public Catalog Routes
  app.route("/v1/devices", catalog.routes.publicRoutes);

  // Public Recommender Routes (Direct deterministic MAUT engine)
  app.route("/v1/recommend", recommender.routes);

  // Public Conversational Chat (Gemini criteria extraction + critique rules + MAUT)
  app.route("/v1/chat", chat.routes);

  // System Status Route
  app.route("/", status.routes);

  // Internal Cron Route (/internal/tick)
  app.route("/", scheduler.routes);

  // Protected Admin Routes
  app.use("/v1/admin/*", createAdminAuthMiddleware(deps.config.admin.key));
  app.route("/v1/admin/devices", catalog.routes.adminRoutes);
  app.route("/", reviews.routes);

  return {
    app,
    catalog,
    recommender,
    chat,
    reviews,
    sentiment,
    scheduler,
    status,
    clock,
    logger,
    events,
  };
}
