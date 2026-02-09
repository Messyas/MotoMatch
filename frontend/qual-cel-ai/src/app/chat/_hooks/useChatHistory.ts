"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getHistorico } from "@/services/historico.service";
import { mapDispositivoToPhoneItem } from "@/services/mappers/phone.mapper";
import type { ChatMsg } from "../_types/chat.types";
import type { HistoricoItem } from "@/types/historico";

const PAGE_SIZE = 3;

type HistoryStore = {
  order: string[];
  ids: Set<string>;
  entities: Map<string, ChatMsg>;
};

type UseChatHistoryResult = {
  historyMessages: ChatMsg[];
  fetchOlderHistory: () => Promise<unknown>;
  hasOlderHistory: boolean;
  isInitialLoading: boolean;
  isFetchingOlder: boolean;
  historyError: string | null;
  isTransitionPending: boolean;
};

/**
 * Converte um item do histórico em mensagens de chat (usuário e assistente).
 * A função mantém referências estáveis ao reutilizar objetos já existentes.
 */
function buildChatMessagesFromHistorico(
  item: HistoricoItem,
  historyStore: HistoryStore
) {
  const favoritosIds = new Set(
    (item.favoritos ?? []).map((fav) => fav.idDispositivo)
  );

  const userMsgId = `${item.idHistorico}-user`;
  const assistantMsgId = `${item.idHistorico}-assistant`;

  if (!historyStore.entities.has(userMsgId)) {
    historyStore.entities.set(userMsgId, {
      id: userMsgId,
      role: "user",
      criterios: item.criterios,
      consoleInput: item.consoleInput ?? null,
      seletores: item.seletores ?? null,
    });
  }

  if (!historyStore.entities.has(assistantMsgId)) {
    historyStore.entities.set(assistantMsgId, {
      id: assistantMsgId,
      role: "assistant",
      type: "cards",
      items: item.resultados.map((resultado) => {
        const phone = mapDispositivoToPhoneItem(resultado.dispositivo);
        phone.historicoId = item.idHistorico;
        phone.matchScore = resultado.matchScore;
        if (resultado.justificativas?.length) {
          phone.justificativas = resultado.justificativas;
        }
        if (favoritosIds.has(phone.id)) {
          phone.isFavorite = true;
        }
        return phone;
      }),
    });
  }

  return [userMsgId, assistantMsgId];
}

export function useChatHistory(): UseChatHistoryResult {
  const historyStoreRef = useRef<HistoryStore>({
    order: [],
    ids: new Set(),
    entities: new Map(),
  });
  const [, forceRender] = useState(0);
  const [isPending, startTransition] = useTransition();

  const {
    data,
    error,
    status,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["chat-history"],
    queryFn: ({ pageParam = 1 }) => getHistorico(pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.currentPage >= lastPage.meta.totalPages) {
        return undefined;
      }
      return lastPage.meta.currentPage + 1;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  useEffect(() => {
    if (!data) return;

    const store = historyStoreRef.current;
    let mutated = false;

    data.pages.forEach((page, index) => {
      const pageParam = data.pageParams[index] ?? index + 1;
      const pageMessageIds: string[] = [];

      // --- CORREÇÃO: INVERTER A ORDEM ---
      // O backend retorna [Mais Recente, ..., Menos Recente].
      // Para o chat, queremos [Menos Recente, ..., Mais Recente] dentro do bloco.
      // Usamos [...page.data].reverse() para criar uma cópia invertida.
      [...page.data].reverse().forEach((item) => {
        const [userMsgId, assistantMsgId] = buildChatMessagesFromHistorico(
          item,
          store
        );
        pageMessageIds.push(userMsgId, assistantMsgId);
      });

      if (pageMessageIds.length === 0) {
        return;
      }

      const newIds = pageMessageIds.filter((id) => !store.ids.has(id));
      if (newIds.length === 0) {
        return;
      }

      newIds.forEach((id) => store.ids.add(id));

      // A lógica de merge mantém-se:
      // Se é a página 1 (últimas conversas), adiciona ao FINAL da lista (base do chat).
      // Se são páginas anteriores (histórico antigo), adiciona ao INÍCIO da lista (topo do chat).
      if (pageParam === 1) {
        store.order = [...store.order, ...newIds];
      } else {
        store.order = [...newIds, ...store.order];
      }

      mutated = true;
    });

    if (mutated) {
      startTransition(() => {
        forceRender((prev) => prev + 1);
      });
    }
  }, [data, startTransition]);

  const historyStore = historyStoreRef.current;
  const historyMessages = historyStore.order.map(
    (id) => historyStore.entities.get(id)!
  );

  return {
    historyMessages,
    fetchOlderHistory: fetchNextPage,
    hasOlderHistory: Boolean(hasNextPage),
    isInitialLoading: status === "pending",
    isFetchingOlder: isFetchingNextPage,
    historyError: error ? "Não foi possível carregar o histórico." : null,
    isTransitionPending: isPending,
  };
}