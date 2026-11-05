import { describe, expect, it } from "bun:test";
import { aConfig } from "../../../test/builders/config.builder";
import { InvalidConfigError } from "../errors/app-error";
import { loadConfig } from "./load-config";

describe("loadConfig", () => {
  const validEnv: Record<string, string> = {
    PORT: "3001",
    CORS_ORIGIN: "http://localhost:3000",
    DATABASE_URL: "postgresql://localhost:5432/phonematch",
    DATABASE_MAX_CONNECTIONS: "5",
    ADMIN_KEY: "admin-secret-key-at-least-24-chars",
    CRON_SECRET: "cron-secret-key-at-least-24-chars",
    GEMINI_API_KEY: "gemini-test-key",
    YOUTUBE_API_KEY: "youtube-test-key",
    CREDENTIALS_ENC_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  };

  it("loads valid configuration with defaults for non-secret values", () => {
    const config = loadConfig(validEnv);
    expect(config.server.port).toBe(3001);
    expect(config.server.corsOrigin).toBe("http://localhost:3000");
    expect(config.gemini.model).toBe("gemini-1.5-flash");
    expect(config.gemini.embeddingModel).toBe("text-embedding-004");
    expect(config.gemini.dailyRequestLimit).toBe(1500);
    expect(config.youtube.dailyUnitLimit).toBe(10_000);
    expect(config.scheduler.tickMaxSeconds).toBe(60);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it("throws InvalidConfigError listing all missing required fields", () => {
    expect(() => loadConfig({})).toThrow(InvalidConfigError);
    try {
      loadConfig({});
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidConfigError);
      const configErr = err as InvalidConfigError;
      expect(configErr.code).toBe("INVALID_CONFIG");
      expect(configErr.message).toContain("server.corsOrigin");
      expect(configErr.message).toContain("database.url");
      expect(configErr.message).toContain("admin.key");
      expect(configErr.message).toContain("cron.secret");
    }
  });

  it("rejects invalid URLs and short keys", () => {
    const invalidEnv = {
      ...validEnv,
      CORS_ORIGIN: "not-a-url",
      ADMIN_KEY: "too-short",
    };
    expect(() => loadConfig(invalidEnv)).toThrow(InvalidConfigError);
  });

  it("aConfig() builder generates a valid test configuration", () => {
    const testConfig = aConfig().build();
    expect(testConfig.server.port).toBe(3001);
    expect(testConfig.gemini.apiKey).toBe("test-gemini-key");
  });
});
