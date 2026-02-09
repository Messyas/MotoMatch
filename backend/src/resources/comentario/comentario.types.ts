// Alterado o nome do arquivo para: src/resources/comentario.types.ts

export type AnaliseComentarioStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

// --- AJUSTADO ---
// Renomeado de AspectSentimentLabel e tornado mais genérico
export type ComentarioSentimento =
  | "horrivel"
  | "ruim"
  | "basica"
  | "boa"
  | "otima"
  | "excelente"
  | "positive" // Mantendo os tipos do schema antigo por segurança
  | "negative"
  | "neutral";

// DTO para os dados extraídos do CSV de comentários
export interface ComentarioCsvDTO {
  dispositivoIdExterno: string; // Ex: "Moto G86 5G"
  externalId: string; // Um ID único que vamos gerar a partir do conteúdo
  content: string;
  publishedAt: string; // Data em formato ISO (ex: "2025-08-10T00:00:00.000Z")
  author?: string;
  rating?: number;
}

// --- AJUSTADO ---
// Renomeado de AnaliseGeminiAspecto para ser genérico (para abstração)
export interface AnaliseAspecto {
  aspect: string;
  sentimentLabel: ComentarioSentimento; // Ajustado para usar o tipo comum
  score: number; // Corresponde ao nb_score do seu schema
  justification?: string;
}

// --- AJUSTADO ---
// Renomeado de AnaliseGeminiResultado para ser genérico (para abstração)
export interface AnaliseResultado {
  summary?: string;
  aspects: AnaliseAspecto[];
  promptPayload?: unknown;
  responsePayload?: unknown;
}

// --- AJUSTADO ---
// Esta é a mudança CRÍTICA para a nova lógica da Fila de Trabalhoss
export interface ComentarioParaAnalise {
  idAnalise?: string; // <-- ADICIONADO: O ID do job (ComentarioAnalise)
  idComentario: string;
  idDispositivo: string;
  conteudo: string;
  plataforma: string;
  referenciaExterna: string;
}

// --- (O resto dos tipos abaixo está como você forneceu, sem alterações) ---

export interface ComentarioDetalhado {
  idComentario: string;
  autor: string | null;
  nota: number | null;
  conteudo: string;
  publicadoEm: string;
  resumo?: string | null;
}

export interface ComentariosDoDispositivo {
  averageRating: number | null;
  totalReviews: number;
  comentarios: ComentarioDetalhado[];
}

export interface AspectoScore {
  aspecto: string;
  mediaScore: number | null;
  totalOpinions: number;
}

export interface AspectoScoresDoDispositivo {
  idDispositivo: string;
  aspectos: AspectoScore[];
}

export interface MercadoLivreComentarioDTO {
  externalId: string;
  content: string;
  publishedAt: string;
  author?: string;
  rating?: number;
}

export interface ResumoComentarioMetrica {
  chave: string;
  rotulo: string;
  score: number | null;
}

export interface ResumoComentariosDoDispositivo {
  idDispositivo: string;
  resumo: string | null;
  totalAnalisesConsideradas: number;
  ultimaAtualizacao: Date | null;
  notaGeral: number | null;
  totalAvaliacoes: number | null;
  metricas: ResumoComentarioMetrica[];
}

export interface ResumoColetivoEntrada {
  comentarios: Array<{
    resumo: string;
    aspectos: AnaliseAspecto[]; // Atualizado para o novo nome
  }>;
}

export interface ResumoProdutoCsvDTO {
  produto: string;
  notaGeral: number | null;
  totalAvaliacoes: number | null;
  custoBeneficio: number | null;
  qualidadeCamera: number | null;
  duracaoBateria: number | null;
  durabilidade: number | null;
}