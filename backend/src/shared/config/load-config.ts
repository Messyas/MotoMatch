import { InvalidConfigError } from "../errors/app-error";
import { type AppConfig, configSchema } from "./config.schema";

export function mapEnvToConfigShape(env: Record<string, string | undefined>) {
  return {
    server: {
      port: env.PORT,
      corsOrigin: env.CORS_ORIGIN,
    },
    database: {
      url: env.DATABASE_URL,
      maxConnections: env.DATABASE_MAX_CONNECTIONS,
    },
    admin: {
      key: env.ADMIN_KEY,
    },
    cron: {
      secret: env.CRON_SECRET,
    },
    gemini: {
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      embeddingModel: env.GEMINI_EMBEDDING_MODEL,
      dailyRequestLimit: env.GEMINI_DAILY_LIMIT,
    },
    youtube: {
      apiKey: env.YOUTUBE_API_KEY,
      dailyUnitLimit: env.YOUTUBE_DAILY_LIMIT,
    },
    mercadoLivre: {
      clientId: env.ML_CLIENT_ID || undefined,
      clientSecret: env.ML_CLIENT_SECRET || undefined,
      baseUrl: env.ML_BASE_URL,
    },
    credentials: {
      encryptionKey: env.CREDENTIALS_ENC_KEY,
    },
    scheduler: {
      tickMaxSeconds: env.TICK_MAX_SECONDS,
    },
  };
}

export function loadConfig(env: Record<string, string | undefined> = Bun.env): AppConfig {
  const result = configSchema.safeParse(mapEnvToConfigShape(env));
  if (!result.success) {
    throw new InvalidConfigError(
      result.error.issues.map((i) => ({ path: i.path, message: i.message })),
    );
  }
  return Object.freeze(result.data);
}
