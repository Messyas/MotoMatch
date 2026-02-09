import { CheckCredentials, upsertUsuarioFromGoogle } from "../auth.service";
import { prismaMock } from "../../../tests/mocks/databaseMock";
import { mockUsers } from "../../../tests/mocks/usuarios";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

// Mock das dependências externas do serviço.
jest.mock("bcryptjs");
jest.mock("crypto");

// Mock do singleton do Prisma com o caminho correto.
jest.mock("../../../database/prismaSingleton", () => ({
  __esModule: true,
  prisma: require("../../../tests/mocks/databaseMock").prismaMock,
}));

// Tipando os mocks.
const mockedBcryptCompare = bcrypt.compare as jest.Mock;
const mockedBcryptHash = bcrypt.hash as jest.Mock;
const mockedCryptoRandomBytes = crypto.randomBytes as jest.Mock;

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // "Ensinamos" o mock a executar a transação, passando a si mesmo como o cliente da transação.
    prismaMock.$transaction.mockImplementation(
      ((callback: (tx: any) => Promise<any>) => callback(prismaMock)) as any
    );
  });

  describe("CheckCredentials", () => {
    it("deve retornar o usuário se as credenciais estiverem corretas", async () => {
      const userFromDb = mockUsers[0];
      prismaMock.usuario.findFirst.mockResolvedValue(userFromDb);
      mockedBcryptCompare.mockResolvedValue(true);
      const result = await CheckCredentials({ username: userFromDb.username, password: "password" });
      expect(result).toEqual(userFromDb);
    });

    it("deve retornar null se a senha estiver incorreta", async () => {
      const userFromDb = mockUsers[0];
      prismaMock.usuario.findFirst.mockResolvedValue(userFromDb);
      mockedBcryptCompare.mockResolvedValue(false);
      const result = await CheckCredentials({ username: userFromDb.username, password: "wrong-password" });
      expect(result).toBeNull();
    });

    it("deve retornar null se o usuário não for encontrado", async () => {
      prismaMock.usuario.findFirst.mockResolvedValue(null);
      const result = await CheckCredentials({ username: "fantasma", password: "password" });
      expect(result).toBeNull();
    });
  });

  describe("upsertUsuarioFromGoogle", () => {
    const googleProfile = {
      id: "google-user-123",
      email: "novo.usuario@google.com",
      name: "Novo Usuário Google",
      verified_email: true,
    };
    const googleTokens = { accessToken: "abc", refreshToken: "def" };

    it("deve criar um novo usuário se ele não existir", async () => {
      prismaMock.contaOAuth.findUnique.mockResolvedValue(null);
      prismaMock.usuario.findUnique.mockResolvedValue(null);
      const newUserFromGoogle = { idUsuario: "novo-id-google", email: googleProfile.email, nome: googleProfile.name };
      prismaMock.usuario.create.mockResolvedValue(newUserFromGoogle as any);
      mockedBcryptHash.mockResolvedValue("hashed-random-password");
      mockedCryptoRandomBytes.mockReturnValue(Buffer.from("random-bytes"));

      const result = await upsertUsuarioFromGoogle({ profile: googleProfile, tokens: googleTokens });

      expect(result).toEqual(newUserFromGoogle);
      expect(prismaMock.usuario.create).toHaveBeenCalled();
      expect(prismaMock.contaOAuth.create).toHaveBeenCalled();
    });

    it("deve vincular a conta Google a um usuário local não verificado e atualizá-lo", async () => {
      const unverifiedUser = { ...mockUsers[1], emailVerificado: false };
      const updatedUser = { ...unverifiedUser, emailVerificado: true };

      prismaMock.contaOAuth.findUnique.mockResolvedValue(null);
      prismaMock.usuario.findUnique.mockResolvedValueOnce(unverifiedUser);
      prismaMock.usuario.update.mockResolvedValue(updatedUser as any);
      
      const result = await upsertUsuarioFromGoogle({ profile: { ...googleProfile, email: unverifiedUser.email }, tokens: googleTokens });

      expect(result).toEqual(updatedUser);
      expect(prismaMock.usuario.update).toHaveBeenCalledWith(expect.objectContaining({ data: { emailVerificado: true, verificadoEm: expect.any(Date) } }));
      expect(prismaMock.contaOAuth.create).toHaveBeenCalled();
    });

    it("deve vincular a conta Google a um usuário local JÁ VERIFICADO sem atualizá-lo", async () => {
      const verifiedUser = { ...mockUsers[0], emailVerificado: true };

      prismaMock.contaOAuth.findUnique.mockResolvedValue(null);
      prismaMock.usuario.findUnique.mockResolvedValueOnce(verifiedUser);
      
      const result = await upsertUsuarioFromGoogle({ profile: { ...googleProfile, email: verifiedUser.email }, tokens: googleTokens });

      expect(result).toEqual(verifiedUser);
      expect(prismaMock.usuario.update).not.toHaveBeenCalled(); // Garante que não houve update desnecessário
      expect(prismaMock.contaOAuth.create).toHaveBeenCalled();
    });
    
    it("deve atualizar um usuário existente não verificado via conta Google", async () => {
      const userWithAccount = { ...mockUsers[0], emailVerificado: false };
      const updatedUser = { ...userWithAccount, emailVerificado: true };
      const existingOAuthAccount = { idConta: "conta-1", usuario: userWithAccount };

      prismaMock.contaOAuth.findUnique.mockResolvedValue(existingOAuthAccount as any);
      prismaMock.usuario.update.mockResolvedValue(updatedUser as any);
      
      const result = await upsertUsuarioFromGoogle({ profile: googleProfile, tokens: googleTokens });

      expect(result).toEqual(updatedUser);
      expect(prismaMock.usuario.update).toHaveBeenCalled();
      expect(prismaMock.contaOAuth.update).toHaveBeenCalled();
    });

    it("deve apenas atualizar os tokens se a conta Google e o usuário JÁ estiverem verificados", async () => {
      const verifiedUser = { ...mockUsers[0], emailVerificado: true };
      const existingOAuthAccount = { idConta: "conta-1", usuario: verifiedUser };

      prismaMock.contaOAuth.findUnique.mockResolvedValue(existingOAuthAccount as any);
      
      const result = await upsertUsuarioFromGoogle({ profile: googleProfile, tokens: googleTokens });

      expect(result).toEqual(verifiedUser);
      expect(prismaMock.usuario.update).not.toHaveBeenCalled(); // Não deve atualizar o usuário
      expect(prismaMock.contaOAuth.update).toHaveBeenCalled(); // Deve apenas atualizar a conta OAuth
    });

    it("deve lançar um erro se o perfil do Google não tiver e-mail", async () => {
      const profileWithoutEmail = { ...googleProfile, email: undefined };
      
      await expect(upsertUsuarioFromGoogle({ profile: profileWithoutEmail, tokens: googleTokens }))
        .rejects
        .toThrow("A conta Google não retornou um e-mail válido.");
    });

    it("deve lançar um erro se o perfil do Google não tiver ID", async () => {
      const profileWithoutId = { ...googleProfile, id: undefined };
      
      await expect(upsertUsuarioFromGoogle({ profile: profileWithoutId, tokens: googleTokens }))
        .rejects
        .toThrow("A conta Google não retornou um identificador válido.");
    });
  });
});