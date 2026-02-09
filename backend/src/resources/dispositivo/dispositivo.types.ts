import { Dispositivo } from "@prisma/client";

export type CreateDispositivoDTO = Pick<
  Dispositivo,
  "fabricante" | "modelo" | "photos" | "preco"
> & {
  caracteristicas?: {
    tipo: string;
    descricao: string;
  }[];
};

export type SeletoresPesquisa = Partial<
  Record<
    | "ram"
    | "rom"
    | "battery"
    | "main_camera"
    | "camera"
    | "benchmark"
    | "price_range",
    string
  >
>;

export interface PesquisaConsoleMetadata {
  consoleInput?: string | null;
  seletores?: SeletoresPesquisa;
  eventoId?: string | null;
}

export type PesquisaDispositivoDTO = {
  caracteristicas: {
    tipo: string;
    descricao: string;
  }[];
  consoleInput?: string;
  seletores?: SeletoresPesquisa;
};

export interface CriterioPesquisa {
  tipo: string;
  descricao: string;
}

export interface Part {
  text: string;
}
export interface Candidate {
  content: { parts: Part[] };
}
export interface GenerateContentResponse {
  candidates?: Candidate[];
}

// --- INÍCIO DA MUDANÇA (ESTRUTURA 4) ---
// ADICIONADO: Tipos do chat (baseado no front-end) para o historicoConversa

interface BaseChatMsg {
  id: string;
  role: "user" | "assistant";
}

export interface UserMessage extends BaseChatMsg {
  role: "user";
  type: "text";
  content: string;
  // Adiciona os tipos que o front-end envia (do Message-console)
  criterios: CriterioPesquisa[];
  consoleInput: string | null;
  seletores: SeletoresPesquisa;
}

export interface AssistantTextMessage extends BaseChatMsg {
  role: "assistant";
  type: "text";
  content: string;
}

export interface AssistantCardsMessage extends BaseChatMsg {
  role: "assistant";
  type: "cards";
  payload: any[]; // (Payload dos dispositivos)
}

export interface AssistantLoadingMessage extends BaseChatMsg {
  role: "assistant";
  type: "loading" | "skeleton";
}

export interface AssistantErrorMessage extends BaseChatMsg {
  role: "assistant";
  type: "error";
  content: string;
}

// O tipo principal que o historicoConversa usará
export type ChatMsg =
  | UserMessage
  | AssistantTextMessage
  | AssistantCardsMessage
  | AssistantLoadingMessage
  | AssistantErrorMessage;

// --- FIM DA MUDANÇA ---
