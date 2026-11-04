import type { CatalogApi } from "../catalog";
import type { RecommenderApi } from "../recommender";
import {
  type HandleChatMessageInput,
  type HandleChatMessageResult,
  HandleChatMessageUseCase,
} from "./application/handle-chat-message.use-case";
import type { CriteriaExtractor } from "./domain/criteria-extractor";
import { createChatRoutes } from "./http/chat.routes";
import { GeminiCriteriaExtractor } from "./infrastructure/gemini-criteria-extractor";

export interface ChatModuleConfig {
  readonly apiKey: string;
  readonly model?: string;
  readonly timeoutMs?: number;
}

export interface ChatModuleDeps {
  readonly catalog: CatalogApi;
  readonly recommender: RecommenderApi;
  readonly config: ChatModuleConfig;
  readonly criteriaExtractor?: CriteriaExtractor;
}

export interface ChatApi {
  handleMessage(input: HandleChatMessageInput): Promise<HandleChatMessageResult>;
}

export function createChatModule(deps: ChatModuleDeps) {
  const extractor =
    deps.criteriaExtractor ??
    new GeminiCriteriaExtractor({
      apiKey: deps.config.apiKey,
      model: deps.config.model,
      timeoutMs: deps.config.timeoutMs,
    });

  const handleChatMessage = new HandleChatMessageUseCase({
    criteriaExtractor: extractor,
    recommenderApi: deps.recommender,
    catalogApi: deps.catalog,
  });

  const routes = createChatRoutes({ handleChatMessage });

  const api: ChatApi = {
    handleMessage: (input: HandleChatMessageInput) => handleChatMessage.execute(input),
  };

  return {
    api,
    routes,
    jobs: [],
  };
}
