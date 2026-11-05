import type { AppConfig } from "../../src/shared/config/config.schema";

export class ConfigBuilder {
  private config: AppConfig = {
    server: {
      port: 3001,
      corsOrigin: "http://localhost:3000",
    },
    database: {
      url: "postgresql://postgres:postgres@localhost:5432/phonematch_test?sslmode=disable",
      maxConnections: 5,
    },
    admin: {
      key: "test-admin-key-at-least-24-characters-long",
    },
    cron: {
      secret: "test-cron-secret-at-least-24-characters-long",
    },
    gemini: {
      apiKey: "test-gemini-key",
      model: "gemini-1.5-flash",
      embeddingModel: "text-embedding-004",
      dailyRequestLimit: 1500,
    },
    youtube: {
      apiKey: "test-youtube-key",
      dailyUnitLimit: 10_000,
    },
    mercadoLivre: {
      clientId: "test-ml-client-id",
      clientSecret: "test-ml-client-secret",
      baseUrl: "https://api.mercadolibre.com",
    },
    credentials: {
      encryptionKey: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    },
    scheduler: {
      tickMaxSeconds: 60,
    },
  };

  with<K extends keyof AppConfig>(section: K, patch: Partial<AppConfig[K]>): this {
    this.config = {
      ...this.config,
      [section]: {
        ...this.config[section],
        ...patch,
      },
    };
    return this;
  }

  build(): AppConfig {
    return Object.freeze(JSON.parse(JSON.stringify(this.config)));
  }
}

export function aConfig(): ConfigBuilder {
  return new ConfigBuilder();
}
