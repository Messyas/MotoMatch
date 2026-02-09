export interface ComentarioDetalhado {
  idComentario: string;
  autor: string | null;
  nota: number | null;
  conteudo: string;
  publicadoEm: string;
  resumo?: string | null;
}

export interface ComentariosDispositivoResponse {
  averageRating: number | null;
  totalReviews: number;
  comentarios: ComentarioDetalhado[];
}

export interface AspectoScore {
  aspecto: string;
  mediaScore: number | null;
  totalOpinions: number;
}

export interface AspectoScoresResponse {
  idDispositivo: string;
  aspectos: AspectoScore[];
}

export interface ResumoComentarioMetric {
  chave: string;
  rotulo: string;
  score: number | null;
}

export interface ResumoComentariosResponse {
  idDispositivo: string;
  resumo: string | null;
  totalAnalisesConsideradas: number;
  ultimaAtualizacao: string | null;
  notaGeral: number | null;
  totalAvaliacoes: number | null;
  metricas: ResumoComentarioMetric[];
}
