import { prismaMock } from "../../../tests/mocks/databaseMock";
import {
  getAllDispositivos,
  createDispositivo,
  getDispositivoById,
  updateDispositivo,
  deleteDispositivo,
  createManyDispositivos,
  findMatchingDispositivos,
  orquestrarPesquisaConversacional,
} from "../dispositivo.service";
import * as dispositivoServiceModule from "../dispositivo.service";
import {
  MatchingFacade,
  getMatchingFacade,
  setMatchingFacade,
} from "../services/matching.facade";
import { RecommendationGateway } from "../services/recommendation.gateway";
import { GeminiService } from "../services/gemini.service";
import {
  mockDispositivos,
  newDispositivoMock,
  DispositivoComCaracteristicas,
} from "../../../tests/mocks/dispositivos";

class StubRecommendationGateway implements RecommendationGateway {
  async scoreDevices(request: any) {
    return request.dispositivos.slice(0, 3).map((device: any, index: number) => {
      const finalScore = 0.9 - index * 0.1;
      return {
        id: device.id,
        finalScore,
        matchScore: Math.round(finalScore * 100),
        perfilMatchPercent: 90 - index * 5,
        criteriosMatchPercent: 80,
        specFit: 0.8,
        opinionSim: 0.85,
        justificativas: ["Stub"],
        matchExplanation: {
          specFit: 0.8,
          opinionSim: 0.85,
          weights: { specs: 0.6, reviews: 0.4 },
          perCriterion: request.criterios.map((criterio: any) => ({
            tipo: criterio.tipo,
            score: 1,
          })),
        },
      };
    });
  }
}

const originalFacade = getMatchingFacade();
let currentFacade: MatchingFacade;

describe("Dispositivo Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
    currentFacade = new MatchingFacade(new StubRecommendationGateway());
    setMatchingFacade(currentFacade);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    setMatchingFacade(originalFacade);
  });

  describe("getAllDispositivos", () => {
    it("deve retornar todos os dispositivos", async () => {
      prismaMock.dispositivo.findMany.mockResolvedValue(
        mockDispositivos as DispositivoComCaracteristicas[]
      );

      const result = await getAllDispositivos();

      expect(prismaMock.dispositivo.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockDispositivos);
    });
  });

  describe("createDispositivo", () => {
    it("deve criar novo dispositivo com características", async () => {
      prismaMock.dispositivo.findFirst.mockResolvedValue(null);
      prismaMock.caracteristica.upsert.mockResolvedValue({
        idCaracteristica: "carac1",
        tipo: "ram",
        descricao: "8",
      } as any);
      prismaMock.dispositivo.create.mockResolvedValue(mockDispositivos[0] as any);

      const result = await createDispositivo(newDispositivoMock as any);

      expect(prismaMock.dispositivo.findFirst).toHaveBeenCalled();
      expect(prismaMock.dispositivo.create).toHaveBeenCalled();
      expect(result).toEqual(mockDispositivos[0]);
    });

    it("deve lançar erro se dispositivo já existir", async () => {
      prismaMock.dispositivo.findFirst.mockResolvedValue(mockDispositivos[0] as any);

      await expect(createDispositivo(newDispositivoMock as any)).rejects.toThrow(
        "Dispositivo já existe."
      );
    });
  });

  describe("getDispositivoById", () => {
    it("deve retornar o dispositivo correspondente", async () => {
      prismaMock.dispositivo.findUnique.mockResolvedValue(mockDispositivos[0] as any);

      const result = await getDispositivoById("a1b2c3");

      expect(prismaMock.dispositivo.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { idDispositivo: "a1b2c3" },
        })
      );
      expect(result).toEqual(mockDispositivos[0]);
    });
  });

  describe("updateDispositivo", () => {
    it("deve atualizar um dispositivo", async () => {
      prismaMock.caracteristica.upsert.mockResolvedValue({
        idCaracteristica: "carac1",
        tipo: "ram",
        descricao: "8",
      } as any);
      prismaMock.dispositivo.update.mockResolvedValue(mockDispositivos[0] as any);

      const result = await updateDispositivo("a1b2c3", newDispositivoMock as any);

      expect(prismaMock.dispositivo.update).toHaveBeenCalled();
      expect(result).toEqual(mockDispositivos[0]);
    });

    it("deve retornar null se o update lançar exceção", async () => {
      prismaMock.dispositivo.update.mockRejectedValue(new Error("falha"));
      prismaMock.caracteristica.upsert.mockResolvedValue({
        idCaracteristica: "fake-id",
        tipo: "ram",
        descricao: "fake",
      } as any);

      const result = await updateDispositivo("a1b2c3", newDispositivoMock as any);

      expect(result).toBeNull();
    });
  });

  describe("deleteDispositivo", () => {
    it("deve deletar um dispositivo e retornar true", async () => {
      prismaMock.dispositivo.delete.mockResolvedValue(mockDispositivos[0] as any);

      const result = await deleteDispositivo("a1b2c3");

      expect(prismaMock.dispositivo.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("deve retornar false se lançar erro", async () => {
      prismaMock.dispositivo.delete.mockRejectedValue(new Error("erro"));

      const result = await deleteDispositivo("naoexiste");

      expect(result).toBe(false);
    });
  });

  describe("createManyDispositivos", () => {
    it("deve criar múltiplos dispositivos sem duplicar", async () => {
      const createdDispositivos = [
        {
          idDispositivo: "id1",
          fabricante: "Xiaomi",
          modelo: "Redmi 12",
          photos: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          idDispositivo: "id2",
          fabricante: "Asus",
          modelo: "Zenfone 10",
          photos: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const novos = [
        {
          fabricante: "Xiaomi",
          modelo: "Redmi 12",
          photos: null,
          caracteristicas: [
            { tipo: "ram", descricao: "8" },
            { tipo: "battery", descricao: "5000" },
          ],
        },
        {
          fabricante: "Asus",
          modelo: "Zenfone 10",
          photos: null,
          caracteristicas: [
            { tipo: "ram", descricao: "8" },
            { tipo: "battery", descricao: "5000" },
          ],
        },
      ];

      // Mock da busca inicial (sem duplicados)
      prismaMock.dispositivo.findMany.mockResolvedValueOnce([]);
      // Mock do createMany
      prismaMock.dispositivo.createMany.mockResolvedValue({ count: 2 } as any);
      // Mock da busca final (dispositivos criados)
      prismaMock.dispositivo.findMany.mockResolvedValue(createdDispositivos as any);
      // Mock das características
      prismaMock.caracteristica.findMany.mockResolvedValue([
        { idCaracteristica: "carac1", tipo: "ram", descricao: "8" },
        { idCaracteristica: "carac2", tipo: "battery", descricao: "5000" },
      ] as any);

      const result = await createManyDispositivos(novos as any);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty("idDispositivo");
      expect(result[1]).toHaveProperty("idDispositivo");
    });
  });

  describe("findMatchingDispositivos", () => {
    it("deve retornar dispositivos com matchScore calculado", async () => {
      prismaMock.dispositivo.findMany.mockResolvedValue(mockDispositivos as any);
      prismaMock.dispositivoAspectoScore.findMany.mockResolvedValue([
        {
          idDispositivo: "a1b2c3",
          aspecto: "camera",
          mediaScore: 4,
        },
        {
          idDispositivo: "a1b2c3",
          aspecto: "bateria",
          mediaScore: 4,
        },
        {
          idDispositivo: "d4e5f6",
          aspecto: "camera",
          mediaScore: 3,
        },
      ] as any);

      const criterios = [{ tipo: "ram", descricao: "6" }];

      const result = await findMatchingDispositivos(criterios as any);

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(3);
      expect(result[0]).toHaveProperty("matchScore");
      expect(typeof result[0].matchScore).toBe("number");
      expect(result[0]).toHaveProperty("matchExplanation");
      expect(result[0].matchExplanation).toHaveProperty("specFit");
      expect(result[0].matchExplanation).toHaveProperty("opinionSim");
      expect(Array.isArray(result[0].justificativas)).toBe(true);
      expect((result[0].justificativas ?? []).length).toBeGreaterThan(0);
    });

    it("deve retornar lista vazia sem consultar o banco quando critérios estiverem vazios", async () => {
      prismaMock.dispositivo.findMany.mockClear();
      prismaMock.dispositivoAspectoScore.findMany.mockClear();

      const result = await findMatchingDispositivos([] as any);

      expect(result).toEqual([]);
      expect(prismaMock.dispositivo.findMany).not.toHaveBeenCalled();
      expect(prismaMock.dispositivoAspectoScore.findMany).not.toHaveBeenCalled();
    });

    it("deve funcionar com apenas texto livre quando Gemini não retornar critérios", async () => {
      prismaMock.dispositivo.findMany.mockResolvedValue(mockDispositivos as any);
      prismaMock.dispositivoAspectoScore.findMany.mockResolvedValue([
        {
          idDispositivo: "a1b2c3",
          aspecto: "camera",
          mediaScore: 4,
        },
        {
          idDispositivo: "d4e5f6",
          aspecto: "bateria",
          mediaScore: 3,
        },
      ] as any);

      const criterios = [{ tipo: "texto_livre", descricao: "quero boa camera" }];

      const result = await findMatchingDispositivos(criterios as any);

      expect(result.length).toBeGreaterThan(0);
      expect(typeof result[0].matchScore).toBe("number");
    });
  });

  describe("orquestrarPesquisaConversacional", () => {
    it("deve continuar com a busca quando o Gemini falhar mas já houver cobertura mínima", async () => {
      jest
        .spyOn(GeminiService, "orquestrar")
        .mockResolvedValue({
          acao: "PERGUNTAR",
          dados: { pergunta: GeminiService.FALLBACK_ERROR_PROMPT },
        } as any);

      const findMatchingSpy = jest
        .spyOn(currentFacade, "findMatchingDispositivos")
        .mockResolvedValue(mockDispositivos as any);

      const historico = [
        {
          id: "msg-user-1",
          role: "user",
          criterios: [
            { tipo: "camera", descricao: "boa" },
            { tipo: "preco_intervalo", descricao: "1000-2000" },
          ],
          consoleInput: "Quero um celular para tirar fotos",
          seletores: { camera: "boa", price_range: "1000-2000" },
        },
      ] as any;

      const resposta = await orquestrarPesquisaConversacional(
        historico,
        { camera: "boa", price_range: "1000-2000" },
        "user-123"
      );

      expect(resposta.acao).toBe("RESULTADO");
      expect(findMatchingSpy).toHaveBeenCalledTimes(1);
    });

    it("deve perguntar sobre orçamento quando cobertura mínima não for atingida", async () => {
      jest
        .spyOn(GeminiService, "orquestrar")
        .mockResolvedValue({
          acao: "PESQUISAR",
          dados: { filtros: [{ tipo: "camera", descricao: "boa" }] },
        } as any);

      const findMatchingSpy = jest
        .spyOn(currentFacade, "findMatchingDispositivos")
        .mockResolvedValue([]);

      const historico = [
        {
          id: "msg-user-1",
          role: "user",
          criterios: [{ tipo: "camera", descricao: "boa" }],
          consoleInput: "Preciso de uma câmera boa",
          seletores: { camera: "boa" },
        },
      ] as any;

      const resposta = await orquestrarPesquisaConversacional(
        historico,
        { camera: "boa" },
        undefined
      );

      expect(resposta.acao).toBe("PERGUNTAR");
      expect((resposta.dados as any).texto).toContain("faixa de preço");
      expect(findMatchingSpy).not.toHaveBeenCalled();
    });
  });
});
