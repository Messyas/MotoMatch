import { type Aspect, type AspectWeights, DEFAULT_ASPECT_WEIGHTS, normalizeWeights } from "./aspect";
import type { HardConstraint } from "./hard-constraints";

export interface RecommendationQuery {
  readonly constraints: readonly HardConstraint[];
  readonly weights: AspectWeights;
  readonly referenceDeviceId?: string;
  readonly limit: number;
}

export class RecommendationQueryBuilder {
  private constraints: HardConstraint[] = [];
  private weights: AspectWeights = { ...DEFAULT_ASPECT_WEIGHTS };
  private referenceDeviceId?: string;
  private limit = 3;

  withMaxPrice(priceCents: number): this {
    this.constraints.push({ kind: "maxPrice", value: priceCents });
    return this;
  }

  withMinPrice(priceCents: number): this {
    this.constraints.push({ kind: "minPrice", value: priceCents });
    return this;
  }

  require5g(): this {
    this.constraints.push({ kind: "requires5g" });
    return this;
  }

  withMinRam(gb: number): this {
    this.constraints.push({ kind: "minRamGb", value: gb });
    return this;
  }

  withMinStorage(gb: number): this {
    this.constraints.push({ kind: "minStorageGb", value: gb });
    return this;
  }

  withBrand(brand: string): this {
    this.constraints.push({ kind: "brand", value: brand });
    return this;
  }

  prioritize(aspect: Aspect, weight: number): this {
    this.weights = { ...this.weights, [aspect]: weight };
    return this;
  }

  similarTo(deviceId: string): this {
    this.referenceDeviceId = deviceId;
    return this;
  }

  withLimit(limit: number): this {
    this.limit = Math.max(1, Math.min(limit, 20));
    return this;
  }

  build(): RecommendationQuery {
    return {
      constraints: [...this.constraints],
      weights: normalizeWeights(this.weights),
      referenceDeviceId: this.referenceDeviceId,
      limit: this.limit,
    };
  }
}

export const aRecommendationQuery = () => new RecommendationQueryBuilder();
