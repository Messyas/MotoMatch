import { prisma } from "../../database/prismaSingleton";
import {
  CriterioPesquisa,
  PesquisaConsoleMetadata,
} from "../dispositivo/dispositivo.types";
import { GetHistoricoResponse, PaginationOptions } from "./historico.types";

/**
 * Busca o histórico de pesquisas de um usuário de forma paginada.
 */
export async function getHistoricoPaginado(
  idUsuario: string,
  options: PaginationOptions
): Promise<GetHistoricoResponse> {
  const { page, pageSize } = options;

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const [historico, total] = await prisma.$transaction([
    prisma.historicoPesquisa.findMany({
      where: { idUsuario: idUsuario },
      orderBy: { createdAt: "desc" },
      skip: skip,
      take: take,
      include: {
        resultados: {
          orderBy: { matchScore: "desc" },
          include: {
            dispositivo: {
              include: {
                caracteristicas: {
                  include: {
                    caracteristica: true,
                  },
                },
              },
            },
          },
        },
        favoritos: {
          select: {
            idDispositivo: true,
          },
        },
      },
    }),
    prisma.historicoPesquisa.count({
      where: { idUsuario: idUsuario },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    data: historico,
    meta: {
      totalItems: total,
      currentPage: page,
      pageSize: pageSize,
      totalPages: totalPages,
    },
  };
}

/**
 * Salva o resultado de uma pesquisa no histórico do usuário.
 * @param idUsuario ID do usuário que fez a pesquisa.
 * @param criterios Os critérios que foram usados na busca.
 * @param recomendacoes A lista de dispositivos retornada pela busca.
 */
export async function salvarHistorico(
  idUsuario: string,
  criterios: CriterioPesquisa[],
  recomendacoes: any[], // Usamos 'any[]' para flexibilidade, mas pode ser um tipo mais forte, definitivamente tenho que tipar isso mais forte
  metadata?: PesquisaConsoleMetadata
): Promise<string | null> {
  try {
    const novoHistoricoId = await prisma.$transaction(async (tx) => {
      // Cria o registro "pai" do histórico
      const novoHistorico = await tx.historicoPesquisa.create({
        data: {
          idUsuario: idUsuario,
          criterios: criterios as any,
          consoleInput: metadata?.consoleInput ?? null,
          seletores: metadata?.seletores as any,
          idEvento: metadata?.eventoId ?? null,
        },
      });

      // Prepara os dados para cada um dos resultados
      const resultadosData = recomendacoes.map((rec) => ({
        idHistorico: novoHistorico.idHistorico,
        idDispositivo: rec.idDispositivo,
        matchScore: rec.matchScore,
        justificativas: rec.justificativas ?? null,
      }));

      // Salva os resultados de uma vez
      await tx.resultadoPesquisa.createMany({
        data: resultadosData,
      });

      return novoHistorico.idHistorico;
    });

    console.log(
      `Histórico salvo para o usuário ${idUsuario} (id: ${novoHistoricoId})`
    );
    return novoHistoricoId;
  } catch (error) {
    console.error("Falha ao salvar o histórico de pesquisa:", error);
    return null;
  }
}
