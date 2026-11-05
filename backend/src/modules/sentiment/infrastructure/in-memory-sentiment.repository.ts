import type { AspectAccumulator } from "../domain/bayesian-accumulator";
import type { ReviewAspect } from "../domain/sentiment-analyzer";
import type {
  IncrementDeviceAspectStatsInput,
  SentimentRepository,
} from "../domain/sentiment.repository";

export class InMemorySentimentRepository implements SentimentRepository {
  private aspects = new Map<string, ReviewAspect>(); // key: `${reviewId}:${aspect}`
  private deviceStats = new Map<string, AspectAccumulator>(); // key: `${deviceId}:${aspect}`

  async saveAspects(aspects: ReviewAspect[]): Promise<void> {
    for (const a of aspects) {
      this.aspects.set(`${a.reviewId}:${a.aspect}`, a);
    }
  }

  async findAspectsByReviewId(reviewId: string): Promise<ReviewAspect[]> {
    const results: ReviewAspect[] = [];
    for (const [key, aspect] of this.aspects.entries()) {
      if (key.startsWith(`${reviewId}:`)) {
        results.push(aspect);
      }
    }
    return results;
  }

  async incrementDeviceAspectStats(
    input: IncrementDeviceAspectStatsInput,
  ): Promise<void> {
    const key = `${input.deviceId}:${input.aspect}`;
    const current = this.deviceStats.get(key) ?? { sumW: 0, sumWx: 0, n: 0 };
    this.deviceStats.set(key, {
      sumW: current.sumW + input.sumW,
      sumWx: current.sumWx + input.sumWx,
      n: current.n + input.count,
    });
  }

  async findDeviceAspectStats(
    deviceId: string,
  ): Promise<Map<string, AspectAccumulator>> {
    const map = new Map<string, AspectAccumulator>();
    for (const [key, stats] of this.deviceStats.entries()) {
      if (key.startsWith(`${deviceId}:`)) {
        const aspect = key.split(":")[1]!;
        map.set(aspect, stats);
      }
    }
    return map;
  }

  async recalculateDeviceAspectStats(_deviceId?: string): Promise<void> {
    // In-memory recalculation is a no-op or re-aggregation
  }
}
