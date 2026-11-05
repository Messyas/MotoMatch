export interface IntentCriteriaInput {
  readonly maxPriceCents?: number;
  readonly minPriceCents?: number;
  readonly has5G?: boolean;
  readonly minRamGb?: number;
  readonly minStorageGb?: number;
  readonly brand?: string;
  readonly aspectWeights?: Partial<Record<string, number>>;
}

/**
 * Computes a discretized canonical intent signature string.
 * Example: "brand:samsung|5g:true|price:<=2000|ram:>=8|bat:high"
 * Used for anonymous collective learning (PLANO_ATUALIZACAO §3.6).
 */
export function computeIntentSignature(input: IntentCriteriaInput): string {
  const parts: string[] = [];

  if (input.brand) {
    parts.push(`brand:${input.brand.trim().toLowerCase()}`);
  }

  if (input.has5G) {
    parts.push("5g:true");
  }

  if (input.minRamGb) {
    parts.push(`ram:>=${input.minRamGb}`);
  }

  if (input.minStorageGb) {
    parts.push(`storage:>=${input.minStorageGb}`);
  }

  if (input.maxPriceCents) {
    const priceReais = Math.round(input.maxPriceCents / 100);
    // Discretize into buckets of 500 reais
    const bucket = Math.ceil(priceReais / 500) * 500;
    parts.push(`price:<=${bucket}`);
  }

  if (input.minPriceCents) {
    const priceReais = Math.round(input.minPriceCents / 100);
    const bucket = Math.floor(priceReais / 500) * 500;
    parts.push(`price:>=${bucket}`);
  }

  if (input.aspectWeights) {
    const sortedAspects: Array<[string, number]> = [];
    for (const [aspect, weight] of Object.entries(input.aspectWeights)) {
      if (typeof weight === "number" && weight > 0.15) {
        sortedAspects.push([aspect, weight]);
      }
    }
    sortedAspects.sort((a, b) => b[1] - a[1]);

    for (const [aspect, weight] of sortedAspects) {
      const shortAspect = aspect.slice(0, 3);
      const level = weight >= 0.3 ? "high" : "med";
      parts.push(`${shortAspect}:${level}`);
    }
  }

  if (parts.length === 0) {
    return "default";
  }

  // Deterministic sort for canonical equality
  return parts.sort().join("|");
}
