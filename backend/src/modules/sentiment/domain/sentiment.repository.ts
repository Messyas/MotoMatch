import type { AspectAccumulator } from "./bayesian-accumulator";
import type { ReviewAspect } from "./sentiment-analyzer";

export interface IncrementDeviceAspectStatsInput {
  readonly deviceId: string;
  readonly aspect: string;
  readonly sumW: number;
  readonly sumWx: number;
  readonly count: number;
  readonly now: Date;
}

export interface SentimentRepository {
  saveAspects(aspects: ReviewAspect[]): Promise<void>;
  findAspectsByReviewId(reviewId: string): Promise<ReviewAspect[]>;
  incrementDeviceAspectStats(
    input: IncrementDeviceAspectStatsInput,
  ): Promise<void>;
  findDeviceAspectStats(
    deviceId: string,
  ): Promise<Map<string, AspectAccumulator>>;
  recalculateDeviceAspectStats(deviceId?: string): Promise<void>;
}
