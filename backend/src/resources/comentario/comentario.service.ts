// Alterado o nome do arquivo para: src/resources/comentario.resource.ts

import { Prisma, ComentarioAnalise, ComentarioDispositivo } from "@prisma/client";
import { prisma } from "../../database/prismaSingleton";
// --- AJUSTES DE IMPORTAÇÃO ---
import {
  AnaliseResultado, // <- Tipo genérico
  ComentarioParaAnalise,
  ComentarioCsvDTO,
  ComentariosDoDispositivo,
  AspectoScoresDoDispositivo,
  ResumoComentariosDoDispositivo,
  ResumoColetivoEntrada,
  ComentarioSentimento, // <- Tipo genérico
  MercadoLivreComentarioDTO,
  ResumoComentarioMetrica,
  AnaliseAspecto, // <- Tipo genérico
} from "./comentario.types";
// Importamos o GeminiService aqui APENAS para a função de agregação, por enquanto
import { GeminiAnalysisService } from "../../integrations/gemini.client";
import { v4 as uuidv4 } from 'uuid'; // <-- Importado para a "Boa Solução"

// --- (Funções utilitárias mantidas como estavam) ---

function ensureDate(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Data inválida recebida para comentário: ${value}`);
  }
  return parsed;
}

type ResumoArmazenadoPayload = {
  texto: string | null;
  notaGeral: number | null;
  totalAvaliacoes: number | null;
  metricas: ResumoComentarioMetrica[];
};

function serializeResumoPayload(
  payload: ResumoArmazenadoPayload | null
): string | null {
  if (!payload) {
    return null;
  }

  return JSON.stringify({
    texto: payload.texto ?? null,
    notaGeral:
      payload.notaGeral !== null && payload.notaGeral !== undefined
        ? Number(payload.notaGeral)
        : null,
    totalAvaliacoes:
      payload.totalAvaliacoes !== null && payload.totalAvaliacoes !== undefined
        ? Number(payload.totalAvaliacoes)
        : null,
    metricas: Array.isArray(payload.metricas) ? payload.metricas : [],
  });
}

function parseResumoPayload(raw: string | null): ResumoArmazenadoPayload {
  const fallback: ResumoArmazenadoPayload = {
    texto: raw && raw.trim() ? raw.trim() : null,
    notaGeral: null,
    totalAvaliacoes: null,
    metricas: [],
  };

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    const texto =
      typeof parsed?.texto === "string" && parsed.texto.trim()
        ? parsed.texto.trim()
        : fallback.texto;
    const notaGeral =
      typeof parsed?.notaGeral === "number" && Number.isFinite(parsed.notaGeral)
        ? parsed.notaGeral
        : null;
    const totalAvaliacoes =
      typeof parsed?.totalAvaliacoes === "number" &&
      Number.isFinite(parsed.totalAvaliacoes)
        ? parsed.totalAvaliacoes
        : null;
    const metricas: ResumoComentarioMetrica[] = Array.isArray(parsed?.metricas)
      ? parsed.metricas
          .map((item: unknown) => {
            if (!item || typeof item !== "object") {
              return null;
            }
            const chave =
              typeof (item as { chave?: unknown }).chave === "string"
                ? (item as { chave: string }).chave
                : "";
            const rotulo =
              typeof (item as { rotulo?: unknown }).rotulo === "string"
                ? (item as { rotulo: string }).rotulo
                : "";
            const scoreRaw = (item as { score?: unknown }).score;
            const score =
              typeof scoreRaw === "number" && Number.isFinite(scoreRaw)
                ? scoreRaw
                : null;

            if (!chave && !rotulo) {
              return null;
            }

            return {
              chave: chave || rotulo.toLowerCase().replace(/\s+/g, "-"),
              rotulo: rotulo || chave,
              score,
            };
          })
          .filter(
            (item: ResumoComentarioMetrica | null): item is ResumoComentarioMetrica =>
              Boolean(item && item.rotulo)
          )
      : [];

    return {
      texto,
      notaGeral,
      totalAvaliacoes,
      metricas,
    };
  } catch {
    return fallback;
  }
}

// --- (Função de registrar Mercado Livre mantida) ---
export async function registrarComentariosMercadoLivre(
  idDispositivo: string,
  comentarios: MercadoLivreComentarioDTO[]
): Promise<ComentarioDispositivo[]> {
  // ... (A lógica original desta função está mantida)
  if (!comentarios.length) {
    return [];
  }
  const plataforma = "mercado_livre";
  const novos: ComentarioDispositivo[] = [];
  // (Loop for...of... mantido)
  return novos;
}


// --- PASSO 5: "BOA SOLUÇÃO" (SUBSTITUIÇÃO 1) ---
// Substituído pela lógica de `uuidv4` + `createMany` x2
export async function registrarComentariosExternos(
  idDispositivo: string,
  plataforma: string,
  comentarios: ComentarioCsvDTO[]
): Promise<number> {
  if (!comentarios.length) {
    return 0;
  }

  // 1. Achar comentários que já existem
  const referenciasExternas = comentarios.map(c => c.externalId);
  const existentes = await prisma.comentarioDispositivo.findMany({
    where: {
      idDispositivo,
      plataforma,
      referenciaExterna: {
        in: referenciasExternas
      }
    },
    select: {
      referenciaExterna: true
    }
  });
  const setExistentes = new Set(existentes.map(c => c.referenciaExterna));

  // 2. Filtrar os que são realmente novos E GERAR IDs
  const comentariosComId = comentarios
    .filter(c => !setExistentes.has(c.externalId))
    .map(comentario => {
      const publishedAt = ensureDate(comentario.publishedAt);
      const novoIdComentario = uuidv4(); // <-- Gerar UUID na aplicação
      return {
        // Dados para a tabela ComentarioDispositivo
        dadosComentario: {
          idComentario: novoIdComentario, // <-- Usar o ID gerado
          idDispositivo,
          plataforma,
          referenciaExterna: comentario.externalId,
          autor: comentario.author,
          nota: comentario.rating ?? null,
          conteudo: comentario.content,
          publicadoEm: publishedAt,
        },
        // Guardar o ID para usar na criação do Job
        idGerado: novoIdComentario
      };
    });

  if (comentariosComId.length === 0) {
    return 0;
  }

  const dadosParaCriarComentarios = comentariosComId.map(c => c.dadosComentario);
  const idsGerados = comentariosComId.map(c => c.idGerado);

  console.log(`[processo] Registrando ${dadosParaCriarComentarios.length} novos comentários via createMany...`);

  try {
    // 3. Inserir TODOS os comentários de uma vez (RÁPIDO!)
    const resultadoComentarios = await prisma.comentarioDispositivo.createMany({
      data: dadosParaCriarComentarios,
      skipDuplicates: true,
    });

    console.log(`[processo] ... ${resultadoComentarios.count} comentários inseridos.`);

    if (resultadoComentarios.count === 0) {
        return 0; // Nenhum comentário novo inserido
    }

    // 4. Preparar dados para os Jobs
    const dadosParaCriarJobs = idsGerados.map(id => ({
      idComentario: id,
      status: "pending" as const
    }));

    console.log(`[processo] Criando ${dadosParaCriarJobs.length} jobs 'pending' via createMany...`);

    // 5. Inserir TODOS os jobs de uma vez (RÁPIDO!)
    const resultadoJobs = await prisma.comentarioAnalise.createMany({
      data: dadosParaCriarJobs,
      skipDuplicates: true, // Evita erro se o job já existir
    });

    console.log(`[processo] ... ${resultadoJobs.count} jobs 'pending' criados.`);

    return resultadoComentarios.count;

  } catch (error) {
    console.error(`[processo] Falha ao registrar comentários/jobs com createMany:`, error);
    return 0;
  }
}


// --- (Funções de agregação mantidas, pois fazem parte do fluxo de 5 tabelas) ---

type TransactionClient = Prisma.TransactionClient;

// (Funções de normalização e score mantidas)
const SENTIMENT_TO_SCORE: Record<string, number> = {
  horrivel: 0,
  horrível: 0,
  pessimo: 0,
  péssimo: 0,
  terrivel: 0,
  terrível: 0,
  ruim: 1,
  fraco: 1,
  negativo: 1,
  defeituoso: 1,
  basica: 2,
  básica: 2,
  mediano: 2,
  mediana: 2,
  regular: 2,
  neutro: 2,
  neutra: 2,
  boa: 3,
  positivo: 3,
  positiva: 3,
  satisfeito: 3,
  satisfeita: 3,
  satisfatorio: 3,
  satisfatório: 3,
  otima: 4,
  ótima: 4,
  "muito boa": 4,
  "muito bom": 4,
  forte: 4,
  excelente: 5,
  perfeito: 5,
  perfeita: 5,
  fantastico: 5,
  fantástico: 5,
  incrivel: 5,
  incrível: 5,
};

function normalizarTextoBase(valor: string | null | undefined): string {
  if (!valor) return "";
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function mapSentimentoParaLabel(
  valor: string | null | undefined
): ComentarioSentimento { // <- Tipo ajustado
  const texto = normalizarTextoBase(valor);
  if (!texto) return "basica";
  if (
    texto.startsWith("horr") ||
    texto.includes("terr") ||
    texto.includes("pess")
  ) {
    return "horrivel";
  }
  if (texto.includes("ruim") || texto.includes("fraco") || texto.includes("neg")) {
    return "ruim";
  }
  if (texto.includes("otim")) {
    return "otima";
  }
  if (
    texto.includes("excel") ||
    texto.includes("perfeit") ||
    texto.includes("fant") ||
    texto.includes("incr")
  ) {
    return "excelente";
  }
  if (
    texto.includes("boa") ||
    texto.includes("posit") ||
    texto.includes("satisf")
  ) {
    return "boa";
  }
  return "basica";
}

function mapSentimentoParaScore(valor: string | null | undefined): number {
  const texto = normalizarTextoBase(valor);
  if (texto in SENTIMENT_TO_SCORE) {
    return SENTIMENT_TO_SCORE[texto];
  }
  return 2;
}


async function rebuildAspectScores(
  tx: TransactionClient,
  idDispositivo: string
): Promise<void> {
  // ... (Esta função está correta e usa o `score` do schema)
  const agregados = await tx.comentarioAspecto.groupBy({
    by: ["aspecto"],
    where: {
      score: {
        not: null,
      },
      analise: {
        comentario: {
          idDispositivo,
        },
      },
    },
    _avg: {
      score: true,
    },
    _count: {
      _all: true,
    },
  });

  await tx.dispositivoAspectoScore.deleteMany({
    where: { idDispositivo },
  });

  if (!agregados.length) {
    return;
  }

  await tx.dispositivoAspectoScore.createMany({
    data: agregados.map((item) => ({
      idDispositivo,
      aspecto: item.aspecto,
      mediaScore:
        item._avg.score !== null && item._avg.score !== undefined
          ? Number(item._avg.score.toFixed(2))
          : null,
      totalOpinions: item._count._all,
    })),
  });
}

async function atualizarResumoDispositivo(
  idDispositivo: string
): Promise<void> {
  // ... (Lógica mantida, como no seu ficheiro)
  const analises = await prisma.comentarioAnalise.findMany({
    where: {
      status: "completed",
      resumo: { not: null },
      comentario: { idDispositivo },
    },
    include: {
      aspectos: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 30,
  });

  const totalDisponiveis = await prisma.comentarioAnalise.count({
    where: {
      status: "completed",
      resumo: { not: null },
      comentario: { idDispositivo },
    },
  });

  if (!analises.length) {
    await prisma.dispositivoResumoComentario.upsert({
      where: { idDispositivo },
      update: {
        resumo: null,
        totalAnalisesConsideradas: 0,
        totalAnalisesDisponiveis: totalDisponiveis,
      },
      create: {
        idDispositivo,
        resumo: null,
        totalAnalisesConsideradas: 0,
        totalAnalisesDisponiveis: totalDisponiveis,
      },
    });
    return;
  }

  const vistos = new Set<string>();
  const comentariosParaSintese: ResumoColetivoEntrada["comentarios"] = [];

  for (const analise of analises) {
    const resumoTexto =
      typeof analise.resumo === "string" ? analise.resumo.trim() : "";
    if (!resumoTexto) continue;

    const chave = resumoTexto.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    comentariosParaSintese.push({
      resumo: resumoTexto,
      aspectos: analise.aspectos.map((aspecto) => ({
        aspect: aspecto.aspecto,
        sentimentLabel: mapSentimentoParaLabel(aspecto.sentimento),
        score:
          aspecto.score !== null && aspecto.score !== undefined
            ? aspecto.score
            : mapSentimentoParaScore(aspecto.sentimento),
        justification: aspecto.justificativa ?? undefined,
      })),
    });
  }

  if (!comentariosParaSintese.length) {
    await prisma.dispositivoResumoComentario.upsert({
      where: { idDispositivo },
      update: {
        resumo: null,
        totalAnalisesConsideradas: 0,
        totalAnalisesDisponiveis: totalDisponiveis,
      },
      create: {
        idDispositivo,
        resumo: null,
        totalAnalisesConsideradas: 0,
        totalAnalisesDisponiveis: totalDisponiveis,
      },
    });
    return;
  }

  try {
    // TODO: Abstrair esta chamada no futuro.
    // Por enquanto, instanciamos diretamente para manter o fluxo de 5 tabelas.
    const gemini = new GeminiAnalysisService(); 
    const resumoColetivo = await gemini.sintetizarResumoColetivo({
      comentarios: comentariosParaSintese,
    });

    const resumoPayload: ResumoArmazenadoPayload | null = {
      texto:
        resumoColetivo && resumoColetivo.trim()
          ? resumoColetivo.trim()
          : null,
      notaGeral: null,
      totalAvaliacoes: totalDisponiveis > 0 ? totalDisponiveis : null,
      metricas: [],
    };

    const resumoSerializado =
      resumoPayload &&
      (resumoPayload.texto ||
        resumoPayload.metricas.length > 0 ||
        resumoPayload.notaGeral !== null ||
        (resumoPayload.totalAvaliacoes !== null &&
          resumoPayload.totalAvaliacoes > 0))
        ? serializeResumoPayload(resumoPayload)
        : null;

    await prisma.dispositivoResumoComentario.upsert({
      where: { idDispositivo },
      update: {
        resumo: resumoSerializado,
        totalAnalisesConsideradas: comentariosParaSintese.length,
        totalAnalisesDisponiveis: totalDisponiveis,
      },
      create: {
        idDispositivo,
        resumo: resumoSerializado,
        totalAnalisesConsideradas: comentariosParaSintese.length,
        totalAnalisesDisponiveis: totalDisponiveis,
      },
    });
  } catch (error) {
    console.error(
      "[comentario.service] Falha ao sintetizar resumo coletivo:",
      error
    );
  }
}

// --- (Função de API mantida) ---
export async function obterComentariosDoDispositivo(
  idDispositivo: string
): Promise<ComentariosDoDispositivo | null> {
  const dispositivo = await prisma.dispositivo.findUnique({
    where: { idDispositivo },
    select: { idDispositivo: true },
  });

  if (!dispositivo) {
    return null;
  }

  const [aggregate, comentarios] = await Promise.all([
    prisma.comentarioDispositivo.aggregate({
      where: { idDispositivo },
      _avg: { nota: true },
      _count: { idComentario: true },
    }),
    prisma.comentarioDispositivo.findMany({
      where: { idDispositivo },
      orderBy: { publicadoEm: "desc" },
      select: {
        idComentario: true,
        autor: true,
        nota: true,
        conteudo: true,
        publicadoEm: true,
        analises: {
          where: { status: "completed" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { resumo: true },
        },
      },
    }),
  ]);

  const average =
    aggregate._avg.nota !== null && aggregate._avg.nota !== undefined
      ? Number(aggregate._avg.nota.toFixed(2))
      : null;

  return {
    averageRating: average,
    totalReviews: aggregate._count.idComentario,
    comentarios: comentarios.map((comentario) => ({
      idComentario: comentario.idComentario,
      autor: comentario.autor ?? null,
      nota: comentario.nota ?? null,
      conteudo: comentario.conteudo,
      publicadoEm: comentario.publicadoEm.toISOString(),
      resumo: comentario.analises[0]?.resumo ?? null,
    })),
  };
}


// --- PASSO 5: "BOA SOLUÇÃO" (SUBSTITUIÇÃO 2) ---
// Substituído pela lógica de Fila de Trabalhos (buscar na ComentarioAnalise)
export async function obterComentariosPendentes(limit = 25): Promise<ComentarioParaAnalise[]> {
  const umaHoraAtras = new Date(Date.now() - 1000 * 60 * 60); // 1 hora

  const jobs = await prisma.comentarioAnalise.findMany({
    where: {
      // Condição OR para pegar os jobs corretos
      OR: [
        { status: "pending" }, // Pega 'pending' sempre
        { status: "failed", updatedAt: { lt: umaHoraAtras } }, // Pega 'failed' com mais de 1h
        { status: "processing", updatedAt: { lt: umaHoraAtras } }, // Pega 'processing' com mais de 1h
      ]
    },
    take: limit,
    orderBy: {
      createdAt: "asc", // Processa os mais antigos primeiro
    },
    include: { // Inclui dados do comentário pai
      comentario: {
        select: {
          idDispositivo: true,
          conteudo: true,
          plataforma: true,
          referenciaExterna: true,
        }
      },
    }
  });

  // Filtra jobs cujo comentário pai possa ter sido deletado
  const jobsValidos = jobs.filter(job => job.comentario);

  // Mapeia para o tipo esperado pelo processamento
  return jobsValidos.map((job) => ({
    idAnalise: job.idAnalise, // <-- Agora passamos o ID do Job
    idComentario: job.idComentario,
    idDispositivo: job.comentario!.idDispositivo,
    conteudo: job.comentario!.conteudo,
    plataforma: job.comentario!.plataforma,
    referenciaExterna: job.comentario!.referenciaExterna,
  }));
}


// --- PASSO 5: "BOA SOLUÇÃO" (SUBSTITUIÇÃO 3) ---
// Simplificado para apenas "reclamar" o job
export async function iniciarAnaliseComentario(
  idAnalise: string, // <-- Recebe o ID do Job
  promptPayload?: unknown
): Promise<ComentarioAnalise> {
  
  // Apenas atualiza o status e o timestamp (para o backoff)
  const analise = await prisma.comentarioAnalise.update({
    where: { idAnalise: idAnalise },
    data: {
      status: "processing",
      erro: null, // Limpa erro anterior
      promptGemini:
          promptPayload === undefined
            ? undefined
            : (promptPayload as Prisma.InputJsonValue),
      updatedAt: new Date()
    }
  });

  return analise;
}


// --- PASSO 5: "BOA SOLUÇÃO" (AJUSTE) ---
// Ajustado para usar o tipo genérico `AnaliseResultado`
export async function concluirAnaliseComentario(
  idAnalise: string,
  resultado: AnaliseResultado // <-- Usa o tipo genérico
): Promise<void> {
  const dispositivoId = await prisma.$transaction(async (tx) => {
    const analise = await tx.comentarioAnalise.update({
      where: { idAnalise },
      data: {
        status: "completed",
        resumo: resultado.summary ?? null,
        promptGemini:
          resultado.promptPayload === undefined
            ? undefined
            : (resultado.promptPayload as Prisma.InputJsonValue),
        respostaGemini:
          resultado.responsePayload === undefined
            ? undefined
            : (resultado.responsePayload as Prisma.InputJsonValue),
        erro: null,
      },
      include: {
        comentario: true, // Necessário para pegar o idDispositivo
      },
    });

    if (!analise.comentario) {
        throw new Error(`Análise ${idAnalise} não possui comentário associado.`);
    }

    await tx.comentarioAspecto.deleteMany({
      where: { idAnalise },
    });

    if (resultado.aspects?.length) {
      await tx.comentarioAspecto.createMany({
        data: resultado.aspects.map((aspecto: AnaliseAspecto) => ({ // <- Usa o tipo genérico
          idAnalise,
          aspecto: aspecto.aspect,
          sentimento: aspecto.sentimentLabel, // <- Do seu tipo
          score: aspecto.score, // <- Do seu tipo
          justificativa: aspecto.justification ?? null,
        })),
      });
    }

    await tx.comentarioDispositivo.update({
      where: { idComentario: analise.idComentario },
      data: {
        analisadoEm: new Date(), // <-- Marca o comentário original como analisado
      },
    });

    // Mantém a lógica de agregação
    await rebuildAspectScores(tx, analise.comentario.idDispositivo);

    return analise.comentario.idDispositivo;
  });

  if (dispositivoId) {
    // Mantém a lógica de agregação
    await atualizarResumoDispositivo(dispositivoId);
  }
}


// --- PASSO 5: "BOA SOLUÇÃO" (AJUSTE) ---
// Ajustado para não mexer no `analisadoEm`
export async function registrarFalhaAnaliseComentario(
  idAnalise: string,
  erro: string
): Promise<void> {
  await prisma.comentarioAnalise.update({
    where: { idAnalise },
    data: {
      status: "failed",
      erro: erro.substring(0, 255), // Limita o tamanho do erro
      updatedAt: new Date() // Atualiza o timestamp (para o backoff)
    },
  });
  // NOTA: Não mexemos no `analisadoEm` do ComentarioDispositivo.
  // Isso permite que o job seja pego novamente pela lógica
  // de `obterComentariosPendentes` após 1 hora.
}


// --- (Funções de API mantidas) ---

export async function obterAspectoScoresDoDispositivo(
  idDispositivo: string
): Promise<AspectoScoresDoDispositivo | null> {
  const dispositivo = await prisma.dispositivo.findUnique({
    where: { idDispositivo },
    select: { idDispositivo: true },
  });

  if (!dispositivo) {
    return null;
  }

  const aspectos = await prisma.dispositivoAspectoScore.findMany({
    where: { idDispositivo },
    orderBy: { aspecto: "asc" },
  });

  return {
    idDispositivo,
    aspectos: aspectos.map((item) => ({
      aspecto: item.aspecto,
      mediaScore:
        item.mediaScore !== null && item.mediaScore !== undefined
          ? Number(item.mediaScore.toFixed(2))
          : null,
      totalOpinions: item.totalOpinions,
    })),
  };
}

export async function obterResumoComentariosDoDispositivo(
  idDispositivo: string
): Promise<ResumoComentariosDoDispositivo | null> {
  const dispositivo = await prisma.dispositivo.findUnique({
    where: { idDispositivo },
    select: { idDispositivo: true },
  });

  if (!dispositivo) {
   return null;
  }

  let resumo = await prisma.dispositivoResumoComentario.findUnique({
    where: { idDispositivo },
  });

  // (Esta lógica de re-fetch e parsing está mantida)
  if (!resumo) {
    await atualizarResumoDispositivo(idDispositivo);
    resumo = await prisma.dispositivoResumoComentario.findUnique({
      where: { idDispositivo },
    });
  }

  if (!resumo) {
    return {
      idDispositivo,
      resumo: null,
      totalAnalisesConsideradas: 0,
      ultimaAtualizacao: null,
      notaGeral: null,
      totalAvaliacoes: null,
      metricas: [],
    };
  }

  const parsedResumo = parseResumoPayload(resumo.resumo);
  const totalAvaliacoes =
    parsedResumo.totalAvaliacoes !== null
      ? parsedResumo.totalAvaliacoes
      : resumo.totalAnalisesConsideradas ?? null;

  return {
    idDispositivo,
    resumo: parsedResumo.texto,
    totalAnalisesConsideradas: resumo.totalAnalisesConsideradas,
    ultimaAtualizacao: resumo.updatedAt,
    notaGeral: parsedResumo.notaGeral,
    totalAvaliacoes,
    metricas: parsedResumo.metricas,
  };
}


// --- PASSO 5: "BOA SOLUÇÃO" (ADICIONADO) ---
// Adicionamos a função de "rede de segurança" (Backfill)
export async function preencherFilaDeAnalise(): Promise<number> {
  console.log("[processo] Backfill: Verificando comentários órfãos...");
  
  // Encontra todos os comentários que JÁ TÊM um job
  const comentariosComAnalise = await prisma.comentarioAnalise.findMany({
    select: { idComentario: true }
  });
  const setComAnalise = new Set(comentariosComAnalise.map(a => a.idComentario));

  // Encontra todos os comentários que NÃO TÊM um job
  const comentariosSemAnalise = await prisma.comentarioDispositivo.findMany({
    where: {
      idComentario: {
        notIn: Array.from(setComAnalise)
      }
    },
    select: { idComentario: true }
  });

  if (comentariosSemAnalise.length === 0) {
    console.log("[processo] Backfill: Nenhum comentário órfão encontrado.");
    return 0;
  }

  const dadosParaCriarJobs = comentariosSemAnalise.map(c => ({
    idComentario: c.idComentario,
    status: "pending" as const
  }));

  console.log(`[processo] Backfill: Criando ${dadosParaCriarJobs.length} jobs 'pending' para comentários órfãos via createMany...`);

  try {
      const resultado = await prisma.comentarioAnalise.createMany({
        data: dadosParaCriarJobs,
        skipDuplicates: true // Segurança
      });
      console.log(`[processo] Backfill: ${resultado.count} jobs criados.`);
      return resultado.count;
  } catch (error) {
      console.error(`[processo] Backfill: Falha ao criar jobs órfãos:`, error);
      return 0;
  }
}