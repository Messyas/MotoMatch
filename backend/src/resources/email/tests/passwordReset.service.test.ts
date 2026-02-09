// tests/services/PasswordResetService.test.ts
import {
  issuePasswordResetToken,
  verifyPasswordResetToken,
  resetPassword,
} from "../passwordReset.service";
import { prismaMock } from "../../../tests/mocks/databaseMock";
import { mockUsers } from "../../../tests/mocks/usuarios";
import { sendEmail } from "../../email/email.service";
import * as crypto from "crypto";
import bcrypt from "bcryptjs";

// Mock das dependências externas
jest.mock("crypto");
jest.mock("../../email/email.service");
jest.mock("bcryptjs");

// Mock do Prisma Singleton (deve apontar para o mock que você já tem)
jest.mock("../../../database/prismaSingleton", () => ({
  __esModule: true,
  prisma: require("../../../tests/mocks/databaseMock").prismaMock,
}));

const mockedSendEmail = sendEmail as jest.Mock;
const mockedCryptoRandomBytes = crypto.randomBytes as jest.Mock;
const mockedBcryptHash = bcrypt.hash as unknown as jest.Mock;

describe("PasswordResetService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // O serviço usa prisma.$transaction em issuePasswordResetToken
    prismaMock.$transaction.mockResolvedValue([]);
  });

  describe("issuePasswordResetToken", () => {
    // token hex com 64 caracteres (32 bytes)
    const mockToken =
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const user = mockUsers[0];

    beforeEach(() => {
      // randomBytes(32).toString('hex') -> 64 hex chars, então retornar Buffer com 32 bytes
      mockedCryptoRandomBytes.mockReturnValue(Buffer.from(mockToken, "hex"));
    });

    it("deve deletar tokens antigos, criar novo token, enviar e-mail e retornar sucesso", async () => {
      mockedSendEmail.mockResolvedValue(true);
      const params = {
        idUsuario: user.idUsuario,
        email: user.email,
        nome: user.nome,
      };

      const result = await issuePasswordResetToken(params);

      expect(prismaMock.emailVerificationToken.deleteMany).toHaveBeenCalledWith(
        {
          where: { userId: user.idUsuario, tipo: "1" },
        }
      );
      expect(prismaMock.emailVerificationToken.create).toHaveBeenCalledWith({
        data: {
          userId: user.idUsuario,
          token: mockToken,
          expiresAt: expect.any(Date),
          tipo: "1",
        },
      });
      expect(mockedSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          subject: "Redefinir senha - Moto Match",
          html: expect.stringContaining(mockToken),
        })
      );
      expect(result).toEqual({
        token: mockToken,
        resetUrl: expect.stringContaining(mockToken),
        expiresAt: expect.any(Date),
        emailSent: true,
      });
    });

    it("deve retornar emailSent: false se o envio de e-mail falhar", async () => {
      mockedSendEmail.mockResolvedValue(false);
      const params = {
        idUsuario: user.idUsuario,
        email: user.email,
        nome: user.nome,
      };

      const result = await issuePasswordResetToken(params);

      expect(prismaMock.emailVerificationToken.create).toHaveBeenCalled();
      expect(result.emailSent).toBe(false);
    });
  });

  describe("verifyPasswordResetToken", () => {
    const validToken = "token-valido-123";
    const user = mockUsers[0];

    it("deve retornar válido se o token for encontrado e não expirado", async () => {
      const mockRecord = {
        id: "id1",
        token: validToken,
        userId: user.idUsuario,
        tipo: "1",
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
      };
      prismaMock.emailVerificationToken.findUnique.mockResolvedValue(
        mockRecord
      );

      const result = await verifyPasswordResetToken(validToken);

      expect(result).toEqual({ valid: true, userId: user.idUsuario });
    });

    it("deve retornar invalid se o token não for encontrado", async () => {
      prismaMock.emailVerificationToken.findUnique.mockResolvedValue(null);
      const result = await verifyPasswordResetToken("token-invalido");
      expect(result).toEqual({ valid: false, reason: "invalid" });
    });

    it("deve retornar invalid se o tipo for diferente de '1'", async () => {
      prismaMock.emailVerificationToken.findUnique.mockResolvedValue({
        id: "id2",
        token: validToken,
        userId: user.idUsuario,
        tipo: "0", // tipo errado
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
      });
      const result = await verifyPasswordResetToken(validToken);
      expect(result).toEqual({ valid: false, reason: "invalid" });
    });

    it("deve retornar expired e deletar token se estiver expirado", async () => {
      const expiredRecord = {
        id: "id3",
        token: validToken,
        userId: user.idUsuario,
        tipo: "1",
        expiresAt: new Date(Date.now() - 10000),
        createdAt: new Date(),
      };
      prismaMock.emailVerificationToken.findUnique.mockResolvedValue(
        expiredRecord
      );

      const result = await verifyPasswordResetToken(validToken);

      expect(prismaMock.emailVerificationToken.delete).toHaveBeenCalledWith({
        where: { token: validToken },
      });
      expect(result).toEqual({ valid: false, reason: "expired" });
    });
  });

  describe("resetPassword", () => {
    const token = "reset-token-xyz";
    const user = mockUsers[0];

    it("deve atualizar a senha e deletar o token se o token for válido", async () => {
      // Mock do record usado por verifyPasswordResetToken (é chamado dentro de resetPassword)
      prismaMock.emailVerificationToken.findUnique.mockResolvedValue({
        id: "id4",
        token,
        userId: user.idUsuario,
        tipo: "1",
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
      });

      // Mock do bcrypt.hash
      mockedBcryptHash.mockResolvedValue("hashedPassword123");

      const result = await resetPassword(token, "novaSenhaSegura123");

      expect(mockedBcryptHash).toHaveBeenCalledWith("novaSenhaSegura123", 10);
      expect(prismaMock.usuario.update).toHaveBeenCalledWith({
        where: { idUsuario: user.idUsuario },
        data: { password: "hashedPassword123" },
      });
      expect(prismaMock.emailVerificationToken.delete).toHaveBeenCalledWith({
        where: { token },
      });
      expect(result).toEqual({
        valid: true,
        message: "Senha redefinida com sucesso.",
      });
    });

    it("deve retornar erro se o token for inválido", async () => {
      // verifyPasswordResetToken irá retornar { valid:false, reason: 'invalid' } quando findUnique => null
      prismaMock.emailVerificationToken.findUnique.mockResolvedValue(null);
      const result = await resetPassword("token-fantasma", "123");
      expect(result).toEqual({ valid: false, reason: "invalid" });
    });

    it("deve retornar erro se o token estiver expirado", async () => {
      prismaMock.emailVerificationToken.findUnique.mockResolvedValue({
        id: "id5",
        token,
        userId: user.idUsuario,
        tipo: "1",
        expiresAt: new Date(Date.now() - 10000),
        createdAt: new Date(),
      });
      const result = await resetPassword(token, "123");
      expect(result).toEqual({ valid: false, reason: "expired" });
    });
  });
});
