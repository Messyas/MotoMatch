import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import historicoController from "../historico.controller";
import * as historicoService from "../historico.service";

// Mock do módulo de serviço para isolar o controller
jest.mock("../historico.service");

// Tipando o mock para ter autocomplete
const mockedGetHistoricoPaginado = historicoService.getHistoricoPaginado as jest.Mock;

describe("HistoricoController", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const mockSession = { uid: "user-123" };

  beforeAll(() => {
    // Silencia o console.error para uma saída de teste limpa
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      query: {},
      session: mockSession as any,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe("getHistorico", () => {
    it("deve buscar o histórico paginado com sucesso e retornar 200", async () => {
      // Arrange
      req.query = { page: "2", pageSize: "5" };
      const mockResultadoPaginado = {
        data: [{ idHistorico: "hist-1" }],
        meta: { totalItems: 1, currentPage: 2, pageSize: 5, totalPages: 1 },
      };
      mockedGetHistoricoPaginado.mockResolvedValue(mockResultadoPaginado as any);

      // Act
      await historicoController.getHistorico(req as Request, res as Response);

      // Assert
      expect(mockedGetHistoricoPaginado).toHaveBeenCalledWith(mockSession.uid, {
        page: 2,
        pageSize: 5,
      });
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(mockResultadoPaginado);
    });

    it("deve usar os valores padrão de paginação (page=1, pageSize=3) se não forem fornecidos", async () => {
      // Arrange
      mockedGetHistoricoPaginado.mockResolvedValue({ data: [], meta: {} } as any);

      // Act
      await historicoController.getHistorico(req as Request, res as Response);

      // Assert
      expect(mockedGetHistoricoPaginado).toHaveBeenCalledWith(mockSession.uid, {
        page: 1,
        pageSize: 3,
      });
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });

    it("deve retornar 401 se o usuário não estiver autenticado", async () => {
      // Arrange
      // AJUSTE: Em vez de req.session = undefined, removemos apenas a propriedade 'uid'.
      // Isso evita o erro de 'Cannot read properties of undefined' no controller.
      req.session = { uid: undefined } as any;

      // Act
      await historicoController.getHistorico(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
      expect(res.json).toHaveBeenCalledWith({ message: "Usuário não autenticado." });
      expect(mockedGetHistoricoPaginado).not.toHaveBeenCalled();
    });

    it("deve retornar 500 se o serviço lançar um erro", async () => {
      // Arrange
      const errorMessage = "Erro no banco de dados";
      mockedGetHistoricoPaginado.mockRejectedValue(new Error(errorMessage));

      // Act
      await historicoController.getHistorico(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith({
        message: "Ocorreu um erro inesperado ao buscar o histórico.",
      });
    });
  });
});
