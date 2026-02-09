"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ChatMsg } from "../_types/chat.types";
import type {
  CriterioPesquisa,
  ConsoleSeletores,
  BackendDispositivo, // ADICIONADO: O tipo "bruto" que o back-end retorna
} from "@/types/phones";
// ADICIONADO: O tipo da nossa nova resposta da API
import type { ApiResponse } from "@/services/phone.service";
// ADICIONADO: O mapper para converter a resposta
import { mapDispositivoToPhoneItem } from "@/services/mappers/phone.mapper";

type UseChatSearchMessagesParams = {
  criterios?: CriterioPesquisa[];
  consoleInput?: string | null;
  seletores?: Partial<ConsoleSeletores> | null;
  requestId?: string | null;
  isHydrated: boolean;
  // REMOVIDO: dispositivosPesquisa: PhoneItem[];
  apiResponse: ApiResponse | null; // ADICIONADO: A nova resposta da API
  isSearching: boolean;
  deviceError?: string | null;
  generateId: () => string;
  appendMessages: (messages: ChatMsg[]) => void;
  upsertMessage: (message: ChatMsg) => void;
  removeMessage: (id: string) => void;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
};

/**
 * Isola os efeitos que reagem às mudanças nos critérios de busca
 * e ao retorno da pesquisa de dispositivos, mantendo o estado normalizado.
 */
export function useChatSearchMessages({
  criterios,
  consoleInput,
  seletores,
  requestId,
  isHydrated,
  apiResponse, // MODIFICADO
  isSearching,
  deviceError,
  generateId,
  appendMessages,
  upsertMessage,
  removeMessage,
  setError,
}: UseChatSearchMessagesParams) {
  const loadingMessageIdRef = useRef<string | null>(null);
  const lastSignatureRef = useRef<string | null>(null);

  const currentSignature = useMemo(() => {
    if (!criterios || criterios.length === 0) {
      return null;
    }

    const criteriosKey = [...criterios]
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
  }, [consoleInput, criterios, requestId, seletores]);

  // Este useEffect (1) cria a mensagem de "usuário" e a de "loading".
  useEffect(() => {
    if (!criterios || criterios.length === 0) {
      lastSignatureRef.current = null;
      return;
    }

    if (!isHydrated) {
      lastSignatureRef.current = currentSignature;
      return;
    }

    if (currentSignature && lastSignatureRef.current === currentSignature) {
      return;
    }

    setError(null);
    lastSignatureRef.current = currentSignature;

    const userMsg: ChatMsg = {
      id: generateId(),
      role: "user",
      criterios,
      consoleInput,
      seletores,
      requestId,
    };

    const loadingMsg: ChatMsg = {
      id: generateId(),
      role: "assistant",
      type: "loading",
    };

    if (loadingMessageIdRef.current) {
      removeMessage(loadingMessageIdRef.current);
    }

    loadingMessageIdRef.current = loadingMsg.id;
    appendMessages([userMsg, loadingMsg]);
  }, [
    appendMessages,
    criterios,
    consoleInput,
    seletores,
    currentSignature,
    generateId,
    isHydrated,
    requestId,
    removeMessage,
    setError,
  ]);


  // A lógica foi substituída para lidar com 'apiResponse' (e suas 'acao').
  useEffect(() => {
    if (isSearching) return; // Se a busca está acontecendo, espere.

    const loadingId = loadingMessageIdRef.current;
    if (!loadingId) return; // Se não houver uma msg de loading, não há o que fazer.

    // 1. Trata erro
    if (deviceError) {
      setError("Ocorreu um erro ao buscar os dispositivos.");
      removeMessage(loadingId);
      loadingMessageIdRef.current = null;
      return;
    }

    // 2. Trata a nova ApiResponse (quando ela finalmente chegar)
    if (apiResponse) {
      if (apiResponse.acao === "PERGUNTAR") {
        // A IA quer fazer uma pergunta.
        upsertMessage({
          id: loadingId,
          role: "assistant",
          type: "text",
          content: apiResponse.dados.texto,
        });
      } else if (apiResponse.acao === "RESULTADO") {
        // A IA retornou os resultados.
        const dispositivosBackend =
          apiResponse.dados as BackendDispositivo[];

        if (dispositivosBackend.length > 0) {
          // Mapeia os dados brutos para o formato do PhoneItem
          const dispositivosFront = dispositivosBackend.map(
            mapDispositivoToPhoneItem
          );
          // Substitui o loading pelos cards
          upsertMessage({
            id: loadingId,
            role: "assistant",
            type: "cards",
            items: dispositivosFront,
          });
        } else {
          // Se retornou "RESULTADO" mas a lista é vazia
          upsertMessage({
            id: loadingId,
            role: "assistant",
            type: "text",
            content: "Não encontrei nenhum dispositivo com esses critérios.",
          });
        }
      }

      // Limpa a referência de loading
      loadingMessageIdRef.current = null;
    }
    // Se isSearching=false mas a apiResponse ainda é null,
    // ele vai esperar o próximo render (quando a apiResponse chegar).
  }, [
    apiResponse, // MODIFICADO
    deviceError,
    isSearching,
    removeMessage,
    setError,
    upsertMessage,
  ]);
}