import { getHistoricoPaginado, salvarHistorico } from "../historico.service";
import { prismaMock } from "../../../tests/mocks/databaseMock";
import { Prisma } from "@prisma/client";

// Mock do singleton do Prisma.
jest.mock("../../../database/prismaSingleton", () => ({
  __esModule: true,
  prisma: require("../../../tests/mocks/databaseMock").prismaMock,
}));

describe("HistoricoService", () => {
  beforeAll(() => {
    // Silencia os logs para uma saída de teste limpa.
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getHistoricoPaginado", () => {
    it("deve buscar o histórico e a contagem total e retornar os dados paginados", async () => {
      // Arrange
      const idUsuario = "user-123";
      const options = { page: 2, pageSize: 5 };
      const mockHistorico = [{ idHistorico: "hist-1" }];
      const totalItems = 12;
      
      // Mock para a transação com ARRAY de promises.
      prismaMock.$transaction.mockResolvedValue([mockHistorico, totalItems]);

      // Act
      const result = await getHistoricoPaginado(idUsuario, options);

      // Assert
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(result.data).toEqual(mockHistorico);
      expect(result.meta).toEqual({
        totalItems: 12,
        currentPage: 2,
        pageSize: 5,
        totalPages: 3, // Math.ceil(12 / 5)
      });
    });

    it("deve calcular totalPages como 0 se não houver itens", async () => {
      prismaMock.$transaction.mockResolvedValue([[], 0]);

      const result = await getHistoricoPaginado("user-123", { page: 1, pageSize: 10 });

      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe("salvarHistorico", () => {
    // AJUSTE: O mock da transação com CALLBACK é configurado apenas para este grupo de testes.
    beforeEach(() => {
        prismaMock.$transaction.mockImplementation(
            ((callback: (tx: Prisma.TransactionClient) => Promise<any>) => callback(prismaMock)) as any
        );
    });

    it("deve criar um registro de histórico e seus resultados em uma transação", async () => {
      // Arrange
      const idUsuario = "user-123";
      const recomendacoes = [
        {
          idDispositivo: "device-1",
          matchScore: 0.9,
          justificativas: ["Câmera excelente"],
        },
      ];
      const mockedHistorico = { idHistorico: "new-hist-id" };

      prismaMock.historicoPesquisa.create.mockResolvedValue(mockedHistorico as any);
      
      // Act
      const result = await salvarHistorico(idUsuario, [], recomendacoes);

      // Assert
      expect(prismaMock.historicoPesquisa.create).toHaveBeenCalled();
      expect(prismaMock.resultadoPesquisa.createMany).toHaveBeenCalledWith({
        data: [
          {
            idHistorico: mockedHistorico.idHistorico,
            idDispositivo: "device-1",
            matchScore: 0.9,
            justificativas: ["Câmera excelente"],
          },
        ],
      });
      expect(result).toBe(mockedHistorico.idHistorico);
    });

    it("deve retornar null se a transação falhar", async () => {
      const error = new Error("Falha no banco de dados");
      // Sobrescrevemos o mock para este teste específico.
      prismaMock.$transaction.mockRejectedValue(error);

      const result = await salvarHistorico("user-123", [], []);

      expect(result).toBeNull();
    });
  });
});
