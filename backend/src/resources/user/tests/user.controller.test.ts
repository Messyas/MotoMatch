import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import userController from "../user.controller";
import { mockUsers, newUserMock } from "../../../tests/mocks/usuarios";

// Mock de todas as dependências do controller
import * as userService from "../user.service";
import * as emailVerification from "../../auth/emailVerification.service";
import { DefaultError } from "../../error/errors";

jest.mock("../user.service");
jest.mock("../../auth/emailVerification.service");
jest.mock("../../error/errors");

// Tipando os mocks para ter autocomplete
const mockedGetUsuarios = userService.getUsuarios as jest.Mock;
const mockedGetUsuario = userService.getUsuario as jest.Mock;
const mockedGetUsuarioById = userService.getUsuarioById as jest.Mock;
const mockedCreateUsuario = userService.createUsuario as jest.Mock;
const mockedUpdateUsuario = userService.updateUsuario as jest.Mock;
const mockedDeleteUsuario = userService.deleteUsuario as jest.Mock;
const mockedGetUsuarioByUserName =
  userService.getUsuarioByUserName as jest.Mock;
const mockedGetUsuarioByEmail = userService.getUsuarioByEmail as jest.Mock;
const mockedGetUsuarioByCelular = userService.getUsuarioByCelular as jest.Mock;
const mockedChangePasswordUsuario =
  userService.changePasswordUsuario as jest.Mock;
const mockedGetUsuariosMetrics = userService.getUsuariosMetrics as jest.Mock;
const mockedIssueEmailVerificationToken =
  emailVerification.issueEmailVerificationToken as jest.Mock;
const mockedDefaultError = DefaultError as jest.Mock;

describe("UserController", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      session: { uid: "user-session-id" } as any,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  describe("index", () => {
    it("deve retornar uma lista de usuários com datas formatadas", async () => {
      mockedGetUsuarios.mockResolvedValue(mockUsers);

      await userController.index(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        mockUsers.map((u) => ({
          ...u,
          nascimento: u.nascimento.toISOString().split("T")[0],
        }))
      );
    });
  });

  describe("create", () => {
    it("deve criar um usuário, enviar e-mail de verificação e retornar sucesso", async () => {
      req.body = newUserMock;
      mockedGetUsuarioByUserName.mockResolvedValue(null);
      mockedGetUsuarioByEmail.mockResolvedValue(null);
      mockedGetUsuarioByCelular.mockResolvedValue(null);
      const createdUser = { ...mockUsers[0], idUsuario: "novo-id" };
      mockedCreateUsuario.mockResolvedValue(createdUser);
      mockedIssueEmailVerificationToken.mockResolvedValue({} as any);

      await userController.create(req as Request, res as Response);

      expect(mockedCreateUsuario).toHaveBeenCalledWith(req.body);
      expect(mockedIssueEmailVerificationToken).toHaveBeenCalledWith({
        idUsuario: createdUser.idUsuario,
        email: createdUser.email,
        nome: createdUser.nome,
      });
      expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(res.json).toHaveBeenCalledWith({
        message:
          "Usuário criado com sucesso. Um e-mail de verificação foi enviado para o endereço cadastrado.",
      });
    });

    it("deve retornar 400 se o username já existir", async () => {
      req.body = newUserMock;
      mockedGetUsuarioByUserName.mockResolvedValue(mockUsers[0]);
      await userController.create(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        field: "username",
        message: "Username cadastrado",
      });
    });
    // Testes similares para email e celular podem ser adicionados...
  });

  describe("read", () => {
    it("deve retornar um usuário com data formatada se encontrado", async () => {
      req.params = { id: mockUsers[0].idUsuario };
      mockedGetUsuario.mockResolvedValue(mockUsers[0]);

      await userController.read(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith({
        ...mockUsers[0],
        nascimento: mockUsers[0].nascimento.toISOString().split("T")[0],
      });
    });

    it("deve retornar 404 se o usuário não for encontrado", async () => {
      req.params = { id: "id-fantasma" };
      mockedGetUsuario.mockResolvedValue(null);
      await userController.read(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    });
  });

  describe("update", () => {
    const userId = mockUsers[0].idUsuario;
    const updateData = {
      username: "novo.username",
      email: "novo.email@teste.com",
      celular: "11999999999",
    };

    it("deve atualizar o usuário e enviar e-mail se o e-mail for alterado", async () => {
      req.params = { id: userId };
      req.body = updateData;
      const currentUser = mockUsers[0];
      const updatedUser = {
        ...currentUser,
        ...updateData,
        emailVerificado: false,
      };

      mockedGetUsuarioById.mockResolvedValue(currentUser);
      mockedGetUsuarioByUserName.mockResolvedValue(null);
      mockedGetUsuarioByEmail.mockResolvedValue(null);
      mockedGetUsuarioByCelular.mockResolvedValue(null);
      mockedUpdateUsuario.mockResolvedValue(updatedUser);

      await userController.update(req as Request, res as Response);

      expect(mockedUpdateUsuario).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ emailVerificado: false })
      );
      expect(mockedIssueEmailVerificationToken).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Usuário atualizado. Um novo e-mail de verificação foi enviado.",
        })
      );
    });

    it("deve atualizar o usuário sem enviar e-mail se o e-mail não for alterado", async () => {
      req.params = { id: userId };
      const updateDataSemEmail = { ...updateData, email: mockUsers[0].email };
      req.body = updateDataSemEmail;
      const currentUser = mockUsers[0];

      mockedGetUsuarioById.mockResolvedValue(currentUser);
      mockedGetUsuarioByUserName.mockResolvedValue(null);
      mockedGetUsuarioByEmail.mockResolvedValue(currentUser); // Retorna ele mesmo, o que é válido
      mockedGetUsuarioByCelular.mockResolvedValue(null);
      mockedUpdateUsuario.mockResolvedValue({
        ...currentUser,
        ...updateDataSemEmail,
      });

      await userController.update(req as Request, res as Response);

      expect(mockedIssueEmailVerificationToken).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Usuário atualizado com sucesso.",
        })
      );
    });

    it("deve retornar 404 se o usuário a ser atualizado não for encontrado", async () => {
      req.params = { id: "id-fantasma" };
      mockedGetUsuarioById.mockResolvedValue(null);
      await userController.update(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    });

    it("deve retornar 400 se o novo username já pertencer a outro usuário", async () => {
      req.params = { id: userId };
      req.body = updateData;
      mockedGetUsuarioById.mockResolvedValue(mockUsers[0]);
      mockedGetUsuarioByUserName.mockResolvedValue(mockUsers[1]); // Outro usuário
      await userController.update(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    });
  });

  describe("remove", () => {
    it("deve deletar o usuário e retornar 204", async () => {
      req.params = { id: mockUsers[0].idUsuario };
      mockedDeleteUsuario.mockResolvedValue(true);
      await userController.remove(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.NO_CONTENT);
    });

    it("deve retornar 404 se o usuário a ser deletado não for encontrado", async () => {
      req.params = { id: "id-fantasma" };
      mockedDeleteUsuario.mockResolvedValue(false);
      await userController.remove(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    });
  });

  describe("changePassword", () => {
    it("deve alterar a senha com sucesso", async () => {
      req.params = { id: mockUsers[0].idUsuario };
      req.body = { oldPassword: "123", newPassword: "456" };
      mockedChangePasswordUsuario.mockResolvedValue(true);
      await userController.changePassword(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it("deve retornar 400 se a senha antiga estiver incorreta", async () => {
      req.params = { id: mockUsers[0].idUsuario };
      req.body = { oldPassword: "senha-errada", newPassword: "456" };
      mockedChangePasswordUsuario.mockResolvedValue(false);
      await userController.changePassword(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    });
  });

  describe("selfRemove", () => {
    it("deve deletar o próprio usuário, limpar o cookie e encerrar a sessão", async () => {
      req.session!.uid = mockUsers[0].idUsuario;
      req.session!.destroy = jest.fn((callback: (err: any) => void) =>
        callback(null)
      ) as any;
      mockedDeleteUsuario.mockResolvedValue(true);

      await userController.selfRemove(req as Request, res as Response);

      expect(mockedDeleteUsuario).toHaveBeenCalledWith(mockUsers[0].idUsuario);
      expect(req.session!.destroy).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith("connect.sid");
      expect(res.status).toHaveBeenCalledWith(StatusCodes.NO_CONTENT);
    });
  });

  describe("metrics", () => {
    it("deve retornar as métricas dos usuários", async () => {
      const mockMetrics = { totals: { usuarios: 10 } };
      mockedGetUsuariosMetrics.mockResolvedValue(mockMetrics);

      await userController.metrics(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(mockMetrics);
    });
  });
});
