import type { CatalogApi } from "../../catalog";
import {
  ALL_ASPECTS,
  type Aspect,
  applyCritiqueRule,
  normalizeWeights,
  type RecommenderApi,
  type ScoredDeviceResult,
} from "../../recommender";
import { type ChatState, INITIAL_CHAT_STATE } from "../domain/chat-state";
import type { CriteriaExtractor } from "../domain/criteria-extractor";
import { detectCritique } from "../domain/critique-detector";

export interface HandleChatMessageInput {
  readonly message: string;
  readonly state?: ChatState;
}

export interface HandleChatMessageResult {
  readonly reply: string;
  readonly state: ChatState;
  readonly results: readonly ScoredDeviceResult[];
  readonly relaxationNotice?: string;
}

export interface HandleChatMessageUseCaseDeps {
  readonly criteriaExtractor: CriteriaExtractor;
  readonly recommenderApi: RecommenderApi;
  readonly catalogApi: CatalogApi;
}

export class HandleChatMessageUseCase {
  constructor(private readonly deps: HandleChatMessageUseCaseDeps) {}

  async execute(input: HandleChatMessageInput): Promise<HandleChatMessageResult> {
    const currentState = input.state ?? INITIAL_CHAT_STATE;
    const critique = detectCritique(input.message);

    // 1. Rapid Critique Path (Without calling LLM)
    if (critique && currentState.referenceDeviceId) {
      const refDevice = await this.deps.catalogApi.findDeviceById(currentState.referenceDeviceId);
      if (refDevice) {
        const updatedQuery = applyCritiqueRule({
          query: {
            constraints: currentState.constraints,
            weights: currentState.weights,
            referenceDeviceId: refDevice.id,
            limit: 3,
          },
          critique,
          referenceDevice: refDevice,
        });

        const recResult = await this.deps.recommenderApi.recommend(updatedQuery);
        const topResult = recResult.items[0];

        const reply = critique.kind === "cheaper"
          ? `Entendido! Ajustei o orçamento para opções mais em conta em relação ao ${refDevice.model}.`
          : critique.kind === "moreOf"
            ? `Certo! Aumentei o foco em ${critique.aspect} mantendo suas preferências anteriores.`
            : `Buscando modelos com perfil e faixa de preço equivalentes ao ${refDevice.model}.`;

        return {
          reply,
          state: {
            constraints: updatedQuery.constraints,
            weights: updatedQuery.weights,
            referenceDeviceId: topResult?.device.id ?? refDevice.id,
          },
          results: recResult.items,
          relaxationNotice: recResult.relaxationNotice,
        };
      }
    }

    // 2. Regular Message Path (Extract criteria)
    const extracted = await this.deps.criteriaExtractor.extract(input.message);

    // Merge constraints: replace constraints of same kind (e.g. maxPrice, brand), append others
    const newConstraintKinds = new Set(extracted.constraints.map((c) => c.kind));
    const mergedConstraints = [
      ...currentState.constraints.filter((c) => !newConstraintKinds.has(c.kind)),
      ...extracted.constraints,
    ];

    // Merge weights
    const mergedWeightsObj = { ...currentState.weights };
    for (const item of extracted.prioritizedAspects) {
      mergedWeightsObj[item.aspect] = (mergedWeightsObj[item.aspect] ?? 0) + item.weight;
    }
    const mergedWeights = normalizeWeights(mergedWeightsObj);

    // Run recommendation engine
    const recResult = await this.deps.recommenderApi.recommend({
      constraints: mergedConstraints,
      weights: mergedWeights,
      limit: 3,
    });

    const topResult = recResult.items[0];
    const topAspectNames = (Object.keys(mergedWeights) as Aspect[])
      .filter((a) => mergedWeights[a] > 0.2)
      .slice(0, 2);

    let reply = "";
    if (recResult.items.length === 0) {
      reply = recResult.relaxationNotice ?? "Não encontrei nenhum aparelho com esses requisitos específicos.";
    } else {
      const aspectHighlight =
        topAspectNames.length > 0 ? ` priorizando ${topAspectNames.join(" e ")}` : "";
      reply = `Encontrei ${recResult.items.length} opções ideais para você${aspectHighlight}:`;
    }

    return {
      reply,
      state: {
        constraints: mergedConstraints,
        weights: mergedWeights,
        referenceDeviceId: topResult?.device.id ?? currentState.referenceDeviceId,
      },
      results: recResult.items,
      relaxationNotice: recResult.relaxationNotice,
    };
  }
}
