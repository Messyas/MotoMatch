import type { Aspect, HardConstraint } from "../../recommender";

export interface ExtractedCriteria {
  readonly constraints: readonly HardConstraint[];
  readonly prioritizedAspects: readonly { readonly aspect: Aspect; readonly weight: number }[];
  readonly rawKeywords: readonly string[];
}

export interface CriteriaExtractor {
  extract(message: string): Promise<ExtractedCriteria>;
}
