// Salvar como: src/resources/comentario.resource.test.ts

import { Decimal } from '@prisma/client/runtime/library';

import {
  PrismaClient,
  Prisma,
  ComentarioDispositivo,
  ComentarioAnalise,
  ComentarioAspecto,
  DispositivoResumoComentario,
} from "@prisma/client";
import { v4 as uuidv4 } from 'uuid';

// !!! --- IMPORTANTE --- !!!
// Eu preciso que você me diga o caminho correto para o seu mock.
// Estou assumindo um caminho, mas PODE ESTAR ERRADO.
import { prismaMock } from "../../../tests/mocks/databaseMock"; // <-- É ESTE O CAMINHO?

// Seus imports (mantidos)
import { AnaliseResultado, ComentarioCsvDTO } from "../comentario.types";
import * as ComentarioResource from "../comentario.service";
import { GeminiAnalysisService } from "../../../integrations/gemini.client";

// --- Tipagem e Mocks ---

type TxClient = Prisma.TransactionClient;

// --- Mocks de outras dependências (ainda necessários) ---

// Mock do Gemini (mantido)
jest.mock("../../../integrations/gemini.client");
const MockedGeminiService = GeminiAnalysisService as jest.MockedClass<typeof GeminiAnalysisService>;
const mockSintetizarResumo = jest.fn();

// Mock do UUID (mantido)
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));
const mockUuidV4 = uuidv4 as jest.Mock;

// ---------------------------------------------------------------------------
// --- STUBS: Funções para criar Mocks Type-Safe ---
// (Mantidas, pois são muito úteis)
// ---------------------------------------------------------------------------

function createMockComentario(
  partial: Partial<ComentarioDispositivo> = {}
): ComentarioDispositivo {
  const id = partial.idComentario || uuidv4();
  return {
    idComentario: id,
    idDispositivo: uuidv4(),
    plataforma: "test",
    referenciaExterna: `ext-${id}`,
    autor: "Mock Author",
    nota: 5,
    conteudo: "Mock content",
    publicadoEm: new Date(),
    analisadoEm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

function createMockAnalise(
  partial: Partial<ComentarioAnalise> = {}
): ComentarioAnalise {
  return {
    idAnalise: uuidv4(),
    idComentario: uuidv4(),
    status: "pending",
    resumo: null,
    promptGemini: null,
    respostaGemini: null,
    erro: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

function createMockAspecto(
  partial: Partial<ComentarioAspecto> = {}
): ComentarioAspecto {
  return {
    idAspecto: uuidv4(),
    idAnalise: uuidv4(),
    aspecto: "bateria",
    sentimento: "boa",
    score: 4,
    justificativa: "Dura muito",
    createdAt: new Date(),
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// --- Início dos Testes ---
// ---------------------------------------------------------------------------

describe("ComentarioResource", () => {
  
  // Este beforeEach agora SÓ reseta os mocks DESTE ARQUIVO.
  // O reset do prismaMock (beforeEach(() => mockReset(prismaMock)))
  // deve estar no seu arquivo de mock separado.
  beforeEach(() => {
    mockUuidV4.mockReset();
    mockSintetizarResumo.mockReset();
    
    MockedGeminiService.mockImplementation(() => {
      return {
        sintetizarResumoColetivo: mockSintetizarResumo,
      } as any;
    });

    // Nós ainda presumimos que o upsert não falha
    prismaMock.dispositivoResumoComentario.upsert.mockResolvedValue(
      {} as DispositivoResumoComentario
    );
  });

  // --- Testes das Funções Públicas ---

  describe("registrarComentariosExternos", () => {
    it("deve registrar novos comentários e criar jobs pendentes", async () => {
      const idDispositivo = "dispositivo-123";
      const comentariosCsv: ComentarioCsvDTO[] = [{ dispositivoIdExterno: "G86", externalId: "ext-1", content: "bom", publishedAt: new Date().toISOString() }];
      const mockIdComentario1 = "uuid-comentario-1";
      mockUuidV4.mockReturnValueOnce(mockIdComentario1);

      prismaMock.comentarioDispositivo.findMany.mockResolvedValue([]);
      prismaMock.comentarioDispositivo.createMany.mockResolvedValue({ count: 1 });
      prismaMock.comentarioAnalise.createMany.mockResolvedValue({ count: 1 });

      const resultado = await ComentarioResource.registrarComentariosExternos(idDispositivo, "csv_import", comentariosCsv);

      expect(resultado).toBe(1);
      expect(prismaMock.comentarioAnalise.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [{ idComentario: mockIdComentario1, status: "pending" }],
        })
      );
    });
  });

  // ---

  describe("obterComentariosPendentes", () => {
    it("deve buscar jobs pendentes e formatar a saída (com include)", async () => {
      const mockComentario = createMockComentario({ idComentario: "comentario-123", idDispositivo: "dispositivo-123" });
      const mockJob = createMockAnalise({ idAnalise: "analise-123", idComentario: mockComentario.idComentario });
      const mockJobWithInclude = { ...mockJob, comentario: mockComentario };
      
      (prismaMock.comentarioAnalise.findMany as jest.Mock).mockResolvedValue([
        mockJobWithInclude
      ]);

      const jobs = await ComentarioResource.obterComentariosPendentes(10);

      expect(jobs).toHaveLength(1);
      expect(jobs[0].idAnalise).toBe("analise-123");
    });
  });

  // ---

  describe("concluirAnaliseComentario", () => {
    it("deve rodar a transação, salvar aspectos, e disparar agregações", async () => {
      const idAnalise = "analise-123";
      const idComentario = "comentario-123";
      const idDispositivo = "dispositivo-123";
      const mockResultado: AnaliseResultado = { summary: "Resumo legal", aspects: [] };

      (prismaMock.comentarioAnalise.findMany as jest.Mock).mockResolvedValue([]);
      prismaMock.comentarioAnalise.count.mockResolvedValue(0);
      
      (prismaMock.$transaction as unknown as jest.Mock)
        .mockImplementation(
          async (callback: (tx: TxClient) => Promise<any>) => {
            const mockAnalise = createMockAnalise({ idAnalise, idComentario });
            const mockComentario = createMockComentario({ idComentario, idDispositivo });
            
            (prismaMock.comentarioAnalise.update as jest.Mock).mockResolvedValue({
              ...mockAnalise,
              comentario: mockComentario,
            });
            prismaMock.comentarioAspecto.groupBy.mockResolvedValue([]);
            
            const result = await callback(prismaMock as unknown as TxClient);
            return result;
          }
        );

      await ComentarioResource.concluirAnaliseComentario(idAnalise, mockResultado);

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock.comentarioAnalise.update).toHaveBeenCalled();
      expect(prismaMock.comentarioAspecto.groupBy).toHaveBeenCalled();
      expect(prismaMock.dispositivoResumoComentario.upsert).toHaveBeenCalled();
    });
  });
  
  // ---
  
  describe("obterResumoComentariosDoDispositivo", () => {
    
    const idDispositivo = "dispositivo-123";
    const mockDispositivo = { idDispositivo: idDispositivo, fabricante: "Teste", modelo: "Mock", preco: new Decimal(1999.90), createdAt: new Date(), updatedAt: new Date(), photos: null };
    
    it("deve retornar o resumo do cache se ele existir", async () => {
      const mockResumoDB = {
        idResumo: "resumo-123",
        idDispositivo: idDispositivo,
        resumo: JSON.stringify({ texto: "Resumo em cache", notaGeral: 4.5, totalAvaliacoes: 10, metricas: [] }),
        totalAnalisesConsideradas: 5,
        totalAnalisesDisponiveis: 10,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prismaMock.dispositivo.findUnique.mockResolvedValue(mockDispositivo);
      prismaMock.dispositivoResumoComentario.findUnique.mockResolvedValue(mockResumoDB);
      
      const resultado = await ComentarioResource.obterResumoComentariosDoDispositivo(idDispositivo);

      expect(resultado).not.toBeNull();
      expect(resultado?.resumo).toBe("Resumo em cache");
      expect(resultado?.notaGeral).toBe(4.5);
      expect(mockSintetizarResumo).not.toHaveBeenCalled();
    });
    
    it("deve gerar um novo resumo se não existir cache (testando a lógica de 'atualizarResumoDispositivo')", async () => {
      prismaMock.dispositivo.findUnique.mockResolvedValue(mockDispositivo);
      prismaMock.dispositivoResumoComentario.findUnique.mockResolvedValueOnce(null);

      const mockAnaliseComAspectos = {
        ...createMockAnalise({ resumo: "resumo 1" }),
        aspectos: [createMockAspecto({ aspecto: "Bateria" })]
      };
      (prismaMock.comentarioAnalise.findMany as jest.Mock).mockResolvedValue([mockAnaliseComAspectos]);
      prismaMock.comentarioAnalise.count.mockResolvedValue(1);
      
      const resumoGemini = "Resumo gerado pelo Gemini";
      mockSintetizarResumo.mockResolvedValue(resumoGemini);
      
      prismaMock.dispositivoResumoComentario.upsert.mockResolvedValue({} as DispositivoResumoComentario);

      const mockResumoGerado = {
        idResumo: "resumo-novo-456",
        idDispositivo: idDispositivo,
        resumo: JSON.stringify({ texto: resumoGemini, notaGeral: null, totalAvaliacoes: 1, metricas: [] }),
        totalAnalisesConsideradas: 1,
        totalAnalisesDisponiveis: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      prismaMock.dispositivoResumoComentario.findUnique.mockResolvedValueOnce(mockResumoGerado);

      const resultado = await ComentarioResource.obterResumoComentariosDoDispositivo(idDispositivo);

      expect(resultado).not.toBeNull();
      expect(mockSintetizarResumo).toHaveBeenCalled();
      expect(prismaMock.dispositivoResumoComentario.upsert).toHaveBeenCalled();
      expect(resultado?.resumo).toBe(resumoGemini);
    });

  });

  // ---
  
  describe("preencherFilaDeAnalise", () => {
    it("deve encontrar comentários órfãos e criar jobs para eles", async () => {
      prismaMock.comentarioAnalise.findMany.mockResolvedValue([
        createMockAnalise({ idComentario: "comentario-com-job-1" })
      ]);
      
      // !!! --- CORREÇÃO DO ERRO DE DIGITAÇÃO (TS2339) --- !!!
      // Era 'dispositivoDispositivo', mudei para 'comentarioDispositivo'
      prismaMock.comentarioDispositivo.findMany.mockResolvedValue([
        createMockComentario({ idComentario: "orfao-1" }),
      ]);
      prismaMock.comentarioAnalise.createMany.mockResolvedValue({ count: 1 });
      
      const resultado = await ComentarioResource.preencherFilaDeAnalise();
      
      expect(resultado).toBe(1);
      expect(prismaMock.comentarioAnalise.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [{ idComentario: "orfao-1", status: "pending" }]
        })
      );
    });
  });

});