import { Prisma } from "@prisma/client";

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginationMeta {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}
// Define um validador para o tipo de histórico com todas as relações
const historicoCompletos =
  Prisma.validator<Prisma.HistoricoPesquisaDefaultArgs>()({
    include: {
      resultados: {
        include: {
          dispositivo: true,
        },
      },
    },
  });

// Exporta o tipo de um único item do histórico com todas as relações
export type HistoricoCompletos = Prisma.HistoricoPesquisaGetPayload<
  typeof historicoCompletos
>;

// Define a estrutura final da resposta da API de histórico
export interface GetHistoricoResponse {
  data: HistoricoCompletos[];
  meta: PaginationMeta;
}
