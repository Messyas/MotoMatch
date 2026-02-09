import { Request, Response } from "express";
import { Session, SessionData } from "express-session";
import dispositivoController from "../dispositivo.controller";
import * as service from "../dispositivo.service";
import * as comentarioService from "../../comentario/comentario.service";
import { mockDispositivos, newDispositivoMock } from "../../../tests/mocks/dispositivos";

beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

jest.mock("../dispositivo.service");
jest.mock("../../comentario/comentario.service");

describe("Dispositivo Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      session: {
        uid: "user123",
        userTypeId: "1",
      } as unknown as Session & SessionData,
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe("index", () => {
    it("deve retornar lista de dispositivos", async () => {
      (service.getAllDispositivos as jest.Mock).mockResolvedValue(mockDispositivos);

      await dispositivoController.index(req as Request, res as Response);

      expect(service.getAllDispositivos).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDispositivos);
    });
  });

  describe("create", () => {
    it("deve criar novo dispositivo", async () => {
      (service.createDispositivo as jest.Mock).mockResolvedValue(mockDispositivos[0]);
      req.body = newDispositivoMock;

      await dispositivoController.create(req as Request, res as Response);

      expect(service.createDispositivo).toHaveBeenCalledWith(newDispositivoMock);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockDispositivos[0]);
    });

    it("deve tratar erro ao criar dispositivo", async () => {
      (service.createDispositivo as jest.Mock).mockRejectedValue(new Error("erro"));
      req.body = newDispositivoMock;

      await dispositivoController.create(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("read", () => {
    it("deve retornar dispositivo encontrado", async () => {
      req.params = { id: "a1b2c3" };
      (service.getDispositivoById as jest.Mock).mockResolvedValue(mockDispositivos[0]);

      await dispositivoController.read(req as Request, res as Response);

      expect(service.getDispositivoById).toHaveBeenCalledWith("a1b2c3");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDispositivos[0]);
    });

    it("deve retornar 404 se dispositivo não encontrado", async () => {
      req.params = { id: "x" };
      (service.getDispositivoById as jest.Mock).mockResolvedValue(null);

      await dispositivoController.read(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("update", () => {
    it("deve atualizar dispositivo", async () => {
      req.params = { id: "a1b2c3" };
      req.body = { fabricante: "Samsung" };
      (service.updateDispositivo as jest.Mock).mockResolvedValue(mockDispositivos[0]);

      await dispositivoController.update(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDispositivos[0]);
    });

    it("deve retornar 404 se não encontrado", async () => {
      (service.updateDispositivo as jest.Mock).mockResolvedValue(null);

      await dispositivoController.update(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("remove", () => {
    it("deve remover dispositivo com sucesso", async () => {
      req.params = { id: "a1b2c3" };
      (service.deleteDispositivo as jest.Mock).mockResolvedValue(true);

      await dispositivoController.remove(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it("deve retornar 404 se não encontrado", async () => {
      (service.deleteDispositivo as jest.Mock).mockResolvedValue(false);

      await dispositivoController.remove(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // === AQUI FOI A CORREÇÃO ===
  describe("pesquisa", () => {
    it("deve orquestrar pesquisa conversacional e retornar 200", async () => {
      // Setup do input esperado pelo novo controller
      req.body = {
        historicoConversa: [{ autor: "usuario", mensagem: "Busco celular barato" }],
        filtrosSelecionados: { precoMax: 1000 }
      };

      const mockResposta = {
        acao: "RESULTADO",
        dados: mockDispositivos
      };

      // Mock da função nova
      (service.orquestrarPesquisaConversacional as jest.Mock).mockResolvedValue(mockResposta);

      await dispositivoController.pesquisa(req as Request, res as Response);

      // Valida se chamou o orquestrador com o ID da sessão (user123)
      expect(service.orquestrarPesquisaConversacional).toHaveBeenCalledWith(
        req.body.historicoConversa,
        req.body.filtrosSelecionados,
        "user123"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResposta);
    });

    it("deve retornar 500 com fallback em caso de erro no serviço", async () => {
      req.body = { historicoConversa: [], filtrosSelecionados: {} };
      
      (service.orquestrarPesquisaConversacional as jest.Mock).mockRejectedValue(new Error("Erro ML"));

      await dispositivoController.pesquisa(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      // Verifica se o JSON de resposta contem a ação de fallback
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        acao: "PERGUNTAR"
      }));
    });
  });
  // ============================

  describe("comentarios", () => {
    it("deve retornar comentarios e meta quando dispositivo existe", async () => {
      req.params = { id: "a1b2c3" };
      const payload = {
        averageRating: 4.5,
        totalReviews: 2,
        comentarios: [
          {
            idComentario: "c1",
            autor: "Ana",
            nota: 5,
            conteudo: "Excelente",
            publicadoEm: "2024-01-01T00:00:00.000Z",
            resumo: "positivo",
          },
        ],
      };
      (comentarioService.obterComentariosDoDispositivo as jest.Mock).mockResolvedValue(payload);

      await dispositivoController.comentarios(req as Request, res as Response);

      expect(comentarioService.obterComentariosDoDispositivo).toHaveBeenCalledWith("a1b2c3");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(payload);
    });

    it("deve retornar 404 quando dispositivo nao encontrado", async () => {
      req.params = { id: "desconhecido" };
      (comentarioService.obterComentariosDoDispositivo as jest.Mock).mockResolvedValue(null);

      await dispositivoController.comentarios(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve retornar 500 em caso de erro", async () => {
      req.params = { id: "erro" };
      (comentarioService.obterComentariosDoDispositivo as jest.Mock).mockRejectedValue(
        new Error("falha")
      );

      await dispositivoController.comentarios(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("aspectos", () => {
    it("deve retornar scores agregados quando dispositivo existe", async () => {
      req.params = { id: "a1b2c3" };
      const payload = {
        idDispositivo: "a1b2c3",
        aspectos: [
          { aspecto: "camera", mediaScore: 4, totalOpinions: 3 },
          { aspecto: "bateria", mediaScore: 5, totalOpinions: 2 },
        ],
      };
      (comentarioService.obterAspectoScoresDoDispositivo as jest.Mock).mockResolvedValue(payload);

      await dispositivoController.aspectos(req as Request, res as Response);

      expect(comentarioService.obterAspectoScoresDoDispositivo).toHaveBeenCalledWith("a1b2c3");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(payload);
    });

    it("deve retornar 404 quando dispositivo nao encontrado", async () => {
      req.params = { id: "desconhecido" };
      (comentarioService.obterAspectoScoresDoDispositivo as jest.Mock).mockResolvedValue(null);

      await dispositivoController.aspectos(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve retornar 500 em caso de erro", async () => {
      req.params = { id: "erro" };
      (comentarioService.obterAspectoScoresDoDispositivo as jest.Mock).mockRejectedValue(
        new Error("falha")
      );

      await dispositivoController.aspectos(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe("resumo", () => {
    it("deve retornar resumo quando dispositivo existe", async () => {
      req.params = { id: "a1b2c3" };
      const updatedAt = new Date();
      const payload = {
        idDispositivo: "a1b2c3",
        resumo: "Resumo agregado do dispositivo.",
        totalAnalisesConsideradas: 3,
        ultimaAtualizacao: updatedAt,
      };
      (comentarioService.obterResumoComentariosDoDispositivo as jest.Mock).mockResolvedValue(payload);

      await dispositivoController.resumo(req as Request, res as Response);

      expect(comentarioService.obterResumoComentariosDoDispositivo).toHaveBeenCalledWith("a1b2c3");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        ...payload,
        ultimaAtualizacao: updatedAt.toISOString(),
      });
    });

    it("deve retornar 404 quando dispositivo nao encontrado", async () => {
      req.params = { id: "desconhecido" };
      (comentarioService.obterResumoComentariosDoDispositivo as jest.Mock).mockResolvedValue(null);

      await dispositivoController.resumo(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("deve retornar 500 em caso de erro", async () => {
      req.params = { id: "erro" };
      (comentarioService.obterResumoComentariosDoDispositivo as jest.Mock).mockRejectedValue(
        new Error("falha")
      );

      await dispositivoController.resumo(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});