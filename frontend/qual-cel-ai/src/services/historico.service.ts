import { backApi } from "./api";
import type { GetHistoricoResponse } from "@/types/historico";

/**
 * Busca o histórico paginado do usuário logado.
 * @param page - O número da página a ser buscada.
 * @param pageSize - O número de itens por página.
 */
export async function getHistorico(
  page: number = 1,
  pageSize: number = 10
): Promise<GetHistoricoResponse> {
  try {
    const response = await backApi.get<GetHistoricoResponse>("/historico", {
      params: {
        page,
        pageSize,
      },
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("Erro em historico service ao buscar histórico:", error);
    return {
      data: [],
      meta: {
        totalItems: 0,
        currentPage: 1,
        pageSize: pageSize,
        totalPages: 0,
      },
    };
  }
}