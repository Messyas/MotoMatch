import type { DeviceWithSpecs } from "../../catalog";
import { type Aspect, normalizeWeights } from "./aspect";
import type { RecommendationQuery } from "./recommendation-query.builder";

export type CritiqueAction =
  | { readonly kind: "moreOf"; readonly aspect: Aspect }
  | { readonly kind: "cheaper" }
  | { readonly kind: "similarTo" };

export interface ApplyCritiqueInput {
  readonly query: RecommendationQuery;
  readonly critique: CritiqueAction;
  readonly referenceDevice: DeviceWithSpecs;
}

export function applyCritiqueRule(input: ApplyCritiqueInput): RecommendationQuery {
  const { query, critique, referenceDevice } = input;

  switch (critique.kind) {
    case "moreOf": {
      const updatedWeights = normalizeWeights({
        ...query.weights,
        [critique.aspect]: query.weights[critique.aspect] + 0.25,
      });

      return {
        ...query,
        weights: updatedWeights,
        referenceDeviceId: referenceDevice.id,
      };
    }

    case "cheaper": {
      const targetPrice = Math.round(referenceDevice.priceCents * 0.9);
      const filteredConstraints = query.constraints.filter((c) => c.kind !== "maxPrice");

      return {
        ...query,
        constraints: [...filteredConstraints, { kind: "maxPrice", value: targetPrice }],
        referenceDeviceId: referenceDevice.id,
      };
    }

    case "similarTo": {
      const priceMin = Math.round(referenceDevice.priceCents * 0.85);
      const priceMax = Math.round(referenceDevice.priceCents * 1.15);
      const filteredConstraints = query.constraints.filter(
        (c) => c.kind !== "maxPrice" && c.kind !== "minPrice",
      );

      return {
        ...query,
        constraints: [
          ...filteredConstraints,
          { kind: "minPrice", value: priceMin },
          { kind: "maxPrice", value: priceMax },
        ],
        referenceDeviceId: referenceDevice.id,
      };
    }
  }
}
