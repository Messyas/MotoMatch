import { prisma } from "../../../database/prismaSingleton";
import { salvarHistorico } from "../../historico/historico.service";
import type { PesquisaDispositivoDTO } from "../dispositivo.types";

/**
 * --- 1. MOCK FACTORY DO AXIOS ---
 * Definimos o comportamento antes de qualquer import.
 */
const mockAxiosInstance = {
  post: jest.fn(),
  get: jest.fn(),
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
  defaults: { headers: { common: {} } },
};

// Se o código usar axios.create(), retorna a nossa instância controlada
// @ts-ignore
mockAxiosInstance.create = jest.fn(() => mockAxiosInstance);

jest.mock("axios", () => ({
  __esModule: true,
  default: mockAxiosInstance,
  ...mockAxiosInstance,
}));

/** --- FIM MOCK FACTORY --- */

import axios from "axios";
import * as dispositivoService from "../dispositivo.service";
import {
  MatchingFacade,
  getMatchingFacade,
  setMatchingFacade,
} from "../services/matching.facade";
import { HttpRecommendationGateway } from "../services/recommendation.gateway";

jest.setTimeout(30000);

// Mock do Histórico
jest.mock("../../historico/historico.service", () => ({
  salvarHistorico: jest.fn().mockResolvedValue("hist-id"),
}));
const salvarHistoricoMock = salvarHistorico as jest.MockedFunction<typeof salvarHistorico>;

// Recupera o mock tipado
const mockedAxios = axios as unknown as jest.Mocked<typeof axios>;

describe("recommendation microservice integration", () => {
  const originalFacade = getMatchingFacade();

  beforeAll(() => {
    // Injeta o Gateway usando o axios mockado
    const gateway = new HttpRecommendationGateway({
      url: "http://mock-service/ml/score",
      timeoutMs: 5000,
    });
    setMatchingFacade(new MatchingFacade(gateway));
  });

  afterAll(() => {
    setMatchingFacade(originalFacade);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("delegates scoring to the service and handles response correctly", async () => {
    // --- 1. DADOS DE BANCO (PRISMA) ---
    const mockDevices = [
      {
        idDispositivo: "dev-premium",
        fabricante: "QualCel",
        modelo: "Premium 8",
        photos: [],
        preco: 1600,
        caracteristicas: [
          { caracteristica: { tipo: "ram", descricao: "8" } },
          { caracteristica: { tipo: "battery", descricao: "5000" } },
        ],
      },
    ];

    const dispositivosSpy = jest
      .spyOn(prisma.dispositivo, "findMany")
      .mockResolvedValue(mockDevices as any);

    const aspectSpy = jest
      .spyOn(prisma.dispositivoAspectoScore, "findMany")
      .mockResolvedValue([]);

    // --- 2. CONFIGURAÇÃO CORRETA DO PAYLOAD ---
    // O Gateway espera: response.data.scores = Array
    mockedAxios.post.mockResolvedValue({
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
      data: {
        scores: [
          {
            id: "dev-premium", // Precisa bater com o ID do prisma
            matchScore: 0.99,
            matchExplanation: "Alta compatibilidade (Mock)",
            perfilMatchPercent: 0.95,
            justificativas: ["Bom processador"],
          },
        ],
      },
    });

    const criterios: PesquisaDispositivoDTO["caracteristicas"] = [
      { tipo: "ram", descricao: "8" },
    ];

    // --- 3. EXECUÇÃO ---
    const resultado = await dispositivoService.findMatchingDispositivos(
      criterios,
      "user-test",
      { consoleInput: "celular", seletores: {} }
    );

    // --- 4. VALIDAÇÃO ---
    expect(resultado).toBeDefined();
    expect(resultado.length).toBeGreaterThan(0);
    
    // Verifica se os dados do mock foram mesclados
    expect(resultado[0].idDispositivo).toBe("dev-premium");
    expect(resultado[0].matchScore).toBe(0.99); // Veio do mock
    expect(resultado[0].matchExplanation).toBe("Alta compatibilidade (Mock)");

    // Verifica chamada do Axios
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    
    // Opcional: Verificar se o payload enviado estava correto
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("/ml/score"),
      expect.objectContaining({
        criterios: expect.any(Array),
        dispositivos: expect.any(Array),
      }),
      expect.any(Object)
    );

    dispositivosSpy.mockRestore();
    aspectSpy.mockRestore();
  });
});