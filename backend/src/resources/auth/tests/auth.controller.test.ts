import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import authController from "../auth.controller";
import { prismaMock } from "../../../tests/mocks/databaseMock";
import { newUserMock, mockUsers } from "../../../tests/mocks/usuarios";

// Mock robusto para a biblioteca 'googleapis' para evitar erros de inicialização.
jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        getAccessToken: jest
          .fn()
          .mockResolvedValue({ token: "mock-access-token" }),
      })),
    },
    oauth2: jest.fn(() => ({
      userinfo: {
        get: jest.fn().mockResolvedValue({
          data: {
            id: "google-user-id-123",
            email: "test.user@gmail.com",
            name: "Test User",
          },
        }),
      },
    })),
  },
}));

// Carrega o mock do Prisma dinamicamente.
jest.mock("../../../database/prismaSingleton", () => ({
  __esModule: true,
  prisma: require("../../../tests/mocks/databaseMock").prismaMock,
}));

// Mock dos serviços e utils.
import * as gmailClient from "../../../utils/gmailClient";
import * as userService from "../../user/user.service";
import * as authService from "../auth.service";
import * as emailVerification from "../emailVerification.service";

jest.mock("../../user/user.service");
jest.mock("../auth.service");
jest.mock("../emailVerification.service");
jest.mock("../../error/errors");
jest.mock("../../../utils/gmailClient");

// Tipando os mocks.
const mockedGetUsuario = userService.getUsuario as jest.Mock;
const mockedCreateUsuario = userService.createUsuario as jest.Mock;
const mockedGetUsuarioByUserName =
  userService.getUsuarioByUserName as jest.Mock;
const mockedGetUsuarioByEmail = userService.getUsuarioByEmail as jest.Mock;
const mockedGetUsuarioByCelular = userService.getUsuarioByCelular as jest.Mock;
const mockedIssueEmailVerificationToken =
  emailVerification.issueEmailVerificationToken as jest.Mock;
const mockedCheckCredentials = authService.CheckCredentials as jest.Mock;
const mockedVerifyEmailToken = emailVerification.verifyEmailToken as jest.Mock;
const mockedUpsertUsuarioFromGoogle =
  authService.upsertUsuarioFromGoogle as jest.Mock;
const mockedIsGoogleClientConfigured =
  gmailClient.isGoogleClientConfigured as jest.Mock;
const mockedGetOAuthClient = gmailClient.getOAuthClient as jest.Mock;

describe("AuthController", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeAll(() => {
    // Silencia os logs para uma saída de teste limpa.
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      query: {},
      params: {},
      session: {} as any,
      headers: {
        accept: "text/html",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn(),
    };
  });

  describe("signup", () => {
    it("deve criar um novo usuário com sucesso", async () => {
      req.body = newUserMock;
      mockedGetUsuarioByUserName.mockResolvedValue(null);
      mockedGetUsuarioByEmail.mockResolvedValue(null);
      mockedGetUsuarioByCelular.mockResolvedValue(null);
      const createdUser = { ...newUserMock, idUsuario: "new-user-id" };
      mockedCreateUsuario.mockResolvedValue(createdUser);
      prismaMock.emailVerificationToken.findMany.mockResolvedValue([]);
      mockedIssueEmailVerificationToken.mockResolvedValue({ emailSent: true });

      await authController.signup(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(res.json).toHaveBeenCalledWith({
        message:
          "Cadastro realizado com sucesso. Verifique seu e-mail para ativar a conta.",
      });
    });

    it("deve retornar 400 se o username já existir", async () => {
      req.body = newUserMock;
      mockedGetUsuarioByUserName.mockResolvedValue(mockUsers[0]);
      await authController.signup(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        field: "username",
        message: "Username cadastrado",
      });
    });

    it("deve retornar 400 se o email já existir", async () => {
      req.body = newUserMock;
      mockedGetUsuarioByUserName.mockResolvedValue(null);
      mockedGetUsuarioByEmail.mockResolvedValue(mockUsers[0]);
      await authController.signup(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        field: "email",
        message: "E-mail cadastrado",
      });
    });

    it("deve retornar 400 se o celular já existir", async () => {
      req.body = newUserMock;
      mockedGetUsuarioByUserName.mockResolvedValue(null);
      mockedGetUsuarioByEmail.mockResolvedValue(null);
      mockedGetUsuarioByCelular.mockResolvedValue(mockUsers[0]);
      await authController.signup(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        field: "celular",
        message: "Celular cadastrado",
      });
    });

    it("deve retornar 429 se um e-mail de verificação foi enviado há menos de 60 segundos", async () => {
      req.body = newUserMock;
      const createdUser = { ...newUserMock, idUsuario: "new-user-id" };
      mockedGetUsuarioByUserName.mockResolvedValue(null);
      mockedGetUsuarioByEmail.mockResolvedValue(null);
      mockedGetUsuarioByCelular.mockResolvedValue(null);
      mockedCreateUsuario.mockResolvedValue(createdUser);
      const recentToken = { createdAt: new Date(Date.now() - 30 * 1000) };
      prismaMock.emailVerificationToken.findMany.mockResolvedValue([
        recentToken as any,
      ]);

      await authController.signup(req as Request, res as Response);
      expect((res.status as jest.Mock).mock.calls[0][0]).toBe(
        StatusCodes.TOO_MANY_REQUESTS
      );
    });
  });

  describe("login", () => {
    const loginData = { username: mockUsers[0].username, password: "123" };

    it("deve logar o usuário com sucesso", async () => {
      req.body = loginData;
      const verifiedUser = { ...mockUsers[0], emailVerificado: true };
      mockedCheckCredentials.mockResolvedValue(verifiedUser);

      await authController.login(req as Request, res as Response);
      expect(req.session!.uid).toBe(verifiedUser.idUsuario);
      expect(req.session!.userTypeId).toBe(verifiedUser.tipo);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it("deve retornar 401 para credenciais inválidas", async () => {
      req.body = loginData;
      mockedCheckCredentials.mockResolvedValue(null);
      await authController.login(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    });

    it("deve retornar 403 se o e-mail não for verificado", async () => {
      req.body = loginData;
      const unverifiedUser = { ...mockUsers[0], emailVerificado: false };
      mockedCheckCredentials.mockResolvedValue(unverifiedUser);
      await authController.login(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.FORBIDDEN);
    });
  });

  describe("logout", () => {
    it("deve encerrar a sessão com sucesso", async () => {
      req.session!.uid = mockUsers[0].idUsuario;
      req.session!.destroy = jest.fn((callback: (err: any) => void) =>
        callback(null)
      ) as any;

      await authController.logout(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it("deve retornar 401 se não houver sessão", async () => {
      req.session = undefined;
      await authController.logout(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    });

    it("deve retornar 500 se session.destroy falhar", async () => {
      req.session!.uid = mockUsers[0].idUsuario;
      req.session!.destroy = jest.fn((callback: (err: any) => void) =>
        callback(new Error("Falha ao destruir"))
      ) as any;

      await authController.logout(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    });
  });

  describe("me", () => {
    it("deve retornar os dados do usuário logado", async () => {
      const user = mockUsers[0];
      req.session!.uid = user.idUsuario;
      mockedGetUsuario.mockResolvedValue(user);

      await authController.me(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(user);
    });

    it("deve retornar 401 se não houver sessão", async () => {
      req.session = undefined;
      await authController.me(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    });

    it("deve retornar 404 se o usuário da sessão não for encontrado", async () => {
      req.session!.uid = "id-fantasma";
      mockedGetUsuario.mockResolvedValue(null);
      await authController.me(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    });
  });

  describe("verifyEmail", () => {
    it("deve retornar 400 se o token não for fornecido", async () => {
      req.query = { token: undefined };
      await authController.verifyEmail(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    });
    // Adicione outros testes para cada status de verifyEmailToken se desejar...
  });

  describe("googleAuth", () => {
    it("deve redirecionar para a URL de autenticação", async () => {
      mockedIsGoogleClientConfigured.mockReturnValue(true);
      const mockAuthUrl = "https://google.com/auth/url";
      mockedGetOAuthClient.mockReturnValue({
        generateAuthUrl: jest.fn().mockReturnValue(mockAuthUrl),
      } as any);

      await authController.googleAuth(req as Request, res as Response);
      expect(res.redirect).toHaveBeenCalledWith(mockAuthUrl);
    });

    it("deve retornar uma URL JSON se solicitado", async () => {
      req.headers!.accept = "application/json"; // Simula cliente de API
      mockedIsGoogleClientConfigured.mockReturnValue(true);
      const mockAuthUrl = "https://google.com/auth/url";
      mockedGetOAuthClient.mockReturnValue({
        generateAuthUrl: jest.fn().mockReturnValue(mockAuthUrl),
      } as any);

      await authController.googleAuth(req as Request, res as Response);
      expect(res.json).toHaveBeenCalledWith({ url: mockAuthUrl });
    });
  });

  describe("googleCallback", () => {
    it("deve logar o usuário com sucesso e redirecionar", async () => {
      req.query = { code: "google-auth-code" };
      const mockOAuth2Client = {
        getToken: jest.fn().mockResolvedValue({
          tokens: { refresh_token: "mock-refresh-token" },
        }),
        setCredentials: jest.fn(),
      };
      mockedGetOAuthClient.mockReturnValue(mockOAuth2Client as any);
      mockedUpsertUsuarioFromGoogle.mockResolvedValue(mockUsers[0]);

      await authController.googleCallback(req as Request, res as Response);
      expect(mockedUpsertUsuarioFromGoogle).toHaveBeenCalled();
      expect(req.session!.uid).toBe(mockUsers[0].idUsuario);
      expect(res.redirect).toHaveBeenCalled();
    });

    it("deve retornar JSON se solicitado", async () => {
      req.query = { code: "google-auth-code" };
      req.headers!.accept = "application/json";
      const mockOAuth2Client = {
        getToken: jest.fn().mockResolvedValue({ tokens: {} }),
        setCredentials: jest.fn(),
      };
      mockedGetOAuthClient.mockReturnValue(mockOAuth2Client as any);
      mockedUpsertUsuarioFromGoogle.mockResolvedValue(mockUsers[0]);

      await authController.googleCallback(req as Request, res as Response);
      expect(res.json).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("deve lidar com falha ao obter o token", async () => {
      req.query = { code: "bad-code" };
      const mockOAuth2Client = {
        getToken: jest.fn().mockRejectedValue(new Error("Código inválido")),
        setCredentials: jest.fn(),
      };
      mockedGetOAuthClient.mockReturnValue(mockOAuth2Client as any);

      await authController.googleCallback(req as Request, res as Response);
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("error")
      );
    });
  });
});
