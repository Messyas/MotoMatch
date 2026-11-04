import { describe, expect, test } from "bun:test";
import { loadMercadoLivreConfig, loadYoutubeConfig } from "./config";
import { InvalidConfigError } from "./errors";

describe("config", () => {
  test("applies defaults for non-secret values", () => {
    const config = loadYoutubeConfig({ YOUTUBE_API_KEY: "key" });
    expect(config).toEqual({
      apiKey: "key",
      baseUrl: "https://www.googleapis.com/youtube/v3",
      regionCode: "BR",
      relevanceLanguage: "pt",
    });
  });

  test("lists every missing secret in one descriptive error", () => {
    try {
      loadMercadoLivreConfig({ ML_CLIENT_ID: "  " });
      throw new Error("expected InvalidConfigError");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidConfigError);
      expect((error as Error).message).toContain("ML_CLIENT_ID is required");
      expect((error as Error).message).toContain("ML_CLIENT_SECRET is required");
    }
  });

  test("rejects an invalid base URL", () => {
    expect(() => loadMercadoLivreConfig({ ML_CLIENT_ID: "a", ML_CLIENT_SECRET: "b", ML_API_BASE_URL: "not-a-url" })).toThrow(
      InvalidConfigError,
    );
  });

  test("returns a frozen object", () => {
    expect(Object.isFrozen(loadYoutubeConfig({ YOUTUBE_API_KEY: "k" }))).toBe(true);
  });
});
