import {
  SENTIMENT_MODIFIERS,
  type ReviewAspectType,
} from "../../../locales/pt-BR/review-vocabulary";
import { findAspects, normalizeText } from "../../reviews";
import type {
  ReviewAspect,
  SentimentAnalyzer,
  SentimentPolarity,
} from "./sentiment-analyzer";

export class RuleBasedSentimentAnalyzer implements SentimentAnalyzer {
  async analyzeBatch(
    reviews: Array<{ id: string; content: string }>,
  ): Promise<Map<string, ReviewAspect[]>> {
    const map = new Map<string, ReviewAspect[]>();

    for (const r of reviews) {
      const normalized = normalizeText(r.content);
      const aspects = findAspects(normalized);
      const aspectsList: ReviewAspect[] = [];

      for (const aspect of aspects) {
        const { sentiment, score } = this.detectAspectSentiment(
          normalized,
          aspect,
        );
        aspectsList.push({
          reviewId: r.id,
          aspect,
          score,
          sentiment,
          confidence: 0.8,
        });
      }

      map.set(r.id, aspectsList);
    }

    return map;
  }

  private detectAspectSentiment(
    normalized: string,
    _aspect: ReviewAspectType,
  ): { sentiment: SentimentPolarity; score: number } {
    const words = ` ${normalized} `;
    let posCount = 0;
    let negCount = 0;

    for (const term of SENTIMENT_MODIFIERS.positive) {
      if (words.includes(` ${term} `)) posCount++;
    }

    for (const term of SENTIMENT_MODIFIERS.negative) {
      if (words.includes(` ${term} `)) negCount++;
    }

    if (posCount > negCount) {
      return { sentiment: "positive", score: 5 };
    }
    if (negCount > posCount) {
      return { sentiment: "negative", score: 1 };
    }
    return { sentiment: "neutral", score: 3 };
  }
}
