export interface ProcessorTierRule {
  readonly pattern: RegExp;
  readonly score: number;
  readonly tierName: string;
}

export const PROCESSOR_TIER_RULES: readonly ProcessorTierRule[] = [
  // Tier 1: Ultra Flagship (1.00)
  {
    pattern: /(snapdragon (8 elite|8 gen [2-4])|apple (a1[7-9]|m[1-4])|dimensity 9[2-4]00|tensor g4)/i,
    score: 1.0,
    tierName: "Flagship Ultra",
  },
  // Tier 2: Premium Performance (0.85)
  {
    pattern: /(snapdragon (8\+? gen 1|7\+? gen [2-3]|888|870)|apple a1[4-6]|dimensity 8[2-3]00|exynos 2[24]00|tensor g[2-3])/i,
    score: 0.85,
    tierName: "High End",
  },
  // Tier 3: Upper Mid-range (0.70)
  {
    pattern: /(snapdragon (7s gen 2|778g|6 gen 1)|dimensity (7050|7200|7300|1080)|exynos (1380|1480|1580)|tensor g1)/i,
    score: 0.7,
    tierName: "Mid-Range Upper",
  },
  // Tier 4: Standard Mid-range (0.55)
  {
    pattern: /(snapdragon (695|6s gen 3|4 gen [1-2])|dimensity (6080|6100\+|700|810)|helio g99|exynos 1280)/i,
    score: 0.55,
    tierName: "Mid-Range Standard",
  },
  // Tier 5: Entry-Mid (0.40)
  {
    pattern: /(snapdragon 680|helio (g8[58]|g80)|unisoc (t606|t616|t612)|dimensity 6020)/i,
    score: 0.4,
    tierName: "Entry-Mid",
  },
  // Tier 6: Basic (0.25)
  {
    pattern: /(helio (g3[56]|p35)|unisoc (sc9863a|t310)|snapdragon 439)/i,
    score: 0.25,
    tierName: "Basic",
  },
] as const;

export function scoreProcessor(processorName?: string | null, benchmarkScore?: number | null): number {
  if (benchmarkScore && benchmarkScore > 0) {
    // AnTuTu score normalization: 200k = ~0.25, 2M+ = 1.0
    const clamped = Math.min(Math.max(benchmarkScore, 100_000), 2_200_000);
    return Number((clamped / 2_200_000).toFixed(4));
  }

  if (!processorName || !processorName.trim()) {
    return 0.5; // neutral default
  }

  const normalized = processorName.trim();
  for (const rule of PROCESSOR_TIER_RULES) {
    if (rule.pattern.test(normalized)) {
      return rule.score;
    }
  }

  return 0.5;
}
