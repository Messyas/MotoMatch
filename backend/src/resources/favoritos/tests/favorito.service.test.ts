import {
  adicionarFavorito,
  listarFavoritos,
  removerFavorito,
  getFavoritosRanking,
} from "../favorito.service";
import { prismaMock } from "../../../tests/mocks/databaseMock";

// Mock do singleton do Prisma para garantir que o serviço use nossa instância mockada
jest.mock("../../../database/prismaSingleton", () => ({
  __esModule: true,
  prisma: require("../../../tests/mocks/databaseMock").prismaMock,
}));

describe("FavoritoService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("adicionarFavorito", () => {
    it("deve criar um novo favorito com os dados corretos", async () => {
      const ids = {
        idUsuario: "user-123",
        idDispositivo: "device-abc",
        idHistorico: "history-xyz",
      };
      const mockFavoritoCriado = { idFavorito: "fav-1", ...ids, dispositivo: {}, historico: {} };
      
      prismaMock.favorito.create.mockResolvedValue(mockFavoritoCriado as any);

      const result = await adicionarFavorito(ids.idUsuario, ids.idDispositivo, ids.idHistorico);

      expect(prismaMock.favorito.create).toHaveBeenCalledWith({
        data: {
          idUsuario: ids.idUsuario,
          idDispositivo: ids.idDispositivo,
          idHistorico: ids.idHistorico,
        },
        include: expect.any(Object), // Verifica que a cláusula include está presente
      });
      expect(result).toEqual(mockFavoritoCriado);
    });
  });

  describe("listarFavoritos", () => {
    it("deve retornar uma lista de favoritos para um dado usuário", async () => {
      const idUsuario = "user-123";
      const mockListaFavoritos = [{ idFavorito: "fav-1" }, { idFavorito: "fav-2" }];
      prismaMock.favorito.findMany.mockResolvedValue(mockListaFavoritos as any);

      const result = await listarFavoritos(idUsuario);

      expect(prismaMock.favorito.findMany).toHaveBeenCalledWith({
        where: { idUsuario },
        include: expect.any(Object),
        orderBy: { idFavorito: "desc" },
      });
      expect(result).toEqual(mockListaFavoritos);
    });

    it("deve retornar um array vazio se o usuário não tiver favoritos", async () => {
        prismaMock.favorito.findMany.mockResolvedValue([]);
        const result = await listarFavoritos("user-sem-favoritos");
        expect(result).toEqual([]);
    });
  });

  describe("removerFavorito", () => {
    it("deve chamar a deleção com o where clause correto", async () => {
      const ids = { idUsuario: "user-123", idDispositivo: "device-abc" };
      const mockFavoritoDeletado = { idFavorito: "fav-1", ...ids };
      prismaMock.favorito.delete.mockResolvedValue(mockFavoritoDeletado as any);

      await removerFavorito(ids.idUsuario, ids.idDispositivo);

      expect(prismaMock.favorito.delete).toHaveBeenCalledWith({
        where: {
          idUsuario_idDispositivo: {
            idUsuario: ids.idUsuario,
            idDispositivo: ids.idDispositivo,
          },
        },
      });
    });

    it("deve propagar o erro se o Prisma falhar ao deletar", async () => {
        const error = new Error("Registro não encontrado");
        prismaMock.favorito.delete.mockRejectedValue(error);
        
        await expect(removerFavorito("user-123", "device-abc")).rejects.toThrow(error);
    });
  });

  describe("getFavoritosRanking", () => {
    it("deve agrupar, buscar e formatar o ranking de favoritos corretamente", async () => {
      // Arrange
      const mockGroupByResult = [
        { idDispositivo: "device-top", _count: { idFavorito: 10 } },
        { idDispositivo: "device-mid", _count: { idFavorito: 5 } },
      ];
      const mockDispositivosDetails = [
        { idDispositivo: "device-top", fabricante: "Samsung", modelo: "Galaxy S25" },
        { idDispositivo: "device-mid", fabricante: "Apple", modelo: "iPhone 20" },
      ];
      prismaMock.favorito.groupBy.mockResolvedValue(mockGroupByResult as any);
      prismaMock.dispositivo.findMany.mockResolvedValue(mockDispositivosDetails as any);

      // Act
      const result = await getFavoritosRanking(5, "desc");

      // Assert
      expect(prismaMock.favorito.groupBy).toHaveBeenCalledWith({
        by: ["idDispositivo"],
        _count: { idFavorito: true },
        orderBy: { _count: { idFavorito: "desc" } },
        take: 5,
      });

      expect(prismaMock.dispositivo.findMany).toHaveBeenCalledWith({
        where: {
          idDispositivo: {
            in: ["device-top", "device-mid"],
          },
        },
        select: expect.any(Object),
      });

      expect(result).toEqual([
        { dispositivoId: "device-top", title: "Samsung Galaxy S25", favorites: 10 },
        { dispositivoId: "device-mid", title: "Apple iPhone 20", favorites: 5 },
      ]);
    });

    it("deve retornar um array vazio se não houver favoritos", async () => {
      // Arrange
      prismaMock.favorito.groupBy.mockResolvedValue([]);

      // Act
      const result = await getFavoritosRanking(5, "desc");

      // Assert
      expect(result).toEqual([]);
      // Garante que a segunda chamada ao banco de dados não foi feita desnecessariamente
      expect(prismaMock.dispositivo.findMany).not.toHaveBeenCalled();
    });
  });
});