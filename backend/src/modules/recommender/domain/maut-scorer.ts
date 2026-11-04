import type { DeviceWithSpecs } from "../../catalog";
import {
  ALL_ASPECTS,
  type Aspect,
  type AspectWeights,
  DEFAULT_ASPECT_PRIORS,
  DEFAULT_SPEC_VS_OPINION_LAMBDAS,
} from "./aspect";
import { type CatalogStats, computeSpecScore } from "./percentile-normalizer";

export interface AspectScoreDetail {
  readonly aspect: Aspect;
  readonly specScore: number;
  readonly opinionScore: number;
  readonly compositeScore: number;
  readonly weight: number;
  readonly explanation: string;
}

export interface ScoredDeviceResult {
  readonly device: DeviceWithSpecs;
  readonly utility: number;
  readonly fitPercent: number;
  readonly aspectScores: Record<Aspect, number>;
  readonly details: readonly AspectScoreDetail[];
  readonly topAspects: readonly Aspect[];
}

export interface MautScorerInput {
  readonly device: DeviceWithSpecs;
  readonly weights: AspectWeights;
  readonly catalogStats: CatalogStats;
  readonly opinionScores?: Partial<Record<Aspect, number>>;
  readonly collectiveBonus?: number;
}

function explainScore(aspect: Aspect, score: number): string {
  const level =
    score >= 0.8
      ? "excelente"
      : score >= 0.65
        ? "muito bom"
        : score >= 0.5
          ? "equilibrado"
          : "básico";

  switch (aspect) {
    case "battery":
      return `Autonomia de bateria ${level}`;
    case "camera":
      return `Conjunto de câmeras ${level}`;
    case "performance":
      return `Desempenho e velocidade ${level}`;
    case "screen":
      return `Qualidade de tela ${level}`;
    case "storage":
      return `Capacidade de armazenamento ${level}`;
    case "valueForMoney":
      return `Custo-benefício ${level}`;
  }
}

export function scoreDeviceMaut(input: MautScorerInput): ScoredDeviceResult {
  const { device, weights, catalogStats, opinionScores = {}, collectiveBonus = 0 } = input;

  const aspectScores: Partial<Record<Aspect, number>> = {};
  const details: AspectScoreDetail[] = [];
  let totalUtility = 0;

  for (const aspect of ALL_ASPECTS) {
    const lambda = DEFAULT_SPEC_VS_OPINION_LAMBDAS[aspect];
    const specScore = computeSpecScore(device, aspect, catalogStats);

    // Opinion score normalized to 0.0 - 1.0 (from 1 - 5 stars)
    const rawOpinion = opinionScores[aspect] ?? DEFAULT_ASPECT_PRIORS[aspect];
    const normalizedOpinion = Number(Math.max(0, Math.min(1.0, (rawOpinion - 1) / 4)).toFixed(4));

    const compositeScore = Number(
      (lambda * specScore + (1 - lambda) * normalizedOpinion).toFixed(4),
    );

    aspectScores[aspect] = compositeScore;

    const weight = weights[aspect] ?? 0;
    totalUtility += compositeScore * weight;

    details.push({
      aspect,
      specScore,
      opinionScore: normalizedOpinion,
      compositeScore,
      weight,
      explanation: explainScore(aspect, compositeScore),
    });
  }

  // Add limited collective bonus (capped within -0.05 to +0.05)
  const clampedBonus = Math.max(-0.05, Math.min(0.05, collectiveBonus));
  const finalUtility = Number(Math.max(0.05, Math.min(1.0, totalUtility + clampedBonus)).toFixed(4));
  const fitPercent = Math.round(finalUtility * 100);

  // Top 2 strongest aspects for highlight
  const topAspects = [...details]
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 2)
    .map((d) => d.aspect);

  return {
    device,
    utility: finalUtility,
    fitPercent,
    aspectScores: aspectScores as Record<Aspect, number>,
    details,
    topAspects,
  };
}
