import { Request, Response, NextFunction } from "express"; // Importar NextFunction
import { StatusCodes } from "http-status-codes";
import * as favoritoController from "../favorito.controller";
import * as favoritoService from "../favorito.service";

// Mock do módulo de serviço para isolar o controller
jest.mock("../favorito.service");

// Tipando os mocks para ter autocomplete
const mockedAdicionarFavorito = favoritoService.adicionarFavorito as jest.Mock;
const mockedListarFavoritos = favoritoService.listarFavoritos as jest.Mock;
const mockedRemoverFavorito = favoritoService.removerFavorito as jest.Mock;

describe("FavoritoController", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction; // AJUSTE 1: Declarar a função next
  const mockSession = { uid: "user-123" };

  beforeAll(() => {
    // Silencia o console.error para uma saída de teste limpa
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      session: mockSession as any,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    next = jest.fn(); // AJUSTE 2: Criar um mock para a função next
  });

  describe("addFavorito", () => {
    const input = { idDispositivo: "device-abc", idHistorico: "history-xyz" };

    it("deve adicionar um favorito com sucesso e retornar 201", async () => {
      req.body = input;
      const mockFavorito = { idFavorito: "fav-1", ...input };
      mockedAdicionarFavorito.mockResolvedValue(mockFavorito);

      await favoritoController.addFavorito(req as Request, res as Response);

      expect(mockedAdicionarFavorito).toHaveBeenCalledWith(
        mockSession.uid,
        input.idDispositivo,
        input.idHistorico
      );
      expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
      expect(res.json).toHaveBeenCalledWith(mockFavorito);
    });

    it("deve retornar 401 se o usuário não estiver autenticado", async () => {
      req.session = undefined;
      await favoritoController.addFavorito(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    });

    it("deve retornar 409 se o dispositivo já foi favoritado (erro P2002)", async () => {
      req.body = input;
      const prismaConflictError = { code: "P2002" };
      mockedAdicionarFavorito.mockRejectedValue(prismaConflictError);

      await favoritoController.addFavorito(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.CONFLICT);
    });
  });

  describe("listarFavoritos", () => {
    it("deve listar os favoritos do usuário com sucesso e retornar 200", async () => {
      const mockListaFavoritos = [{ idFavorito: "fav-1" }];
      mockedListarFavoritos.mockResolvedValue(mockListaFavoritos);

      await favoritoController.listarFavoritos(req as Request, res as Response);

      expect(mockedListarFavoritos).toHaveBeenCalledWith(mockSession.uid);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(mockListaFavoritos);
    });

    it("deve retornar 401 se o usuário não estiver autenticado", async () => {
      req.session = undefined;
      await favoritoController.listarFavoritos(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    });
  });

  describe("removerFavorito", () => {
    const params = { idDispositivo: "device-abc" };

    it("deve remover um favorito com sucesso e retornar 204", async () => {
      req.params = params;
      mockedRemoverFavorito.mockResolvedValue(undefined);

      // AJUSTE 3: Passar a função 'next' como terceiro argumento.
      await favoritoController.removerFavorito(req as Request, res as Response, next);

      expect(mockedRemoverFavorito).toHaveBeenCalledWith(mockSession.uid, params.idDispositivo);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.NO_CONTENT);
      expect(res.send).toHaveBeenCalled();
    });

    it("deve retornar 401 se o usuário não estiver autenticado", async () => {
      req.session = undefined;
      await favoritoController.removerFavorito(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    });

    it("deve retornar 500 se o serviço falhar", async () => {
      req.params = params;
      mockedRemoverFavorito.mockRejectedValue(new Error("Erro ao deletar"));
      await favoritoController.removerFavorito(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    });
  });
});