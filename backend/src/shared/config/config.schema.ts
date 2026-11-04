import { z } from "zod";

export const configSchema = z.object({
  server: z.object({
    port: z.coerce.number().int().default(3001),
    corsOrigin: z.string().url(),
  }),
  database: z.object({
    url: z.string().url(),
    maxConnections: z.coerce.number().int().max(10).default(5),
  }),
  admin: z.object({
    key: z.string().min(24),
  }),
  cron: z.object({
    secret: z.string().min(24),
  }),
  gemini: z.object({
    apiKey: z.string().min(1),
    model: z.string().default("gemini-2.5-flash"),
    dailyRequestLimit: z.coerce.number().int().positive().default(1500),
  }),
  youtube: z.object({
    apiKey: z.string().min(1),
    dailyUnitLimit: z.coerce.number().int().default(10_000),
  }),
  mercadoLivre: z.object({
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    baseUrl: z.string().url().default("https://api.mercadolibre.com"),
  }),
  credentials: z.object({
    encryptionKey: z.string().length(64),
  }),
  scheduler: z.object({
    tickMaxSeconds: z.coerce.number().int().positive().default(60),
  }),
});

export type AppConfig = z.infer<typeof configSchema>;
