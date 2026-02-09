import { Request, Response } from "express";
import {
  ChangePasswordDTO,
  CreateUsuarioDTO,
  UpdateUsuarioDTO,
} from "./user.types";
import {
  createUsuario,
  getUsuarios,
  getUsuario,
  updateUsuario,
  deleteUsuario,
  getUsuarioByUserName,
  getUsuarioByEmail,
  getUsuarioByCelular,
  changePasswordUsuario,
  getUsuarioById,
  getUsuariosMetrics,
} from "./user.service";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { DefaultError } from "../error/errors";
import { issueEmailVerificationToken } from "../auth/emailVerification.service";

/* Listagem de usuários */
const index = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Listagem de todos os usuários'
  #swagger.description = 'Retorna uma lista de usuários cadastrados, com a data de nascimento formatada como YYYY-MM-DD.'
  #swagger.tags = ['Usuários']

  #swagger.responses[200] = {
    description: 'Lista de usuários retornada com sucesso.',
    schema: {
      type: 'array',
      items: { $ref: '#/definitions/User' }
    }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao listar usuários.',
    schema: { message: 'Erro interno no servidor.' }
  }
*/
  try {
    const users = await getUsuarios();
    const formattedUsers = users.map((user) => ({
      ...user,
      nascimento: user.nascimento.toISOString().split("T")[0],
    }));
    res.status(StatusCodes.OK).json(formattedUsers);
  } catch (err) {
    DefaultError(res, err);
  }
};

/* Criação de usuário */
const create = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Criar um novo usuário no sistema.'
  #swagger.description = 'Adiciona um novo usuário à base de dados após validar e garantir que não exista username, e-mail ou celular duplicados. Após a criação, um e-mail de verificação é enviado ao usuário.'

  #swagger.tags = ['Usuários']

  #swagger.parameters['body'] = {
    in: 'body',
    required: true,
    description: 'Dados necessários para criar um novo usuário.',
    schema: { $ref: '#/definitions/CreateUsuarioDTO' }
  }

  #swagger.responses[201] = {
    description: 'Usuário criado com sucesso.',
    schema: {
      message: 'Usuário criado com sucesso. Um e-mail de verificação foi enviado para o endereço cadastrado.'
    }
  }

  #swagger.responses[400] = {
    description: 'Algum campo já está cadastrado (username, e-mail ou celular).',
    schema: {
      field: 'email',
      message: 'E-mail cadastrado'
    }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao criar o usuário.',
    schema: { message: 'Erro interno no servidor.' }
  }
*/

  const newUser = req.body as CreateUsuarioDTO;

  try {
    if (await getUsuarioByUserName(newUser.username)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        field: "username",
        message: "Username cadastrado",
      });
    }

    if (await getUsuarioByEmail(newUser.email)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        field: "email",
        message: "E-mail cadastrado",
      });
    }

    if (await getUsuarioByCelular(newUser.celular)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        field: "celular",
        message: "Celular cadastrado",
      });
    }

    const user = await createUsuario(newUser);

    // Gera token e envia e-mail de verificação
    try {
      await issueEmailVerificationToken({
        idUsuario: user.idUsuario,
        email: user.email,
        nome: user.nome,
      });
    } catch (emailErr) {
      console.error("Erro ao enviar e-mail de verificação:", emailErr);
      // Continua o fluxo mesmo se o e-mail falhar
    }

    return res.status(StatusCodes.CREATED).json({
      message:
        "Usuário criado com sucesso. Um e-mail de verificação foi enviado para o endereço cadastrado.",
    });
  } catch (err) {
    DefaultError(res, err);
  }
};

/* Recuperar usuário específico */
const read = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Recuperar os dados de um usuário específico.'
  #swagger.description = 'Retorna as informações completas de um usuário com base no ID fornecido. Caso o usuário não seja encontrado, retorna erro 404.'
  #swagger.tags = ['Usuários']

  #swagger.parameters['id'] = {
    in: 'path',
    required: true,
    description: 'ID do usuário que deseja consultar.',
    type: 'string'
  }

  #swagger.responses[200] = {
    description: 'Usuário localizado com sucesso.',
    schema: { $ref: '#/definitions/User' }
  }

  #swagger.responses[404] = {
    description: 'Usuário não encontrado.',
    schema: { message: 'Usuário não encontrado' }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao buscar o usuário.',
    schema: { message: 'Erro interno no servidor.' }
  }
*/

  const idUsuario = req.params.id;
  try {
    const user = await getUsuario(idUsuario);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Usuário não encontrado",
      });
    }
    const formattedUser = {
      ...user,
      nascimento: user.nascimento.toISOString().split("T")[0],
    };
    res.status(StatusCodes.OK).json(formattedUser);
  } catch (err) {
    DefaultError(res, err);
  }
};

/* Atualizar usuário */
const update = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Atualizar os dados de um usuário existente.'
  #swagger.description = `
    Atualiza os dados de um usuário com base no ID informado.  
    O endpoint realiza validações de duplicidade de username, e-mail e celular.  
    Caso o e-mail seja alterado, o usuário é marcado como não verificado e um novo e-mail de verificação é enviado.
  `
  #swagger.tags = ['Usuários']

  #swagger.parameters['id'] = {
    in: 'path',
    required: true,
    description: 'ID do usuário que será atualizado.',
    type: 'string'
  }

  #swagger.parameters['body'] = {
    in: 'body',
    required: true,
    schema: { $ref: '#/definitions/UpdateUsuarioDTO' },
    description: 'Dados que serão atualizados.'
  }

  #swagger.responses[200] = {
    description: 'Usuário atualizado com sucesso.',
    schema: {
      message: 'Usuário atualizado com sucesso.',
      user: { $ref: '#/definitions/User' }
    }
  }

  #swagger.responses[400] = {
    description: 'Algum campo já está cadastrado (username, e-mail ou celular).',
    schema: {
      field: 'email',
      message: 'E-mail cadastrado'
    }
  }

  #swagger.responses[404] = {
    description: 'Usuário não encontrado.',
    schema: { message: 'Usuário não encontrado' }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao atualizar o usuário.',
    schema: { message: 'Erro interno no servidor.' }
  }
*/

  const idUsuario = req.params.id;
  const updatedData = req.body as UpdateUsuarioDTO;

  try {
    // Busca o usuário atual
    const currentUser = await getUsuarioById(idUsuario);
    if (!currentUser) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Usuário não encontrado",
      });
    }

    // Verificações de duplicidade
    const existingUsername = await getUsuarioByUserName(updatedData.username);
    if (
      existingUsername &&
      existingUsername.idUsuario !== currentUser.idUsuario
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        field: "username",
        message: "Username cadastrado",
      });
    }

    const existingEmail = await getUsuarioByEmail(updatedData.email);
    if (existingEmail && existingEmail.idUsuario !== currentUser.idUsuario) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        field: "email",
        message: "E-mail cadastrado",
      });
    }

    const existingCelular = await getUsuarioByCelular(updatedData.celular);
    if (
      existingCelular &&
      existingCelular.idUsuario !== currentUser.idUsuario
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        field: "celular",
        message: "Celular cadastrado",
      });
    }

    // Detecta se o e-mail foi alterado
    const emailAlterado =
      updatedData.email && updatedData.email !== currentUser.email;

    // Atualiza o usuário
    const updatedUser = await updateUsuario(idUsuario, {
      ...updatedData,
      ...(emailAlterado ? { emailVerificado: false } : {}), // marca como não verificado
    });

    if (!updatedUser) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: "Usuário não encontrado",
      });
    }

    // Se o e-mail foi alterado, envia novo e-mail de verificação
    if (emailAlterado) {
      try {
        await issueEmailVerificationToken({
          idUsuario: updatedUser.idUsuario,
          email: updatedUser.email,
          nome: updatedUser.nome,
        });
      } catch (emailErr) {
        console.error("Erro ao enviar e-mail de verificação:", emailErr);
        // não bloqueia a atualização
      }
    }

    const formattedUser = {
      ...updatedUser,
      nascimento: updatedUser.nascimento
        ? updatedUser.nascimento.toISOString().split("T")[0]
        : null,
    };

    return res.status(StatusCodes.OK).json({
      message: emailAlterado
        ? "Usuário atualizado. Um novo e-mail de verificação foi enviado."
        : "Usuário atualizado com sucesso.",
      user: formattedUser,
    });
  } catch (err) {
    DefaultError(res, err);
  }
};

/* Remover usuário */
const remove = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Remover um usuário específico do sistema.'
  #swagger.description = 'Deleta permanentemente um usuário com base no ID informado. Caso o usuário não exista, retorna 404.'
  #swagger.tags = ['Usuários']

  #swagger.parameters['id'] = {
    in: 'path',
    required: true,
    type: 'string',
    description: 'ID do usuário que será removido.'
  }

  #swagger.responses[204] = {
    description: 'Usuário deletado com sucesso. Nenhum conteúdo é retornado.'
  }

  #swagger.responses[404] = {
    description: 'Usuário não encontrado.',
    schema: { message: 'Usuário não encontrado' }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao tentar deletar o usuário.',
    schema: { message: 'Erro interno no servidor.' }
  }
*/

  const { id } = req.params;
  try {
    const result = await deleteUsuario(id);
    if (result === true) res.status(StatusCodes.NO_CONTENT).json();
    else
      res.status(StatusCodes.NOT_FOUND).json({
        message: "Usuário não encontrado",
      });
  } catch (err) {
    DefaultError(res, err);
  }
};

/* Alterar senha */
const changePassword = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Alterar a senha de um usuário específico.'
  #swagger.description = `
    Permite que o usuário altere sua senha informando a senha atual e a nova senha.  
    Retorna erro caso a senha atual esteja incorreta ou caso o usuário não exista.
  `
  #swagger.tags = ['Usuários']

  #swagger.parameters['id'] = {
    in: 'path',
    required: true,
    type: 'string',
    description: 'ID do usuário que terá a senha alterada.'
  }

  #swagger.parameters['body'] = {
    in: 'body',
    required: true,
    description: 'Dados necessários para alterar a senha.',
    schema: { $ref: '#/definitions/ChangePasswordDTO' }
  }

  #swagger.responses[200] = {
    description: 'Senha alterada com sucesso.',
    schema: { message: 'OK' }
  }

  #swagger.responses[400] = {
    description: 'Senha atual incorreta ou dados inválidos.',
    schema: { message: 'Senha atual incorreta' }
  }

  #swagger.responses[404] = {
    description: 'Usuário não encontrado.',
    schema: { message: 'Usuário não encontrado' }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao tentar alterar a senha.',
    schema: { message: 'Erro interno no servidor.' }
  }
*/

  const idUsuario = req.params.id;
  const { oldPassword, newPassword } = req.body as ChangePasswordDTO;
  try {
    const ok = await changePasswordUsuario(idUsuario, oldPassword, newPassword);
    if (ok)
      res.status(StatusCodes.OK).json({
        message: ReasonPhrases.OK,
      });
    else
      res.status(StatusCodes.BAD_REQUEST).json({
        message: "Senha atual incorreta",
      });
  } catch (err) {
    DefaultError(res, err);
  }
};

const selfRemove = async (req: Request, res: Response) => {
  /*
  #swagger.summary = 'Remover permanentemente a própria conta do usuário autenticado.'
  #swagger.description = `
    Deleta a conta do usuário atualmente autenticado.  
    Após a exclusão, a sessão é destruída e o cookie de autenticação é removido.
  `
  #swagger.tags = ['Usuários']

  #swagger.responses[204] = {
    description: 'Conta deletada com sucesso. Nenhum conteúdo é retornado.'
  }

  #swagger.responses[401] = {
    description: 'Usuário não está autenticado.',
    schema: { message: 'Não autenticado' }
  }

  #swagger.responses[500] = {
    description: 'Erro interno ao deletar a conta ou destruir a sessão.',
    schema: { message: 'Erro interno no servidor.' }
  }
*/

  const idUsuario = req.session.uid!;
  try {
    await deleteUsuario(idUsuario);
    req.session.destroy((err) => {
      if (err) {
        // Não consegue destruir a sessão, mas a conta foi deletada
        // Apenas loga o erro, mas envia sucesso para o cliente
        console.error("Erro ao destruir a sessão:", err);
      }
      res.clearCookie("connect.sid");
      return res.status(StatusCodes.NO_CONTENT).send();
    });
  } catch (err) {
    DefaultError(res, err);
  }
};

const metrics = async (_req: Request, res: Response) => {
  try {
    const overview = await getUsuariosMetrics();
    res.status(StatusCodes.OK).json(overview);
  } catch (err) {
    DefaultError(res, err);
  }
};

export default {
  index,
  create,
  read,
  update,
  remove,
  changePassword,

  selfRemove,
  metrics,
};
