import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { getUsuarioById } from "../resources/user/user.service";

export const canUpdateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params; // id do usuário que se quer alterar
  const sessionUserId = req.session.uid;
  const sessionUserType = req.session.userTypeId; // "0", "1" ou "2"
  const { tipo: newTipo } = req.body; // tipo que o usuário quer atualizar

  if (!sessionUserId) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json({ error: "Usuário não autenticado" });
  }

  // Admin: pode atualizar qualquer usuário
  if (sessionUserType === "0") return next();

  // Buscar o usuário alvo
  const targetUser = await getUsuarioById(id);
  if (!targetUser) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ error: "Usuário não encontrado" });
  }

  // Suporte
  if (sessionUserType === "2") {
    // Pode atualizar usuário comum ou a si mesmo
    if (targetUser.tipo !== "1" && targetUser.idUsuario !== sessionUserId) {
      return res.status(StatusCodes.FORBIDDEN).json({
        error: "Suporte não pode alterar administradores ou outros suportes",
      });
    }

    // Não pode promover ninguém a admin ou suporte
    if (newTipo && newTipo !== "1" && targetUser.idUsuario !== sessionUserId) {
      return res.status(StatusCodes.FORBIDDEN).json({
        error: "Suporte não pode alterar tipo do usuário",
      });
    }

    return next();
  }

  // Usuário comum: só pode atualizar a si mesmo, sem alterar tipo
  if (sessionUserType === "1" && sessionUserId === id) {
    if (newTipo && newTipo !== "1") {
      return res.status(StatusCodes.FORBIDDEN).json({
        error: "Usuário comum não pode alterar tipo",
      });
    }
    return next();
  }

  // Caso contrário, sem permissão
  return res.status(StatusCodes.FORBIDDEN).json({ error: "Sem permissão" });
};
