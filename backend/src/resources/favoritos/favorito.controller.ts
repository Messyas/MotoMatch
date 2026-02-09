import { Request, Response, RequestHandler } from "express";
import * as favoritoService from "./favorito.service";
import {
  AdicionarFavoritoInput,
  RemoverFavoritoParams,
} from "./favorito.types";

export async function addFavorito(
  req: Request<unknown, any, AdicionarFavoritoInput>,
  res: Response
) {
  /*
  #swagger.summary = 'Adicionar um dispositivo aos favoritos do usuário autenticado.'
  #swagger.tags = ['Favoritos']

  #swagger.parameters['body'] = {
    in: 'body',
    required: true,
    description: 'Dados para adicionar o dispositivo aos favoritos.',
    schema: {
      type: 'object',
      required: ['idDispositivo'],
      properties: {
        idDispositivo: {
          type: 'string',
          description: 'ID do dispositivo que será favoritado.'
        },
        idHistorico: {
          type: 'string',
          nullable: true,
          description: 'ID opcional de um histórico de pesquisa associado.'
        }
      }
    }
  }

  #swagger.responses[201] = {
    description: 'Favorito adicionado com sucesso.',
    schema: { $ref: '#/definitions/Favorito' }
  }

  #swagger.responses[401] = {
    description: 'Usuário não autenticado.'
  }

  #swagger.responses[409] = {
    description: 'O dispositivo já foi favoritado anteriormente.'
  }

  #swagger.responses[500] = {
    description: 'Erro ao adicionar favorito.'
  }
*/

  const idUsuario = req.session?.uid;
  const { idDispositivo, idHistorico } = req.body;

  if (!idUsuario) {
    return res.status(401).json({ message: "Usuário não autenticado." });
  }

  try {
    const novoFavorito = await favoritoService.adicionarFavorito(
      idUsuario,
      idDispositivo,
      idHistorico
    );
    return res.status(201).json(novoFavorito);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ message: "Este dispositivo já foi favoritado." });
    }
    console.error(error);
    return res.status(500).json({ message: "Erro ao adicionar favorito." });
  }
}

export async function listarFavoritos(req: Request, res: Response) {
  /*
  #swagger.summary = 'Listar todos os dispositivos favoritados pelo usuário autenticado.'
  #swagger.tags = ['Favoritos']

  #swagger.responses[200] = {
    description: 'Lista de favoritos do usuário.',
    schema: {
      type: 'array',
      items: { $ref: '#/definitions/Favorito' }
    }
  }

  #swagger.responses[401] = {
    description: 'Usuário não autenticado.'
  }

  #swagger.responses[500] = {
    description: 'Erro ao listar favoritos.'
  }
*/

  const idUsuario = req.session?.uid;

  if (!idUsuario) {
    return res.status(401).json({ message: "Usuário não autenticado." });
  }

  try {
    const favoritos = await favoritoService.listarFavoritos(idUsuario);
    return res.status(200).json(favoritos);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao listar favoritos." });
  }
}

export const removerFavorito: RequestHandler = async (
  req: Request,
  res: Response
) => {
  /*
  #swagger.summary = 'Remover um dispositivo dos favoritos do usuário autenticado.'
  #swagger.tags = ['Favoritos']

  #swagger.parameters['idDispositivo'] = {
    in: 'path',
    required: true,
    description: 'ID do dispositivo que será removido dos favoritos.'
  }

  #swagger.responses[204] = {
    description: 'Favorito removido com sucesso.'
  }

  #swagger.responses[401] = {
    description: 'Usuário não autenticado.'
  }

  #swagger.responses[500] = {
    description: 'Erro ao remover favorito.'
  }
*/

  const idUsuario = req.session?.uid;
  const { idDispositivo } = req.params as unknown as RemoverFavoritoParams;

  if (!idUsuario) {
    return res.status(401).json({ message: "Usuário não autenticado." });
  }

  try {
    await favoritoService.removerFavorito(idUsuario, idDispositivo);
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao remover favorito." });
  }
};
