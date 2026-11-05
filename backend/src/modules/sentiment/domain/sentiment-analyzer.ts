import type { ReviewAspectType } from "../../../locales/pt-BR/review-vocabulary";

export type SentimentPolarity = "positive" | "negative" | "neutral";

export interface ReviewAspect {
  readonly reviewId: string;
  readonly aspect: ReviewAspectType;
  readonly score: number; // 1 to 5
  readonly sentiment: SentimentPolarity;
  readonly confidence: number;
}

export interface SentimentAnalyzer {
  analyzeBatch(
    reviews: Array<{ id: string; content: string }>,
  ): Promise<Map<string, ReviewAspect[]>>;
}
