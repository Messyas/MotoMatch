"use client";

import {
  UIEvent,
  useCallback,
  useEffect, // ADICIONADO
  useMemo,
  useReducer,
  useRef,
  useState, // ADICIONADO
  useTransition,
} from "react";
// MODIFICADO: Importa 'ChatMsg' (sem o 'UserMessage')
import type { ChatMsg } from "../_types/chat.types";
import { useDevice } from "@/hooks/useDevice";
import { useIdGenerator } from "../../../hooks/useIdGenerator";
import { useChatHistory } from "./useChatHistory";
import { useChatSearchMessages } from "./useChatSearchMessages";
import { useFavoritePhones } from "./useFavoritePhones";
// MODIFICADO: Importa 'ConsoleSeletores' e 'CriterioPesquisa'
import type {
  PhoneItem,
  ConsoleSeletores,
  CriterioPesquisa,
} from "@/types/phones";
// ADICIONADO: Importa nosso novo serviço e tipo de resposta
import {
  pesquisarDispositivos,
  ApiResponse,
} from "@/services/phone.service";

type ChatState = {
  order: string[];
  entities: Record<string, ChatMsg>;
};

type ChatAction =
  | { type: "append"; messages: ChatMsg[] }
  | { type: "upsert"; message: ChatMsg }
  | { type: "remove"; id: string };

const initialChatState: ChatState = {
  order: [],
  entities: {},
};

function assertUnreachable(value: never): never {
  throw new Error(`Unhandled chat message variant: ${JSON.stringify(value)}`);
}

// CORRIGIDO: Esta função agora está IDÊNTICA à que você forneceu,
// tratando apenas os 4 tipos que existem no seu 'chat.types.ts'.
function createMessageSignature(message: ChatMsg): string {
  if (message.role === "user") {
    const criteriosKey = [...message.criterios]
      .map(
        (criterio) =>
          `${criterio.tipo.trim().toLowerCase()}:${criterio.descricao
            .trim()
            .toLowerCase()}`
      )
      .sort()
      .join("|");

    const consoleKey = (message.consoleInput ?? "").trim().toLowerCase();
    const seletoresEntries = Object.entries(message.seletores ?? {})
      .filter(([, value]) => typeof value === "string")
      .map(
        ([tipo, value]) =>
          `${tipo.trim().toLowerCase()}:${(value as string)
            .trim()
            .toLowerCase()}`
      )
      .sort()
      .join("|");

    const requestKey = (message.requestId ?? "").trim();
    const idKey = message.id.startsWith("msg-") ? "" : message.id;

    return `user::${requestKey}::${criteriosKey}::${consoleKey}::${seletoresEntries}::${idKey}`;
  }

  if (message.role === "assistant") {
    switch (message.type) {
      case "cards": {
        const itemKeys = message.items
          .map((item) => {
            const score =
              typeof item.matchScore === "number"
                ? item.matchScore.toFixed(4)
                : "na";
            return `${item.id}:${score}`;
          })
          .sort();
        return `assistant_cards::${itemKeys.join("|")}::${message.id}`;
      }
      case "text": {
        const normalizedContent = message.content.trim().toLowerCase();
        return `assistant_text::${normalizedContent}::${message.id}`;
      }
      case "loading":
        return `assistant_loading::${message.id}`;
      default:
        // Agora o 'default' corretamente recebe 'never'
        return assertUnreachable(message);
    }
  }

  return assertUnreachable(message);
}

const MAX_HISTORY_MESSAGES = 10;
const MAX_CRITERIA_PER_MESSAGE = 8;
const MAX_TEXT_LENGTH = 600;

type UserChatMessage = Extract<ChatMsg, { role: "user" }>;

function truncateText(
  value: string | null | undefined,
  maxLength = MAX_TEXT_LENGTH
): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}...`;
}

function sanitizeSeletoresPayload(
  seletores?: Partial<ConsoleSeletores> | null
): Partial<ConsoleSeletores> | undefined {
  if (!seletores) return undefined;
  const entries = Object.entries(seletores)
    .filter(([, value]) => typeof value === "string")
    .map(([tipo, rawValue]) => [tipo, (rawValue as string).trim()])
    .filter(([, value]) => value.length > 0);
  if (!entries.length) return undefined;
  return Object.fromEntries(entries) as Partial<ConsoleSeletores>;
}

function sanitizeUserMessageForPayload(
  message: UserChatMessage
): UserChatMessage {
  const criterios = (message.criterios ?? [])
    .filter(
      (criterio) =>
        typeof criterio?.tipo === "string" &&
        typeof criterio?.descricao === "string"
    )
    .slice(0, MAX_CRITERIA_PER_MESSAGE)
    .map((criterio) => ({
      tipo: criterio.tipo.trim(),
      descricao: criterio.descricao.trim(),
    }));

  const normalizedConsoleInput = truncateText(message.consoleInput ?? null);
  const normalizedSeletores = sanitizeSeletoresPayload(message.seletores ?? null);

  return {
    ...message,
    criterios,
    consoleInput: normalizedConsoleInput || null,
    seletores: normalizedSeletores ?? undefined,
  };
}

function compactHistoryForPayload(
  messages: ChatMsg[],
  limit: number
): ChatMsg[] {
  const relevant = messages.filter(
    (message) =>
      message.role === "user" ||
      (message.role === "assistant" && message.type === "text")
  );
  const sliceStart = Math.max(0, relevant.length - limit);
  return relevant.slice(sliceStart).map((message) => {
    if (message.role === "assistant") {
      return {
        ...message,
        content: truncateText(message.content),
      };
    }
    return sanitizeUserMessageForPayload(message);
  });
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "append": {
      if (!action.messages.length) return state;

      let mutated = false;
      const entities = { ...state.entities };
      const order = [...state.order];

      action.messages.forEach((message) => {
        if (entities[message.id]) return;
        entities[message.id] = message;
        order.push(message.id);
        mutated = true;
      });

      if (!mutated) return state;
      return { entities, order };
    }

    case "upsert": {
      const existing = state.entities[action.message.id];
      if (existing === action.message) {
        return state;
      }

      const entities = {
        ...state.entities,
        [action.message.id]: action.message,
      };
      const order = existing
        ? state.order
        : [...state.order, action.message.id];

      return { entities, order };
    }

    case "remove": {
      if (!state.entities[action.id]) {
        return state;
      }

      const entities = { ...state.entities };
      delete entities[action.id];
      const order = state.order.filter((messageId) => messageId !== action.id);

      return { entities, order };
    }
    default:
      return state;
  }
}

export function useChatManager() {
  const [chatState, dispatch] = useReducer(chatReducer, initialChatState);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollRestoreRef = useRef(0);
  const isFetchingOlderRef = useRef(false);
  const inFlightSignatureRef = useRef<string | null>(null);
  const generateId = useIdGenerator("msg");

  // --- INÍCIO DA MUDANÇA (ESTRUTURA 4) ---

  // 1. Modificado `useDevice`:
  // Removemos a saída de 'loading' e 'error' do 'useDevice'.
  // O `useChatManager` agora vai controlar o estado da busca.
  const {
    // REMOVIDO: dispositivosPesquisa,
    // REMOVIDO: loading: isSearching,
    // REMOVIDO: error: deviceError,
    criterios,
    pesquisaConsole,
    isHydrated,
  } = useDevice();

  // 2. Adicionado Novo Estado Local:
  // Este hook (o Cérebro) agora gerencia o estado da busca.
  const [isSearching, setIsSearching] = useState(false);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);

  // --- FIM DA MUDANÇA ---

  const {
    favoritos,
    favoriteIds,
    toggleFavorite: toggleFavoriteMutation,
    isMutating: isMutatingFavorite,
    isLoading: isLoadingFavorites,
    pendingFavoriteIds,
  } = useFavoritePhones();
  const [isTransitionPending, startFavoriteTransition] = useTransition();

  const {
    historyMessages,
    fetchOlderHistory,
    hasOlderHistory,
    isInitialLoading,
    isFetchingOlder,
    historyError,
    isTransitionPending: isHistoryPending,
  } = useChatHistory();

  const appendRealtimeMessages = useCallback(
    (messages: ChatMsg[]) => {
      if (!messages.length) return;
      dispatch({ type: "append", messages });
    },
    [dispatch]
  );

  const upsertRealtimeMessage = useCallback(
    (message: ChatMsg) => {
      dispatch({ type: "upsert", message });
    },
    [dispatch]
  );

  const removeRealtimeMessage = useCallback(
    (id: string) => {
      dispatch({ type: "remove", id });
    },
    [dispatch]
  );

  const realtimeMessages = useMemo(() => {
    return chatState.order.map((id) => chatState.entities[id]);
  }, [chatState.entities, chatState.order]);

  const mergedMessages = useMemo(() => {
    if (historyMessages.length === 0) {
      return realtimeMessages;
    }
    if (realtimeMessages.length === 0) {
      return historyMessages;
    }
    return [...historyMessages, ...realtimeMessages];
  }, [historyMessages, realtimeMessages]);

  const dedupedMessages = useMemo(() => {
    if (mergedMessages.length === 0) return mergedMessages;

    const seen = new Map<
      string,
      { index: number; isHistory: boolean; messageId: string }
    >();
    const result: ChatMsg[] = [];

    mergedMessages.forEach((message) => {
      const signature = createMessageSignature(message);
      const isHistoryMessage = !message.id.startsWith("msg-");
      const existing = seen.get(signature);

      if (!existing) {
        seen.set(signature, {
          index: result.length,
          isHistory: isHistoryMessage,
          messageId: message.id,
        });
        result.push(message);
        return;
      }

      if (existing.isHistory) {
        // Já temos a versão do histórico, ignoramos duplicatas
        return;
      }

      if (isHistoryMessage) {
        // Substitui a versão em tempo real pela do histórico
        result[existing.index] = message;
        seen.set(signature, {
          index: existing.index,
          isHistory: true,
          messageId: message.id,
        });
      }
      // Se ambos são realtime, ignora o novo.
    });

    return result;
  }, [mergedMessages]);

  // --- INÍCIO DA MUDANÇA (ESTRUTURA 4) ---

  // 3. Adicionado o Orquestrador (lógica de 'assinatura' movida para cá)
  const { seletores, consoleInput, requestId } = pesquisaConsole;
  const currentSignature = useMemo(() => {
    if (!criterios || criterios.length === 0) {
      return null;
    }
    const criteriosKey = [...(criterios as CriterioPesquisa[])] // Cast para garantir
      .map(
        (criterio) =>
          `${criterio.tipo.trim().toLowerCase()}:${criterio.descricao
            .trim()
            .toLowerCase()}`
      )
      .sort()
      .join("|");
    const consoleKey = (consoleInput ?? "").trim().toLowerCase();
    const seletoresEntries = Object.entries(seletores ?? {})
      .filter(([, value]) => typeof value === "string")
      .map(
        ([tipo, value]) =>
          `${tipo.trim().toLowerCase()}:${(value as string)
            .trim()
            .toLowerCase()}`
      )
      .sort()
      .join("|");
    return `${requestId ?? ""}::${criteriosKey}::${consoleKey}::${seletoresEntries}`;
  }, [criterios, consoleInput, requestId, seletores]);

  const lastSignatureRef = useRef<string | null>(null);

  // 4. Adicionado o 'useEffect' que chama a API
  useEffect(() => {
    if (!currentSignature || !isHydrated) {
      return;
    }
    if (lastSignatureRef.current === currentSignature) {
      return; // Busca já foi feita
    }
    lastSignatureRef.current = currentSignature;

    const baseUserMessage: UserChatMessage = {
      id: generateId(), // ID temporário, apenas para o payload
      role: "user",
      criterios: criterios ?? [],
      consoleInput: consoleInput ?? null,
      seletores: seletores ?? undefined,
      requestId: requestId ?? null,
    };
    const newUserMsgForAPI = sanitizeUserMessageForPayload(baseUserMessage);

    const historyWindow = compactHistoryForPayload(
      dedupedMessages,
      MAX_HISTORY_MESSAGES
    );
    const historyContainsCurrentRequest =
      Boolean(newUserMsgForAPI.requestId) &&
      historyWindow.some(
        (message) =>
          message.role === "user" &&
          message.requestId === newUserMsgForAPI.requestId
      );

    const historyForAPI = historyContainsCurrentRequest
      ? historyWindow
      : [...historyWindow, newUserMsgForAPI];

    const seletoresForAPI =
      (sanitizeSeletoresPayload(seletores ?? null) ??
        {}) as ConsoleSeletores;
    const signatureForRun = currentSignature;

    const runSearch = async () => {
      inFlightSignatureRef.current = signatureForRun;
      setIsSearching(true);
      setApiResponse(null); // Limpa a resposta anterior
      setError(null); // Limpa o erro anterior

      try {
        const response = await pesquisarDispositivos(
          historyForAPI,
          seletoresForAPI
        );
        if (inFlightSignatureRef.current !== signatureForRun) {
          return;
        }
        setApiResponse(response);
      } catch (err) {
        if (inFlightSignatureRef.current !== signatureForRun) {
          return;
        }
        setError((err as Error).message ?? "Erro ao buscar dispositivos.");
      } finally {
        if (inFlightSignatureRef.current === signatureForRun) {
          inFlightSignatureRef.current = null;
          setIsSearching(false);
        }
      }
    };

    runSearch();
  }, [
    currentSignature,
    isHydrated,
    dedupedMessages,
    criterios,
    consoleInput,
    seletores,
    requestId,
    generateId,
  ]);

  // 5. Modificada a chamada para 'useChatSearchMessages'
  // Ele agora recebe o NOSSO estado de busca, não o do 'useDevice'.
  useChatSearchMessages({
    criterios,
    consoleInput: pesquisaConsole.consoleInput,
    seletores: pesquisaConsole.seletores,
    requestId: pesquisaConsole.requestId,
    isHydrated,

    // MODIFICADO: Passando nosso estado local
    apiResponse: apiResponse,
    isSearching: isSearching,
    deviceError: error, // Passando nosso estado de erro

    // REMOVIDO: dispositivosPesquisa (não existe mais no params)
    
    // Funções de callback (permanecem iguais)
    generateId,
    appendMessages: appendRealtimeMessages,
    upsertMessage: upsertRealtimeMessage,
    removeMessage: removeRealtimeMessage,
    setError,
  });

  // --- FIM DA MUDANÇA ---

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (!hasOlderHistory || isFetchingOlder || isFetchingOlderRef.current) {
        return;
      }

      const target = event.currentTarget;
      if (target.scrollTop > 0) return;

      isFetchingOlderRef.current = true;
      scrollRestoreRef.current = target.scrollHeight;

      fetchOlderHistory()
        .catch((err) => {
          console.error("Erro ao carregar histórico adicional:", err);
          setError("Não foi possível carregar mais itens do histórico.");
        })
        .finally(() => {
          requestAnimationFrame(() => {
            const newScrollHeight = target.scrollHeight;
            const delta = newScrollHeight - scrollRestoreRef.current;
            target.scrollTop = delta;
            isFetchingOlderRef.current = false;
          });
        });
    },
    [fetchOlderHistory, hasOlderHistory, isFetchingOlder]
  );

  const handleWindowScroll = useCallback(() => {
    if (!hasOlderHistory || isFetchingOlder || isFetchingOlderRef.current) {
      return;
    }

    if (window.scrollY > 0) return;

    isFetchingOlderRef.current = true;
    scrollRestoreRef.current = document.documentElement.scrollHeight;

    fetchOlderHistory()
      .catch((err) => {
        console.error("Erro ao carregar histórico adicional:", err);
        setError("Não foi possível carregar mais itens do histórico.");
      })
      .finally(() => {
        requestAnimationFrame(() => {
          const newHeight = document.documentElement.scrollHeight;
          const delta = newHeight - scrollRestoreRef.current;
          window.scrollTo({ top: delta });
          isFetchingOlderRef.current = false;
        });
      });
  }, [fetchOlderHistory, hasOlderHistory, isFetchingOlder]);

  const favoriteDetailsMap = useMemo(() => {
    const map = new Map<string, (typeof favoritos)[number]>();
    favoritos.forEach((fav) => {
      map.set(fav.dispositivo.id, fav);
    });
    return map;
  }, [favoritos]);

  const messagesWithFavorites = useMemo(() => {
    if (dedupedMessages.length === 0) return dedupedMessages;

    return dedupedMessages.map((msg) => {
      if (msg.role === "assistant" && msg.type === "cards") {
        let itemsChanged = false;
        const updatedItems = msg.items.map((item) => {
          const favoriteInfo = favoriteDetailsMap.get(item.id);
          const derivedFavoriteId = favoriteInfo?.idFavorito ?? item.favoriteId;
          const derivedIsFavorite = isLoadingFavorites
            ? item.isFavorite ?? false
            : favoriteIds.has(item.id);

          if (
            item.isFavorite === derivedIsFavorite &&
            item.favoriteId === derivedFavoriteId
          ) {
            return item;
          }

          itemsChanged = true;

          return {
            ...item,
            isFavorite: derivedIsFavorite,
            favoriteId: derivedFavoriteId,
          };
        });

        if (!itemsChanged) return msg;

        return {
          ...msg,
          items: updatedItems,
        };
      }
      return msg;
    });
  }, [
    favoriteDetailsMap,
    favoriteIds,
    isLoadingFavorites,
    dedupedMessages,
  ]);

  const handleToggleFavorite = useCallback(
    (phone: PhoneItem) => {
      if (pendingFavoriteIds.has(phone.id)) {
        return;
      }

      startFavoriteTransition(() => {
        toggleFavoriteMutation({
          idDispositivo: phone.id,
          idHistorico: phone.historicoId,
          phoneItem: phone,
        }).catch((err) => {
          console.error("Erro ao atualizar favorito:", err);
          setError("Não foi possível atualizar os favoritos agora.");
        });
      });
    },
    [
      pendingFavoriteIds,
      setError,
      startFavoriteTransition,
      toggleFavoriteMutation,
    ]
  );

  const combinedError = error ?? historyError;

  const isUpdatingFavorite =
    isMutatingFavorite || pendingFavoriteIds.size > 0 || isTransitionPending;

  const isLoadingHistory =
    isInitialLoading || isHistoryPending || isFetchingOlder;

  return {
    messages: messagesWithFavorites,
    error: combinedError,
    isLoadingHistory,
    isSearching, // MODIFICADO: Agora usa nosso estado local
    isUpdatingFavorite,
    handleScroll,
    handleWindowScroll,
    scrollContainerRef,
    messagesEndRef,
    toggleFavorite: handleToggleFavorite,
    pendingFavoriteIds,
  };
}
