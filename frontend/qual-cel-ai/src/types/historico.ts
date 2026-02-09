import type { BackendDispositivo, ConsoleSeletores } from "./phones";

export interface PaginationMeta {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export interface HistoricoResultado {
  idResultado: string;
  matchScore: number;
  dispositivo: BackendDispositivo;
  justificativas?: string[] | null;
}

export interface HistoricoFavorito {
  idDispositivo: string;
}

export interface HistoricoItem {
  idHistorico: string;
  createdAt: string; 
  criterios: {
    tipo: string;
    descricao: string;
  }[];
  consoleInput?: string | null;
  seletores?: Partial<ConsoleSeletores> | null;
  resultados: HistoricoResultado[];
  favoritos?: HistoricoFavorito[];
}

export interface GetHistoricoResponse {
  data: HistoricoItem[];
  meta: PaginationMeta;
}
