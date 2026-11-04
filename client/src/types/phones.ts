// Tipos para fotos
export interface Foto {
  title: string;
  src: string;
}

// Tipos das características, com chave dinâmica
export interface PhoneSpecs {
  storage?: string; // ROM
  ram?: string;
  camera?: string; // Main Camera
  battery?: string;
  display?: string;
  benchmark?: string;
  processor?: string;
  refreshRate?: string;
  secondary_camera?: string;
  tertiary_camera?: string;
  front_camera?: string;
  preco?: string; // <<< LINHA ADICIONADA AQUI
  [key: string]: string | undefined; // Aceita qualquer outra característica adicional
}

// Tipo para um item de telefone (PhoneItem)
export interface PhoneItem {
  id: string;
  title: string;
  imageUrls: string[]; //é um array para suportar todas as imagens
  specs: PhoneSpecs;
  price?: number;
  isFavorite?: boolean;
  favoriteId?: string;
  historicoId?: string;
  matchScore?: number;
  perfilMatchPercent?: number;
  criteriosMatchPercent?: number;
  justificativas?: string[];
  matchExplanation?: {
    specFit: number;
    opinionSim: number;
    weights: { specs: number; reviews: number };
    perCriterion: { tipo: string; score: number }[];
  };
}

// Tipos para as características recebidas do backend
export interface BackendCaracteristicaAninhada {
  idCaracteristica: string;
  tipo: string;
  descricao: string;
}

export interface BackendCaracteristica {
  idDispositivo: string;
  idCaracteristica: string;
  caracteristica: BackendCaracteristicaAninhada;
}

// Tipo para dispositivo do backend
export interface BackendDispositivo {
  idDispositivo: string;
  fabricante: string;
  modelo: string;
  preco?: number | string | null;
  photos: Foto[];
  caracteristicas: BackendCaracteristica[];
  matchScore?: number;
  perfilMatchPercent?: number;
  criteriosMatchPercent?: number;
  justificativas?: string[];
  matchExplanation?: {
    specFit: number;
    opinionSim: number;
    weights: { specs: number; reviews: number };
    perCriterion: { tipo: string; score: number }[];
  };
  historicoId?: string;
  isFavorite?: boolean;
  favoriteId?: string;
}

// Tipo para o corpo da requisição da API
export interface CriterioPesquisa {
  tipo: string;
  descricao: string;
}

export interface ConsoleSeletores {
  ram?: string;
  rom?: string;
  battery?: string;
  main_camera?: string;
  camera?: string;
  benchmark?: string;
  price_range?: string;
}

export interface PesquisaConsolePayload {
  criterios: CriterioPesquisa[];
  consoleInput?: string;
  seletores?: ConsoleSeletores;
  requestId?: string;
}
