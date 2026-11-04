export type Aspect =
  | "battery"
  | "camera"
  | "performance"
  | "screen"
  | "storage"
  | "valueForMoney";

export const ALL_ASPECTS: readonly Aspect[] = [
  "battery",
  "camera",
  "performance",
  "screen",
  "storage",
  "valueForMoney",
] as const;

export type AspectWeights = Record<Aspect, number>;

export const DEFAULT_ASPECT_WEIGHTS: Readonly<AspectWeights> = Object.freeze({
  battery: 0.2,
  camera: 0.2,
  performance: 0.2,
  screen: 0.15,
  storage: 0.1,
  valueForMoney: 0.15,
});

/**
 * Lambda: weight of technical specs vs user reviews opinion (0.0 to 1.0)
 * Storage is almost 1.0 (specs dominated), Camera is 0.5 (mixed specs + real photo reviews)
 */
export const DEFAULT_SPEC_VS_OPINION_LAMBDAS: Readonly<Record<Aspect, number>> = Object.freeze({
  storage: 0.95,
  battery: 0.6,
  performance: 0.6,
  screen: 0.7,
  camera: 0.5,
  valueForMoney: 0.4,
});

/**
 * Bayesian prior score mu0 (scale 1.0 to 5.0) before reviews accumulate
 */
export const DEFAULT_ASPECT_PRIORS: Readonly<Record<Aspect, number>> = Object.freeze({
  battery: 3.8,
  performance: 3.9,
  camera: 3.7,
  screen: 4.0,
  storage: 4.1,
  valueForMoney: 3.8,
});

export function normalizeWeights(weights: Partial<AspectWeights>): AspectWeights {
  const merged: AspectWeights = {
    ...DEFAULT_ASPECT_WEIGHTS,
    ...weights,
  };

  // Clamp to >= 0
  for (const aspect of ALL_ASPECTS) {
    if (merged[aspect] < 0 || isNaN(merged[aspect])) {
      merged[aspect] = 0;
    }
  }

  const sum = Object.values(merged).reduce((acc, w) => acc + w, 0);
  if (sum <= 0) {
    return { ...DEFAULT_ASPECT_WEIGHTS };
  }

  const normalized: Partial<AspectWeights> = {};
  for (const aspect of ALL_ASPECTS) {
    normalized[aspect] = Number((merged[aspect] / sum).toFixed(4));
  }

  return normalized as AspectWeights;
}
