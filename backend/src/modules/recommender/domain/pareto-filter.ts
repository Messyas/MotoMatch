import type { DeviceWithSpecs } from "../../catalog";
import type { Aspect, AspectWeights } from "./aspect";

export interface ScoredCandidate {
  readonly device: DeviceWithSpecs;
  readonly aspectScores: Record<Aspect, number>;
  readonly utility: number;
}

export interface ParetoDroppedItem {
  readonly deviceId: string;
  readonly brand: string;
  readonly model: string;
  readonly dominatedByBrand: string;
  readonly dominatedByModel: string;
  readonly reason: string;
}

export interface ParetoResult {
  readonly nonDominated: readonly ScoredCandidate[];
  readonly dropped: readonly ParetoDroppedItem[];
}

export function applyParetoFilter(
  candidates: readonly ScoredCandidate[],
  weights: AspectWeights,
): ParetoResult {
  // Only check aspects that have meaningful user/default weight (> 0.05)
  const activeAspects = (Object.keys(weights) as Aspect[]).filter((a) => weights[a] > 0.05);

  const nonDominated: ScoredCandidate[] = [];
  const dropped: ParetoDroppedItem[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const current = candidates[i]!;
    let isDominated = false;

    for (let j = 0; j < candidates.length; j++) {
      if (i === j) continue;
      const other = candidates[j]!;

      // Condition 1: Other is cheaper or same price
      const priceBetterOrEqual = other.device.priceCents <= current.device.priceCents;
      if (!priceBetterOrEqual) continue;

      // Condition 2: Other is >= in all active weighted aspects
      let allAspectsBetterOrEqual = true;
      let hasStrictAdvantage = other.device.priceCents < current.device.priceCents;

      for (const aspect of activeAspects) {
        const otherScore = other.aspectScores[aspect];
        const currentScore = current.aspectScores[aspect];

        if (otherScore < currentScore - 0.001) {
          allAspectsBetterOrEqual = false;
          break;
        }
        if (otherScore > currentScore + 0.001) {
          hasStrictAdvantage = true;
        }
      }

      if (allAspectsBetterOrEqual && hasStrictAdvantage) {
        isDominated = true;
        dropped.push({
          deviceId: current.device.id,
          brand: current.device.brand,
          model: current.device.model,
          dominatedByBrand: other.device.brand,
          dominatedByModel: other.device.model,
          reason: `${current.device.model} foi descartado porque o ${other.device.model} oferece specs iguais ou melhores com preço menor ou equivalente.`,
        });
        break;
      }
    }

    if (!isDominated) {
      nonDominated.push(current);
    }
  }

  return { nonDominated, dropped };
}
