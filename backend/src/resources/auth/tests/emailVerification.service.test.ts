import {
  issueEmailVerificationToken,
  verifyEmailToken,
} from "../emailVerification.service";
import { prismaMock } from "../../../tests/mocks/databaseMock";
import { mockUsers } from "../../../tests/mocks/usuarios";
import { sendEmail } from "../../email/email.service";
import * as crypto from "crypto";
import { Prisma } from "@prisma/client";

// Mock das dependências externas do serviço
jest.mock("crypto");
jest.mock("../../email/email.service");

// Mock do singleton do Prisma com o caminho correto
jest.mock("../../../database/prismaSingleton", () => ({
  __esModule: true,
  prisma: require("../../../tests/mocks/databaseMock").prismaMock,
}));

// Tipando os mocks
const mockedSendEmail = sendEmail as jest.Mock;
const mockedCryptoRandomBytes = crypto.randomBytes as jest.Mock;

describe("EmailVerificationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Este serviço usa transações com arrays de promises, então mockamos a resolução.
    prismaMock.$transaction.mockResolvedValue([]);
  });

  describe("issueEmailVerificationToken", () => {
    const mockToken =
      "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
    const user = mockUsers[0];

    beforeEach(() => {
      // Garante que a geração de token seja previsível para os testes
      mockedCryptoRandomBytes.mockReturnValue(Buffer.from(mockToken, "hex"));
    });

    it("deve deletar tokens antigos, criar um novo, enviar o e-mail e retornar sucesso", async () => {
      mockedSendEmail.mockResolvedValue(true);
      const params = {
        idUsuario: user.idUsuario,
        email: user.email,
        nome: user.nome,
      };

      const result = await issueEmailVerificationToken(params);

      // Valida a transação de banco de dados
      expect(prismaMock.emailVerificationToken.deleteMany).toHaveBeenCalledWith(
        {
          where: { userId: user.idUsuario, tipo: "0" },
        }
      );
      expect(prismaMock.emailVerificationToken.create).toHaveBeenCalledWith({
        data: {
          userId: user.idUsuario,
          token: mockToken,
          expiresAt: expect.any(Date),
          tipo: "0",
        },
      });

      // Valida o envio do e-mail
      expect(mockedSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          subject: "Confirme seu e-mail - Moto Match",
          html: expect.stringContaining(mockToken), // Garante que a URL de verificação está no corpo
        })
      );

      // Valida o objeto de retorno
      expect(result).toEqual({
        token: mockToken,
        verificationUrl: expect.stringContaining(mockToken),
        expiresAt: expect.any(Date),
        emailSent: true,
      });
    });

    it("deve executar a lógica de banco mas retornar emailSent: false se o envio falhar", async () => {
      mockedSendEmail.mockResolvedValue(false);
      const params = {
        idUsuario: user.idUsuario,
        email: user.email,
        nome: user.nome,
      };

      const result = await issueEmailVerificationToken(params);

      expect(prismaMock.emailVerificationToken.create).toHaveBeenCalled(); // A criação do token ainda ocorre
      expect(result.emailSent).toBe(false);
    });
  });

  describe("verifyEmailToken", () => {
    const validToken = "valid-token-123";
    const user = mockUsers[1]; // Um usuário não verificado

    it("Cenário de Sucesso: deve verificar o usuário, atualizar o banco e limpar os tokens", async () => {
      const mockTokenRecord = {
        id: "id1",
        token: validToken,
        userId: user.idUsuario,
        expiresAt: new Date(Date.now() + 3.6e6),
        createdAt: new Date(),
        tipo: "0",
      };
      prismaMock.emailVerificationToken.findUnique.mockResolvedValue(
        mockTokenRecord
      );
      prismaMock.usuario.findUnique.mockResolvedValue(user);

      const result = await verifyEmailToken(validToken);

      expect(prismaMock.usuario.update).toHaveBeenCalledWith({
        where: { idUsuario: user.idUsuario },
        data: { emailVerificado: true, verificadoEm: expect.any(Date) },
      });
      expect(prismaMock.emailVerificationToken.deleteMany).toHaveBeenCalledWith(
        {
          where: { userId: user.idUsuario, tipo: "0" },
        }
      );
      expect(result.status).toBe("success");
      expect(result.userId).toBe(user.idUsuario);
    });

    it("Cenário de Falha: deve retornar 'invalid' se o token não for encontrado", async () => {
      prismaMock.emailVerificationToken.findUnique.mockResolvedValue(null);
      const result = await verifyEmailToken("token-fantasma");
      expect(result.status).toBe("invalid");
    });

    it("Cenário de Falha: deve retornar 'expired' e deletar o token se ele estiver expirado", async () => {
      const mockExpiredToken = {
        id: "id2",
        token: validToken,
        userId: user.idUsuario,
        expiresAt: new Date(Date.now() - 3.6e6),
        createdAt: new Date(),
        tipo: "0",
      };
      prismaMock.emailVerificationToken.findUnique.mockResolvedValue(
        mockExpiredToken
      );

      const result = await verifyEmailToken(validToken);

      expect(prismaMock.emailVerificationToken.delete).toHaveBeenCalledWith({
        where: { token: validToken },
      });
      expect(result.status).toBe("expired");
    });

    it("Cenário de Falha: deve retornar 'invalid' se o usuário do token não for encontrado", async () => {
      const mockTokenRecord = {
        id: "id3",
        token: validToken,
        userId: "user-fantasma",
        expiresAt: new Date(Date.now() + 3.6e6),
        createdAt: new Date(),
        tipo: "0",
      };
      prismaMock.emailVerificationToken.findUnique.mockResolvedValue(
        mockTokenRecord
      );
      prismaMock.usuario.findUnique.mockResolvedValue(null); // Usuário não encontrado

      const result = await verifyEmailToken(validToken);

      expect(prismaMock.emailVerificationToken.delete).toHaveBeenCalledWith({
        where: { token: validToken },
      });
      expect(result.status).toBe("invalid");
    });

    it("Cenário Alternativo: deve retornar 'already-verified' e limpar os tokens se o usuário já estiver verificado", async () => {
      const verifiedUser = mockUsers[0]; // Um usuário já verificado
      const mockTokenRecord = {
        id: "id4",
        token: validToken,
        userId: verifiedUser.idUsuario,
        expiresAt: new Date(Date.now() + 3.6e6),
        createdAt: new Date(),
        tipo: "0",
      };
      prismaMock.emailVerificationToken.findUnique.mockResolvedValue(
        mockTokenRecord
      );
      prismaMock.usuario.findUnique.mockResolvedValue(verifiedUser);

      const result = await verifyEmailToken(validToken);

      expect(prismaMock.emailVerificationToken.deleteMany).toHaveBeenCalledWith(
        {
          where: { userId: verifiedUser.idUsuario, tipo: "0" },
        }
      );
      expect(result.status).toBe("already-verified");
      expect(result.userId).toBe(verifiedUser.idUsuario);
    });
  });
});
