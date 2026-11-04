/**
 * The ONLY place that reads environment variables (docs/ARQUITETURA.md §7).
 * Each probe loads just the slice it needs; secrets have no defaults.
 */
import { z } from "zod";
import { InvalidConfigError } from "./errors";

type Env = Record<string, string | undefined>;

const mercadoLivreSchema = z.object({
  clientId: z.string().min(1, "ML_CLIENT_ID is required"),
  clientSecret: z.string().min(1, "ML_CLIENT_SECRET is required"),
  baseUrl: z.url().default("https://api.mercadolibre.com"),
  siteId: z.string().default("MLB"),
});

const youtubeSchema = z.object({
  apiKey: z.string().min(1, "YOUTUBE_API_KEY is required"),
  baseUrl: z.url().default("https://www.googleapis.com/youtube/v3"),
  regionCode: z.string().length(2).default("BR"),
  relevanceLanguage: z.string().default("pt"),
});

export type MercadoLivreConfig = z.infer<typeof mercadoLivreSchema>;
export type YoutubeConfig = z.infer<typeof youtubeSchema>;

function parseOrThrow<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new InvalidConfigError(result.error.issues.map((issue) => issue.message));
  }
  return Object.freeze(result.data);
}

const emptyToUndefined = (value: string | undefined) => (value?.trim() ? value.trim() : undefined);

export function loadMercadoLivreConfig(env: Env = Bun.env): MercadoLivreConfig {
  return parseOrThrow(mercadoLivreSchema, {
    clientId: emptyToUndefined(env.ML_CLIENT_ID) ?? "",
    clientSecret: emptyToUndefined(env.ML_CLIENT_SECRET) ?? "",
    baseUrl: emptyToUndefined(env.ML_API_BASE_URL),
    siteId: emptyToUndefined(env.ML_SITE_ID),
  });
}

export function loadYoutubeConfig(env: Env = Bun.env): YoutubeConfig {
  return parseOrThrow(youtubeSchema, {
    apiKey: emptyToUndefined(env.YOUTUBE_API_KEY) ?? "",
    baseUrl: emptyToUndefined(env.YOUTUBE_API_BASE_URL),
    regionCode: emptyToUndefined(env.YOUTUBE_REGION_CODE),
    relevanceLanguage: emptyToUndefined(env.YOUTUBE_RELEVANCE_LANGUAGE),
  });
}
