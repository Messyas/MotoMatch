import { Request, Response } from "express";
import { CreateDispositivoDTO } from "./dispositivo.types";
import {
  createDispositivo,
  getAllDispositivos,
  deleteDispositivo,
  getDispositivoById,
  updateDispositivo,
  orquestrarPesquisaConversacional, // NOVO SERVIÇO DE ORQUESTRAÇÃO
} from "./dispositivo.service";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import createDispositivoError from "./dispositivo.errors";
import { createManyDispositivos } from "./dispositivo.service";
import {
  obterAspectoScoresDoDispositivo,
  obterComentariosDoDispositivo,
  obterResumoComentariosDoDispositivo,
} from "../comentario/comentario.service";

/**
 * Pesquisa dispositivos por características.
 * POST /dispositivos/pesquisa
 * Espera no body: { caracteristicas: [ { tipo, descricao }, ... ] }
 * Exemplo: { caracteristicas: [ { tipo: "ram", descricao: "4GB" }, { tipo: "camera", descricao: "12MP" } ] }
 * Ou com texto livre: { caracteristicas: [ { tipo: "texto_livre", descricao: "quero um celular com 4GB de RAM e câmera de 12MP" } ] }
 *
 * Se o usuário estiver logado, o ID do usuário será capturado da sessão e passado para o serviço de matching.
 * Isso permite que o histórico de pesquisas seja salvo corretamente.
 */

/**
 * Orquestra a pesquisa conversacional.
 * POST /dispositivos/pesquisa
 * Espera no body (novo schema): { historicoConversa: [ ... ], filtrosSelecionados: { ... } }
 *
 * Retorna uma ação para o front-end:
 * - { acao: "PERGUNTAR", dados: { texto: "..." } }
 * - { acao: "RESULTADO", dados: [ ...dispositivos ] }
 *
 * Se o usuário estiver logado, o ID do usuário será capturado da sessão.
 */
const pesquisa = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Iniciar ou continuar uma pesquisa conversacional por dispositivos.'
  #swagger.tags = ['Pesquisa']

  #swagger.parameters['body'] = {
    in: 'body',
    required: true,
    schema: {
      historicoConversa: [
        {
          autor: "usuario",
          mensagem: "Quero um notebook",
          timestamp: "2025-01-01T12:00:00Z"
        }
      ],
      filtrosSelecionados: {
        precoMax: 5000,
        marca: "Dell"
      }
    }
  }

  #swagger.responses[200] = {
    description: "Resposta do assistente",
    schema: {
      acao: "PERGUNTAR",
      dados: {
        texto: "Qual tamanho de tela você prefere?"
      }
    }
  }

  #swagger.responses[500] = {
    description: "Erro inesperado no processamento da pesquisa"
  }
*/

  try {
    const idUsuario = req.session.uid;

    // 1. Recebemos o NOVO payload (validado pelo novo pesquisaSchema)
    // O tipo 'PesquisaDispositivoDTO' antigo não é mais compatível.
    const { historicoConversa, filtrosSelecionados } = req.body as {
      historicoConversa: any[]; // (Tipar com seu ChatMsg se preferir)
      filtrosSelecionados: any; // (Tipar com seu ConsoleSeletores se preferir)
    };

    // 2. Chamamos o NOVO orquestrador (que criaremos no service.ts)
    // Toda a lógica de 'extract', 'unir filtros', etc. MORREU aqui.
    const resposta = await orquestrarPesquisaConversacional(
      historicoConversa,
      filtrosSelecionados,
      idUsuario
    );

    // 3. Retornamos a resposta estruturada (seja ela PERGUNTA ou RESULTADO)
    res.status(StatusCodes.OK).json(resposta);
  } catch (error) {
    console.error("Erro na pesquisa conversacional:", error);
    // Em caso de erro, sempre retorne uma pergunta para manter o fluxo do chat
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      acao: "PERGUNTAR",
      dados: { texto: "Desculpe, ocorreu um erro. Vamos tentar de novo." },
    });
  }
};
/**
 * Lista todos os dispositivos cadastrados.
 * GET /dispositivos
 */

const index = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Listar todos os dispositivos'
  #swagger.tags = ['Dispositivos']

  #swagger.responses[200] = {
    description: 'Lista de dispositivos',
    schema: {
      $ref: '#/definitions/DispositivoList'
    }
  }

  #swagger.responses[500] = {
    description: 'Erro interno no servidor'
  }
*/

  try {
    const dispositivos = await getAllDispositivos();
    res.status(StatusCodes.OK).json(dispositivos);
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: ReasonPhrases.INTERNAL_SERVER_ERROR });
  }
};

/**
 * Cria um novo dispositivo.
 * POST /dispositivos
 * Espera no body: { fabricante, modelo, caracteristicas }
 */

const create = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Adicionar um novo dispositivo na base com características.'
  #swagger.tags = ['Dispositivos']

  #swagger.parameters['body'] = {
    in: 'body',
    required: true,
    schema: {
      $ref: '#/definitions/CreateDispositivoDTO'
    }
  }

  #swagger.responses[201] = {
    description: 'Dispositivo criado com sucesso',
    schema: { $ref: '#/definitions/Dispositivo' }
  }

  #swagger.responses[400] = {
    description: 'Erro de validação ou payload inválido'
  }

  #swagger.responses[500] = {
    description: 'Erro interno no servidor'
  }
*/

  const newDispositivo: CreateDispositivoDTO = {
    fabricante: req.body.fabricante,
    modelo: req.body.modelo,
    photos: req.body.photos,
    preco: req.body.preco,
    caracteristicas: req.body.caracteristicas, // lista de objetos { tipo, descricao }
  };

  try {
    const dispositivo = await createDispositivo(newDispositivo);
    res.status(StatusCodes.CREATED).json(dispositivo);
  } catch (error) {
    console.error(error);
    createDispositivoError(res, error);
  }
};

/**
 * Recupera um dispositivo pelo ID.
 * GET /dispositivos/:id
 */

const read = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Recuperar dados de um dispositivo específico (com características).'
  #swagger.tags = ['Dispositivos']

  #swagger.parameters['id'] = {
    in: 'path',
    required: true,
    description: 'ID do dispositivo a ser buscado'
  }

  #swagger.responses[200] = {
    description: 'Dispositivo encontrado',
    schema: { $ref: '#/definitions/Dispositivo' }
  }

  #swagger.responses[404] = {
    description: 'Dispositivo não encontrado'
  }

  #swagger.responses[500] = {
    description: 'Erro interno no servidor'
  }
*/

  const { id } = req.params;
  try {
    const dispositivo = await getDispositivoById(id);
    if (!dispositivo) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Dispositivo não encontrado" });
    } else {
      res.status(StatusCodes.OK).json(dispositivo);
    }
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: ReasonPhrases.INTERNAL_SERVER_ERROR });
  }
};

/**
 * Atualiza um dispositivo existente.
 * PUT /dispositivos/:id
 * Espera no body (parcial ou completo): { fabricante, modelo, caracteristicas }
 */

const update = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Atualizar dados de um dispositivo existente (com características).'
  #swagger.tags = ['Dispositivos']

  #swagger.parameters['id'] = {
    in: 'path',
    required: true,
    description: 'ID do dispositivo a ser atualizado'
  }

  #swagger.parameters['body'] = {
    in: 'body',
    required: true,
    schema: {
      $ref: '#/definitions/UpdateDispositivoDTO'
    },
    description: 'Campos a serem atualizados do dispositivo (parcial ou completo)'
  }

  #swagger.responses[200] = {
    description: 'Dispositivo atualizado com sucesso',
    schema: { $ref: '#/definitions/Dispositivo' }
  }

  #swagger.responses[404] = {
    description: 'Dispositivo não encontrado'
  }

  #swagger.responses[500] = {
    description: 'Erro interno no servidor'
  }
*/

  const { id } = req.params;
  const updatedData: Partial<CreateDispositivoDTO> = {
    fabricante: req.body.fabricante,
    modelo: req.body.modelo,
    photos: req.body.photos,
    preco: req.body.preco,
    caracteristicas: req.body.caracteristicas, // { tipo, descricao }[]
  };

  try {
    const updated = await updateDispositivo(id, updatedData);
    if (!updated) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Dispositivo não encontrado para atualização" });
    } else {
      res.status(StatusCodes.OK).json(updated);
    }
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: ReasonPhrases.INTERNAL_SERVER_ERROR });
  }
};

const remove = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Remover um dispositivo existente.'
  #swagger.tags = ['Dispositivos']

  #swagger.parameters['id'] = {
    in: 'path',
    required: true,
    description: 'ID do dispositivo a ser removido'
  }

  #swagger.responses[204] = {
    description: 'Dispositivo removido com sucesso (sem conteúdo)'
  }

  #swagger.responses[404] = {
    description: 'Dispositivo não encontrado para exclusão'
  }

  #swagger.responses[500] = {
    description: 'Erro interno no servidor'
  }
*/

  const { id } = req.params;
  try {
    const deleted = await deleteDispositivo(id);
    if (!deleted) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Dispositivo não encontrado para exclusão" });
    } else {
      res.status(StatusCodes.NO_CONTENT).send();
    }
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: ReasonPhrases.INTERNAL_SERVER_ERROR });
  }
};

/**
 * Cria vários dispositivos de uma vez (batch).
 * POST /dispositivos/batch
 * Espera no body: [ { fabricante, modelo, caracteristicas }, ... ]
 */

const createMany = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Adicionar uma lista de dispositivos de uma só vez.'
  #swagger.tags = ['Dispositivos']

  #swagger.parameters['body'] = {
    in: 'body',
    required: true,
    description: 'Lista de dispositivos a serem criados',
    schema: {
      type: 'array',
      items: { $ref: '#/definitions/CreateDispositivoDTO' }
    }
  }

  #swagger.responses[201] = {
    description: 'Dispositivos criados com sucesso',
    schema: {
      type: 'array',
      items: { $ref: '#/definitions/Dispositivo' }
    }
  }

  #swagger.responses[500] = {
    description: 'Erro interno no servidor'
  }
*/

  const dispositivos: CreateDispositivoDTO[] = req.body;

  try {
    const novosDispositivos = await createManyDispositivos(dispositivos);
    res.status(StatusCodes.CREATED).json(novosDispositivos);
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: ReasonPhrases.INTERNAL_SERVER_ERROR });
  }
};

const comentarios = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Listar todos os comentários de um dispositivo.'
  #swagger.tags = ['Dispositivos']
  #swagger.parameters['id'] = {
    in: 'path',
    required: true,
    description: 'ID do dispositivo'
  }

  #swagger.responses[200] = {
    description: 'Lista de comentários do dispositivo',
    schema: {
      type: 'array',
      items: { $ref: '#/definitions/Comentario' }
    }
  }

  #swagger.responses[404] = {
    description: 'Dispositivo não encontrado'
  }

  #swagger.responses[500] = {
    description: 'Erro interno no servidor'
  }
*/

  const { id } = req.params;

  try {
    const payload = await obterComentariosDoDispositivo(id);
    if (!payload) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Dispositivo não encontrado" });
      return;
    }
    res.status(StatusCodes.OK).json(payload);
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: ReasonPhrases.INTERNAL_SERVER_ERROR });
  }
};

const aspectos = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Retornar os scores de aspectos de um dispositivo.'
  #swagger.tags = ['Dispositivos']

  #swagger.parameters['id'] = {
    in: 'path',
    required: true,
    description: 'ID do dispositivo'
  }

  #swagger.responses[200] = {
    description: 'Scores de aspectos do dispositivo',
    schema: {
      $ref: '#/definitions/AspectoScoresResponse'
    }
  }

  #swagger.responses[404] = {
    description: 'Dispositivo não encontrado'
  }

  #swagger.responses[500] = {
    description: 'Erro interno no servidor'
  }
*/

  const { id } = req.params;

  try {
    const payload = await obterAspectoScoresDoDispositivo(id);
    if (!payload) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Dispositivo não encontrado" });
      return;
    }
    res.status(StatusCodes.OK).json(payload);
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: ReasonPhrases.INTERNAL_SERVER_ERROR });
  }
};

const resumo = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Retornar o resumo consolidado dos comentários de um dispositivo.'
  #swagger.tags = ['Dispositivos']

  #swagger.parameters['id'] = {
    in: 'path',
    required: true,
    description: 'ID do dispositivo'
  }

  #swagger.responses[200] = {
    description: 'Resumo dos comentários do dispositivo',
    schema: {
      $ref: '#/definitions/ResumoComentariosResponse'
    }
  }

  #swagger.responses[404] = {
    description: 'Dispositivo não encontrado'
  }

  #swagger.responses[500] = {
    description: 'Erro interno no servidor'
  }
*/

  const { id } = req.params;

  try {
    const payload = await obterResumoComentariosDoDispositivo(id);
    if (!payload) {
      res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Dispositivo não encontrado" });
      return;
    }
    res.status(StatusCodes.OK).json({
      ...payload,
      ultimaAtualizacao: payload.ultimaAtualizacao
        ? payload.ultimaAtualizacao.toISOString()
        : null,
    });
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: ReasonPhrases.INTERNAL_SERVER_ERROR });
  }
};

export default {
  index,
  create,
  read,
  update,
  remove,
  pesquisa,
  createMany,
  comentarios,
  aspectos,
  resumo,
};
