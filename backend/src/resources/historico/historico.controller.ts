import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { getHistoricoPaginado } from "./historico.service";
import { GetHistoricoResponse } from "./historico.types";

const getHistorico = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Recupera o histórico paginado de pesquisas do usuário autenticado.'
  #swagger.tags = ['Histórico']

  #swagger.parameters['page'] = {
    in: 'query',
    required: false,
    description: 'Número da página (padrão: 1).',
    type: 'integer'
  }

  #swagger.parameters['pageSize'] = {
    in: 'query',
    required: false,
    description: 'Quantidade de itens por página (padrão: 3).',
    type: 'integer'
  }

  #swagger.responses[200] = {
    description: 'Histórico retornado com sucesso.',
    schema: { $ref: '#/definitions/GetHistoricoResponse' }
  }

  #swagger.responses[401] = {
    description: 'Usuário não autenticado.'
  }

  #swagger.responses[500] = {
    description: 'Erro inesperado ao buscar o histórico.'
  }
*/

  try {
    const idUsuario = req.session.uid;

    if (!idUsuario) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Usuário não autenticado." });
    }

    const DEFAULT_PAGE = 1;
    const DEFAULT_PAGE_SIZE = 3;

    const rawPage = parseInt(req.query.page as string, 10);
    const rawPageSize = parseInt(req.query.pageSize as string, 10);

    const page =
      Number.isFinite(rawPage) && rawPage > 0 ? rawPage : DEFAULT_PAGE;
    const pageSize =
      Number.isFinite(rawPageSize) && rawPageSize > 0
        ? rawPageSize
        : DEFAULT_PAGE_SIZE;
    const resultadoPaginado: GetHistoricoResponse = await getHistoricoPaginado(
      idUsuario,
      { page, pageSize }
    );

    res.status(StatusCodes.OK).json(resultadoPaginado);
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Ocorreu um erro inesperado ao buscar o histórico.",
    });
  }
};

export default { getHistorico };
