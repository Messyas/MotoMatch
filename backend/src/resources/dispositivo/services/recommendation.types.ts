/**
 * Tipos usados no contrato com o microserviço de recomendação em Python.
 */
export type RecommendationServiceCriterion = {
  tipo: string;
  descricao: string;
};

export type RecommendationServiceScore = {
  id: string;
  finalScore: number;
  matchScore: number;
  perfilMatchPercent: number;
  criteriosMatchPercent?: number;
  specFit: number;
  opinionSim: number;
  justificativas: string[];
  matchExplanation: {
    specFit: number;
    opinionSim: number;
    weights: Record<string, number>;
    perCriterion: { tipo: string; score: number }[];
  };
};

export type RecommendationServiceDevicePayload = {
  id: string;
  preco?: number;
  caracteristicas: RecommendationServiceCriterion[];
  aspect_scores?: Partial<
    Record<"camera" | "bateria" | "preco" | "desempenho", number>
  >;
};

export type RecommendationRequest = {
  criterios: RecommendationServiceCriterion[];
  dispositivos: RecommendationServiceDevicePayload[];
};
