import { z } from "zod";
import type { ReviewAspectType } from "../../../locales/pt-BR/review-vocabulary";
import type {
  ReviewAspect,
  SentimentAnalyzer,
} from "../domain/sentiment-analyzer";
import { RuleBasedSentimentAnalyzer } from "../domain/rule-based-sentiment-analyzer";
import {
  buildSentimentAnalysisPrompt,
  SENTIMENT_ANALYSIS_SYSTEM_PROMPT,
} from "./sentiment.prompt";

export type HttpFetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface GeminiSentimentAnalyzerDeps {
  readonly apiKey: string;
  readonly model?: string;
  readonly fetcher?: HttpFetcher;
  readonly fallbackAnalyzer?: SentimentAnalyzer;
}

const batchAspectOutputSchema = z.array(
  z.object({
    reviewId: z.string(),
    aspects: z.array(
      z.object({
        aspect: z.enum([
          "battery",
          "camera",
          "performance",
          "display",
          "audio",
          "software",
          "build",
          "connectivity",
          "valueForMoney",
        ]),
        score: z.number().int().min(1).max(5),
        sentiment: z.enum(["positive", "negative", "neutral"]),
        confidence: z.number().min(0).max(1).default(0.9),
      }),
    ),
  }),
);

export class GeminiSentimentAnalyzer implements SentimentAnalyzer {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetcher: HttpFetcher;
  private readonly fallback: SentimentAnalyzer;

  constructor(deps: GeminiSentimentAnalyzerDeps) {
    this.apiKey = deps.apiKey;
    this.model = deps.model ?? "gemini-2.5-flash";
    this.fetcher = deps.fetcher ?? fetch;
    this.fallback = deps.fallbackAnalyzer ?? new RuleBasedSentimentAnalyzer();
  }

  async analyzeBatch(
    reviews: Array<{ id: string; content: string }>,
  ): Promise<Map<string, ReviewAspect[]>> {
    if (reviews.length === 0) return new Map();

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const prompt = buildSentimentAnalysisPrompt(reviews);

      const response = await this.fetcher(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SENTIMENT_ANALYSIS_SYSTEM_PROMPT }],
          },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        return this.fallback.analyzeBatch(reviews);
      }

      const data = (await response.json()) as any;
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        return this.fallback.analyzeBatch(reviews);
      }

      const parsed = JSON.parse(rawText);
      const validated = batchAspectOutputSchema.safeParse(parsed);

      if (!validated.success) {
        return this.fallback.analyzeBatch(reviews);
      }

      const result = new Map<string, ReviewAspect[]>();
      for (const item of validated.data) {
        result.set(
          item.reviewId,
          item.aspects.map((a) => ({
            reviewId: item.reviewId,
            aspect: a.aspect as ReviewAspectType,
            score: a.score,
            sentiment: a.sentiment,
            confidence: a.confidence,
          })),
        );
      }

      return result;
    } catch {
      return this.fallback.analyzeBatch(reviews);
    }
  }
}
