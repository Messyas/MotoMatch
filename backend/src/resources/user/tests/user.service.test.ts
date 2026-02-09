import {
  createUsuario,
  getUsuarios,
  getUsuario,
  updateUsuario,
  deleteUsuario,
  changePasswordUsuario,
  getUsuariosMetrics,
} from "../user.service";
import { prismaMock } from "../../../tests/mocks/databaseMock";
import { mockUsers, newUserMock } from "../../../tests/mocks/usuarios";
import * as bcrypt from "bcryptjs";
import { getFavoritosRanking } from "../../favoritos/favorito.service";

// Mock das dependências externas do serviço
jest.mock("bcryptjs");
jest.mock("../../favoritos/favorito.service");

// Mock do singleton do Prisma para garantir que o serviço use nossa instância mockada
jest.mock("../../../database/prismaSingleton", () => ({
  __esModule: true,
  prisma: require("../../../tests/mocks/databaseMock").prismaMock,
}));

// Tipando os mocks para ter autocomplete
const mockedBcryptHash = bcrypt.hash as jest.Mock;
const mockedBcryptCompare = bcrypt.compare as jest.Mock;
const mockedBcryptGenSalt = bcrypt.genSalt as jest.Mock;
const mockedGetFavoritosRanking = getFavoritosRanking as jest.Mock;

describe("UserService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Define um comportamento padrão para a geração de salt para simplificar os testes
    mockedBcryptGenSalt.mockResolvedValue("mock-salt");
  });

  describe("getUsuarios", () => {
    it("deve retornar uma lista de todos os usuários", async () => {
      prismaMock.usuario.findMany.mockResolvedValue(mockUsers);
      const result = await getUsuarios();
      expect(result).toEqual(mockUsers);
      expect(prismaMock.usuario.findMany).toHaveBeenCalled();
    });
  });

  describe("createUsuario", () => {
    it("deve hashear a senha e criar um novo usuário", async () => {
      const hashedPassword = "hashed_password";
      mockedBcryptHash.mockResolvedValue(hashedPassword);
      const createdUser = { ...mockUsers[0], idUsuario: "novo-id" };
      prismaMock.usuario.create.mockResolvedValue(createdUser);

      const result = await createUsuario(newUserMock);

      expect(mockedBcryptGenSalt).toHaveBeenCalled();
      expect(mockedBcryptHash).toHaveBeenCalledWith(
        newUserMock.password,
        "mock-salt"
      );
      expect(prismaMock.usuario.create).toHaveBeenCalledWith({
        data: {
          ...newUserMock,
          password: hashedPassword,
          nascimento: new Date(newUserMock.nascimento),
        },
      });
      expect(result).toEqual(createdUser);
    });
  });

  describe("getUsuario", () => {
    it("deve retornar um usuário pelo ID", async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(mockUsers[0]);
      const result = await getUsuario(mockUsers[0].idUsuario);
      expect(result).toEqual(mockUsers[0]);
    });

    it("deve retornar null se o usuário não for encontrado", async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);
      const result = await getUsuario("id-fantasma");
      expect(result).toBeNull();
    });
  });

  describe("updateUsuario", () => {
    it("deve atualizar os dados de um usuário, garantindo que a senha não seja alterada", async () => {
      const updateData: any = {
        nome: "Nome Atualizado",
        password: "nova-senha-nao-deve-ser-usada",
      };
      const updatedUser = { ...mockUsers[0], nome: "Nome Atualizado" };
      prismaMock.usuario.update.mockResolvedValue(updatedUser);

      const result = await updateUsuario(mockUsers[0].idUsuario, updateData);

      expect(prismaMock.usuario.update).toHaveBeenCalledWith({
        where: { idUsuario: mockUsers[0].idUsuario },
        data: { nome: "Nome Atualizado" }, // Verifica que o campo 'password' foi removido
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe("deleteUsuario", () => {
    it("deve deletar um usuário e retornar true se ele existir", async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(mockUsers[0]);

      const result = await deleteUsuario(mockUsers[0].idUsuario);

      expect(prismaMock.usuario.delete).toHaveBeenCalledWith({
        where: { idUsuario: mockUsers[0].idUsuario },
      });
      expect(result).toBe(true);
    });

    it("deve retornar false se o usuário a ser deletado não existir", async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      const result = await deleteUsuario("id-fantasma");

      expect(prismaMock.usuario.delete).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe("changePasswordUsuario", () => {
    const userId = mockUsers[0].idUsuario;
    const oldPassword = "old-password";
    const newPassword = "new-password";

    it("deve alterar a senha se a senha antiga estiver correta", async () => {
      const hashedPassword = "new-hashed-password";
      prismaMock.usuario.findFirst.mockResolvedValue(mockUsers[0]);
      mockedBcryptCompare.mockResolvedValue(true);
      mockedBcryptHash.mockResolvedValue(hashedPassword);

      const result = await changePasswordUsuario(
        userId,
        oldPassword,
        newPassword
      );

      expect(mockedBcryptCompare).toHaveBeenCalledWith(
        oldPassword,
        mockUsers[0].password
      );
      expect(prismaMock.usuario.update).toHaveBeenCalledWith({
        where: { idUsuario: userId },
        data: { password: hashedPassword },
      });
      expect(result).toBe(true);
    });

    it("deve retornar false se a senha antiga estiver incorreta", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue(mockUsers[0]);
      mockedBcryptCompare.mockResolvedValue(false);

      const result = await changePasswordUsuario(
        userId,
        "wrong-old-password",
        newPassword
      );

      expect(prismaMock.usuario.update).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it("deve retornar false se o usuário não for encontrado", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue(null);
      const result = await changePasswordUsuario(
        "id-fantasma",
        oldPassword,
        newPassword
      );
      expect(result).toBe(false);
    });
  });

  describe("getUsuariosMetrics", () => {
    it("deve calcular e retornar as métricas corretamente", async () => {
      // Arrange: Mock de todos os dados necessários
      prismaMock.$transaction.mockResolvedValue([10, 20, 2, 1]); // totalUsuarios, totalDispositivos, totalAdmins, totalSuporte
      prismaMock.usuario.findMany.mockResolvedValue([
        { createdAt: new Date("2023-01-15") },
        { createdAt: new Date("2023-01-20") },
        { createdAt: new Date("2023-02-10") },
      ] as any);

      prismaMock.favorito.findMany.mockResolvedValue([
        { dispositivo: { preco: 1000 } },
        { dispositivo: { preco: 2000 } },
      ] as any);

      prismaMock.dispositivo.aggregate.mockResolvedValue({
        _avg: { preco: 1500 },
        _min: { preco: 1000 },
        _max: { preco: 3000 },
      } as any);

      prismaMock.dispositivo.findFirst
        .mockResolvedValueOnce({ modelo: "ModeloBarato" } as any)
        .mockResolvedValueOnce({ modelo: "ModeloCaro" } as any);

      mockedGetFavoritosRanking.mockImplementation((_limit, order) =>
        Promise.resolve(
          order === "desc"
            ? [{ dispositivo: "Top1", count: 5 }]
            : [{ dispositivo: "Bottom1", count: 1 }]
        )
      );
      prismaMock.historicoPesquisa.findMany.mockResolvedValue([
        {
          criterios: [],
          consoleInput: "texto livre",
          seletores: {},
          createdAt: new Date(),
        },
        {
          criterios: [],
          consoleInput: null,
          seletores: { ram: "8", battery: "5000" },
          createdAt: new Date(),
        },
        {
          criterios: [],
          consoleInput: "outro texto",
          seletores: { ram: "8" },
          createdAt: new Date(),
        },
      ] as any);
      prismaMock.pesquisaEvento.findMany.mockResolvedValue([] as any);

      // Act
      const result = await getUsuariosMetrics();

      // Assert: Valida a estrutura e os cálculos chave
      expect(result.totals).toEqual({
        usuarios: 10,
        dispositivos: 20,
        admins: 2,
        suporte: 1,
      });
      expect(result.timeline).toEqual([
        { month: "2023-01", total: 2 },
        { month: "2023-02", total: 3 },
      ]);
      expect(result.favorites.top).toEqual([{ dispositivo: "Top1", count: 5 }]);
      expect(result.favorites.bottom).toEqual([
        { dispositivo: "Bottom1", count: 1 },
      ]);
      expect(result.searches).toEqual({
        total: 3,
        withText: 2,
        withoutText: 1,
        textOnly: 1,
        selectorsOnly: 1,
        textAndSelectors: 1,
      });
      expect(result.selectorStats.ram).toEqual([{ value: "8", count: 2 }]);
      expect(result.selectorStats.battery).toEqual([
        { value: "5000", count: 1 },
      ]);
      expect(result.priceRangeStats).toEqual([]);
    });
  });
});
