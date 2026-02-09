import { backApi } from "./api";
import type {
  BackendDispositivo,
  PhoneItem,
  ConsoleSeletores,
} from "@/types/phones";
import {
  mapDispositivoToPhoneItem,
  mapPhoneItemToBackend,
} from "./mappers/phone.mapper";
// CORRIGIDO (ESTRUTURA 4): O caminho de importação agora usa o alias
import type { ChatMsg } from "@/app/chat/_types/chat.types"; 

// CORRIGIDO (ESTRUTURA 4): A nova resposta, agora SEM 'any'
export type ApiResponse = {
  acao: "PERGUNTAR";
  dados: { texto: string };
} | {
  acao: "RESULTADO";
  dados: BackendDispositivo[]; // O back-end retorna o tipo 'bruto'
};

/**
 * Envia o histórico da conversa para o backend e retorna a próxima ação.
 */
export async function pesquisarDispositivos(
  historicoConversa: ChatMsg[],
  filtrosSelecionados: ConsoleSeletores
): Promise<ApiResponse> {
  // Este é o NOVO payload que o back-end (que ajustamos) agora espera
  const payload = {
    historicoConversa,
    filtrosSelecionados,
  };

  try {
    console.log(
      "Enviando para o backend (Conversacional):",
      JSON.stringify(payload, null, 2)
    );

    // A chamada 'post' espera o tipo 'ApiResponse'
    const response = await backApi.post<ApiResponse>(
      "/dispositivos/pesquisar",
      payload
    );

    console.log(
      "DADOS BRUTOS RECEBIDOS DO BACKEND (Conversacional):",
      JSON.stringify(response.data, null, 2)
    );

    const { data } = response;

    // A lógica de retorno mudou:
    // Nós retornamos a resposta { acao, dados } inteira.
    if (data && (data.acao === "PERGUNTAR" || data.acao === "RESULTADO")) {
      return data; // Retorna { acao: "...", dados: ... }
    }

    // Fallback se a API quebrar (não retornar a estrutura esperada)
    console.error("Formato inesperado na resposta de pesquisa:", data);
    throw new Error("Resposta inesperada da API de dispositivos.");
  } catch (error) {
    console.error("Erro em phone.service ao pesquisar dispositivos:", error);
    throw new Error("Não foi possível buscar os dispositivos.");
  }
}

/**
 * Lista todos os dispositivos.
 */
export async function listarDispositivos(): Promise<PhoneItem[]> {
  const { data } = await backApi.get<BackendDispositivo[]>("/dispositivos");
  return data.map(mapDispositivoToPhoneItem);
}

/**
 * Busca um dispositivo específico por ID.
 */
export async function obterDispositivo(id: string): Promise<PhoneItem> {
  const { data } = await backApi.get<BackendDispositivo>(`/dispositivos/${id}`);
  return mapDispositivoToPhoneItem(data);
}

export async function criarDispositivo(
  payload: Omit<PhoneItem, "id">
): Promise<PhoneItem> {
  const backendPayload = mapPhoneItemToBackend(payload);
  const { data } = await backApi.post<BackendDispositivo>(
    "/dispositivos",
    backendPayload
  );
  return mapDispositivoToPhoneItem(data);
}

export async function atualizarDispositivo(
  id: string,
  payload: Omit<PhoneItem, "id">
): Promise<PhoneItem> {
  const backendPayload = mapPhoneItemToBackend(payload);
  const { data } = await backApi.put<BackendDispositivo>(
    `/dispositivos/${id}`,
    backendPayload
  );
  return mapDispositivoToPhoneItem(data);
}

/**
 * Remove um dispositivo.
 */
export async function excluirDispositivo(id: string): Promise<void> {
  await backApi.delete(`/dispositivos/${id}`);
}