import { z } from "zod";
import { ALL_ASPECTS, type Aspect } from "../../recommender";
import type { CriteriaExtractor, ExtractedCriteria } from "../domain/criteria-extractor";
import { RuleBasedCriteriaExtractor } from "../domain/rule-based-criteria-extractor";
import { buildCriteriaExtractionPrompt } from "./criteria-extractor.prompt";

const geminiResponseSchema = z.object({
  constraints: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("maxPrice"), value: z.number().int().positive() }),
        z.object({ kind: z.literal("minPrice"), value: z.number().int().positive() }),
        z.object({ kind: z.literal("requires5g") }),
        z.object({ kind: z.literal("minRamGb"), value: z.number().positive() }),
        z.object({ kind: z.literal("minStorageGb"), value: z.number().positive() }),
        z.object({ kind: z.literal("brand"), value: z.string().min(1) }),
      ]),
    )
    .default([]),
  prioritizedAspects: z
    .array(
      z.object({
        aspect: z.enum(ALL_ASPECTS as unknown as [string, ...string[]]),
        weight: z.number().min(0).max(1),
      }),
    )
    .default([]),
  rawKeywords: z.array(z.string()).default([]),
});

export type HttpFetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface GeminiCriteriaExtractorOptions {
  readonly apiKey: string;
  readonly model?: string;
  readonly timeoutMs?: number;
  readonly fetcher?: HttpFetcher;
}

export class GeminiCriteriaExtractor implements CriteriaExtractor {
  private readonly fallback = new RuleBasedCriteriaExtractor();
  private readonly fetcher: HttpFetcher;

  constructor(private readonly options: GeminiCriteriaExtractorOptions) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async extract(message: string): Promise<ExtractedCriteria> {
    if (!this.options.apiKey || !message.trim()) {
      return this.fallback.extract(message);
    }

    const model = this.options.model ?? "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.options.apiKey}`;
    const prompt = buildCriteriaExtractionPrompt(message);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 5000);

      const res = await this.fetcher(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return this.fallback.extract(message);
      }

      const body = (await res.json()) as any;
      const rawText = body.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return this.fallback.extract(message);
      }

      const parsed = JSON.parse(rawText);
      const validated = geminiResponseSchema.safeParse(parsed);
      if (!validated.success) {
        return this.fallback.extract(message);
      }

      return {
        constraints: validated.data.constraints,
        prioritizedAspects: validated.data.prioritizedAspects.map((p) => ({
          aspect: p.aspect as Aspect,
          weight: p.weight,
        })),
        rawKeywords: validated.data.rawKeywords,
      };
    } catch {
      // In case of network error, abort or parse failure, gracefully fall back to rule-based extraction
      return this.fallback.extract(message);
    }
  }
}
