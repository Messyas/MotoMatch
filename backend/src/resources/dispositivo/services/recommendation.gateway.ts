import axios, { AxiosError } from "axios";
import { RecommendationRequest, RecommendationServiceScore } from "./recommendation.types";

/**
 * Camada responsável por encapsular a chamada HTTP ao serviço Python.
 */
export interface RecommendationGateway {
  scoreDevices(
    request: RecommendationRequest
  ): Promise<RecommendationServiceScore[] | null>;
}

type GatewayConfig = {
  url: string;
  timeoutMs: number;
};

export class HttpRecommendationGateway implements RecommendationGateway {
  constructor(private readonly config: GatewayConfig) {}

  async scoreDevices(
    request: RecommendationRequest
  ): Promise<RecommendationServiceScore[] | null> {
    try {
      const response = await axios.post<{ scores?: RecommendationServiceScore[] }>(
        this.config.url,
        request,
        { timeout: this.config.timeoutMs }
      );
      if (Array.isArray(response.data?.scores)) {
        return response.data.scores;
      }
      return null;
    } catch (error) {
      const err = error as AxiosError;
      const details = err.response?.data ?? err.message;
      console.error("[RecommendationGateway] Falha ao chamar serviço externo:", details);
      return null;
    }
  }
}

export function createDefaultRecommendationGateway(): RecommendationGateway {
  const url =
    process.env.RECOMMENDATION_SERVICE_URL?.trim() ??
    "http://127.0.0.1:8000/ml/score-dispositivos";
  const timeoutEnv = Number(process.env.RECOMMENDATION_SERVICE_TIMEOUT ?? 4000);
  const timeoutMs = Number.isFinite(timeoutEnv) ? timeoutEnv : 4000;
  return new HttpRecommendationGateway({
    url,
    timeoutMs,
  });
}
