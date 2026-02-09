// Arquivo: src/processamento.ts

import { prisma } from "../database/prismaSingleton";
// --- AJUSTE (Passo 5 e 6) ---
// Importamos a "rede de segurança"
import {
  concluirAnaliseComentario,
  iniciarAnaliseComentario,
  obterComentariosPendentes,
  registrarComentariosExternos,
  registrarFalhaAnaliseComentario,
  preencherFilaDeAnalise, // <-- ADICIONADO (Passo 5)
} from "../resources/comentario/comentario.service";
import { buscarComentariosCSV, buscarResumoProdutosCSV } from "../integrations/csv.client";
import type {
  ComentarioCsvDTO,
  ResumoProdutoCsvDTO,
} from "../resources/comentario/comentario.types";
// --- AJUSTE (Passo 3 e 4) ---
// Trocamos o GeminiService pelo "Interruptor" abstrato
import { analysisService } from "../integrations/modulo/analysis.provider"; // <-- MUDANÇA

// URL do CSV
const CSV_COMMENTS_URL = process.env.CSV_SOURCE_URL_2
const CSV_SUMMARY_URL = process.env.CSV_SOURCE_URL_1

/**
 * Executa um CICLO de ingestão e análise de comentários.
 * Esta função é chamada repetidamente pelo worker.
 */
export async function executarProcessamentoCompleto() {
  console.log("[processo] Iniciando CICLO de processamento...");

  // ---
  // ETAPA 0: ATUALIZAÇÃO DE RESUMOS AGREGADOS VIA CSV
  // ---
  // (Esta lógica foi mantida 100% como estava no seu ficheiro)
  if (!CSV_SUMMARY_URL) {
    console.warn(
      "[processo] A variável de ambiente CSV_SUMMARY_URL não está configurada. Pulando atualização de resumos agregados."
    );
  } else {
    await atualizarResumosAgregados(CSV_SUMMARY_URL);
  }

  // ---
  // ETAPA 1: INGESTÃO DE CSV
  // ---
  if (!CSV_COMMENTS_URL) {
    console.warn(
      `[processo] A variável de ambiente CSV_COMMENTS_URL não está configurada. Pulando ingestão.`
    );
  } else {
    try {
      console.log(`[processo] Etapa 1: Verificando comentários do CSV...`);
      const plataforma = "csv_comentarios_site";
      const comentarios = await buscarComentariosCSV(CSV_COMMENTS_URL);

      const comentariosPorDispositivo = comentarios.reduce((acc, c) => {
        (acc[c.dispositivoIdExterno] =
          acc[c.dispositivoIdExterno] || []).push(c);
        return acc;
      }, {} as Record<string, ComentarioCsvDTO[]>);

      let totalNovos = 0;
      for (const dispositivoIdExterno in comentariosPorDispositivo) {
        const dispositivo = await prisma.dispositivo.findFirst({
          where: { modelo: dispositivoIdExterno },
        });

        if (dispositivo) {
          const comentariosDoDispositivo =
            comentariosPorDispositivo[dispositivoIdExterno];
          
          // (Esta função agora usa createMany x2 e cria os jobs 'pending')
          const contagemNovos = await registrarComentariosExternos(
            dispositivo.idDispositivo,
            plataforma,
            comentariosDoDispositivo
          );
          totalNovos += contagemNovos;
        } else {
          console.warn(
            `[processo] Dispositivo com modelo "${dispositivoIdExterno}" não encontrado.`
          );
        }
      }
      
      if (totalNovos > 0) {
          console.log(
            `[processo] ... Ingestão concluída. ${totalNovos} novos comentários/jobs registrados.`
          );
      } else {
          console.log(
            `[processo] ... Nenhum comentário novo encontrado no CSV.`
          );
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[processo] Falha grave na Etapa 1 (Ingestão):`,
        message
      );
    }
  }

  // ---
  // ETAPA 1.5: PREENCHIMENTO DA FILA (A "Rede de Segurança")
  // ---
  try {
    console.log(`[processo] Etapa 1.5: Verificando fila de análise (Backfill)...`);
    // (Chama a função que busca comentários órfãos)
    const novosJobs = await preencherFilaDeAnalise(); 
    if (novosJobs > 0) {
      console.log(`[processo] ... ${novosJobs} jobs 'pending' criados para comentários existentes.`);
    } else {
      console.log(`[processo] ... Fila de análise está sincronizada.`);
    }
  } catch (error) {
     const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[processo] Falha grave na Etapa 1.5 (Preenchimento da Fila):`,
        message
      );
  }

  // ---
  // ETAPA 2: ANÁLISE (AGORA SEQUENCIAL E DESACOPLADA)
  // ---
  try {
    console.log(`[processo] Etapa 2: Buscando lote de jobs da fila...`);
    
    // (Esta função agora busca na tabela ComentarioAnalise)
    const pendentes = await obterComentariosPendentes(50); 
    console.log(
      `[processo] ... ${pendentes.length} jobs encontrados para análise neste ciclo.`
    );

    if (pendentes.length === 0) {
      console.log("[processo] ... Nenhuma análise para processar.");
      console.log("[processo] CICLO de processamento finalizado.");
      return; 
    }

    // --- MUDANÇA: Processamento Sequencial (1 por 1) ---
    // (Removemos o Promise.allSettled para evitar 429)
    console.log(`[processo] ... Processando ${pendentes.length} jobs (1 por 1)...`);
    
    for (const comentario of pendentes) {
      // (O 'idAnalise' agora vem do 'obterComentariosPendentes')
      const idAnalise = comentario.idAnalise; 

      if (!idAnalise) {
        console.error(`[processo] ... Falha: Job para comentário ${comentario.idComentario} está sem ID de Análise. Pulando.`);
        continue; 
      }
      
      try {
        console.log(`[processo] ... Analisando job ${idAnalise} (Comentário ${comentario.idComentario})...`);
        
        // 1. Reclama o Job (muda para 'processing')
        await iniciarAnaliseComentario(idAnalise); 

        // 2. Chama o serviço ABSTRATO (o "Interruptor")
        const resultado = await analysisService.analisarComentario(comentario);

        // 3. Sucesso! Conclui o Job
        await concluirAnaliseComentario(idAnalise, resultado);
        console.log(`[processo] ... Sucesso ao analisar job ${idAnalise}.`);
        
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[processo] ... Falha ao analisar job ${idAnalise}:`,
          message
        );
        
        // 4. Falha! Registra a falha no Job (muda para 'failed')
        // (Esta função agora define o 'updatedAt' para o backoff de 1h)
        await registrarFalhaAnaliseComentario(idAnalise, message);
      }
    }
    // --- FIM DA MUDANÇA ---

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[processo] Falha grave na Etapa 2 (Análise da Fila):`,
      message
    );
  }

  console.log("[processo] CICLO de processamento finalizado.");
}


// ---
// LÓGICA DA ETAPA 0 (Mantida 100% igual ao seu ficheiro)
// ---
async function atualizarResumosAgregados(url: string): Promise<void> {
  try {
    console.log("[processo] Etapa 0: Sincronizando resumos agregados a partir do CSV...");
    const registros = await buscarResumoProdutosCSV(url);

    if (!registros.length) {
      console.log("[processo] ... Nenhum registro de resumo encontrado no CSV informado.");
      return;
    }

    let totalAtualizados = 0;

    for (const resumo of registros) {
      if (!resumo.produto) {
        continue;
      }

      const dispositivo = await prisma.dispositivo.findFirst({
        where: { modelo: resumo.produto },
      });

      if (!dispositivo) {
        console.warn(
          `[processo] Resumo agregado: dispositivo com modelo "${resumo.produto}" não encontrado.`
        );
        continue;
      }

      const totalAvaliacoesRaw = resumo.totalAvaliacoes ?? null;
      const totalAvaliacoes =
        totalAvaliacoesRaw !== null && Number.isFinite(totalAvaliacoesRaw)
          ? Math.max(0, Math.round(totalAvaliacoesRaw))
          : 0;

      const metricas = construirMetricasResumo(resumo);
      const notaGeral = Number.isFinite(resumo.notaGeral ?? NaN)
        ? resumo.notaGeral
        : null;
      const totalAvaliacoesValue =
        totalAvaliacoes > 0 ? totalAvaliacoes : null;
      const resumoNarrativo = gerarResumoNarrativoCsv({
        produto: resumo.produto,
        notaGeral,
        totalAvaliacoes: totalAvaliacoesValue,
        metricas,
      });

      const payload = {
        texto: resumoNarrativo,
        notaGeral,
        totalAvaliacoes: totalAvaliacoesValue,
        metricas,
      };

      await prisma.dispositivoResumoComentario.upsert({
        where: { idDispositivo: dispositivo.idDispositivo },
        update: {
          resumo: JSON.stringify(payload),
          totalAnalisesConsideradas: totalAvaliacoes,
          totalAnalisesDisponiveis: totalAvaliacoes,
        },
        create: {
          idDispositivo: dispositivo.idDispositivo,
          resumo: JSON.stringify(payload),
          totalAnalisesConsideradas: totalAvaliacoes,
          totalAnalisesDisponiveis: totalAvaliacoes,
        },
      });

      totalAtualizados += 1;
    }

    console.log(
      `[processo] ... Resumos agregados atualizados para ${totalAtualizados} dispositivos.`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      "[processo] Falha na atualização dos resumos agregados:",
      message
    );
  }
}

type NarrativaCSVParams = {
  produto: string;
  notaGeral: number | null;
  totalAvaliacoes: number | null;
  metricas: Array<{ chave: string; rotulo: string; score: number | null }>;
};

function construirMetricasResumo(
  resumo: ResumoProdutoCsvDTO
): Array<{ chave: string; rotulo: string; score: number | null }> {
  return [
    {
      chave: "custo-beneficio",
      rotulo: "Custo-benefício",
      score: normalizarScore(resumo.custoBeneficio),
    },
    {
      chave: "qualidade-camera",
      rotulo: "Qualidade da câmera",
      score: normalizarScore(resumo.qualidadeCamera),
    },
    {
      chave: "duracao-bateria",
      rotulo: "Duração da bateria",
      score: normalizarScore(resumo.duracaoBateria),
    },
    {
      chave: "durabilidade",
      rotulo: "Durabilidade",
      score: normalizarScore(resumo.durabilidade),
    },
  ].filter((item) => item.score !== null);
}

function normalizarScore(valor: number | null): number | null {
  if (valor === null || valor === undefined) {
    return null;
  }
  const parsed = Number(valor);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Number(parsed);
}

function gerarResumoNarrativoCsv({
  produto,
  notaGeral,
  totalAvaliacoes,
  metricas,
}: NarrativaCSVParams): string | null {
  const partes: string[] = [];
  const nomeProduto = produto.trim();

  if (notaGeral !== null) {
    const sentimento = descreverSentimentoGeral(notaGeral);
    const volume = descreverVolumeOpinioes(totalAvaliacoes);
    const fraseBase = volume
      ? `Quem já usa o ${nomeProduto} comenta que está ${sentimento}, ${volume}.`
      : `Quem já usa o ${nomeProduto} comenta que está ${sentimento}.`;
    partes.push(fraseBase);
  } else if (totalAvaliacoes && totalAvaliacoes > 0) {
    const volume = descreverVolumeOpinioes(totalAvaliacoes);
    if (volume) {
      partes.push(
        `O ${nomeProduto} reúne relatos reais de clientes, ${volume}.`
      );
    }
  }

  if (metricas.length) {
    const excelentes = metricas.filter(
      (m) => m.score !== null && m.score >= 4.5
    );
    const bons = metricas.filter(
      (m) =>
        m.score !== null &&
        m.score >= 4 &&
        m.score < 4.5 &&
        !excelentes.find(
          (ex) => ex.rotulo.toLowerCase() === m.rotulo.toLowerCase()
        )
    );
    const medianos = metricas.filter(
      (m) =>
        m.score !== null &&
        m.score >= 3.5 &&
        m.score < 4 &&
        !excelentes.find(
          (ex) => ex.rotulo.toLowerCase() === m.rotulo.toLowerCase()
        ) &&
        !bons.find((bn) => bn.rotulo.toLowerCase() === m.rotulo.toLowerCase())
    );
    const melhoria = metricas.filter(
      (m) => m.score !== null && m.score < 3.5
    );

    if (excelentes.length) {
      partes.push(
        `Os elogios mais fortes destacam ${formatarListaMetricas(
          excelentes
        )} como diferenciais que encantam.`
      );
    }

    if (bons.length) {
      partes.push(
        `Também há muitos comentários positivos sobre ${formatarListaMetricas(
          bons
        )}, reforçando uma experiência agradável.`
      );
    }

    if (medianos.length) {
      partes.push(
        `Para o dia a dia, ${formatarListaMetricas(
          medianos
        )} costumam entregar resultados estáveis.`
      );
    }

    if (melhoria.length) {
      partes.push(
        `Alguns relatos mencionam que ${formatarListaMetricas(
          melhoria
        )} ainda podem evoluir um pouco mais.`
      );
    }
  }

  if (!partes.length) {
    return null;
  }

  return partes.join(" ");
}

function descreverSentimentoGeral(nota: number): string {
  if (nota >= 4.6) {
    return "muito feliz com a experiência";
  }
  if (nota >= 4) {
    return "bastante satisfeito com o que recebeu";
  }
  if (nota >= 3.5) {
    return "satisfeito, mas ainda atento a possíveis melhorias";
  }
  if (nota >= 3) {
    return "dividido entre pontos altos e baixos";
  }
  return "um pouco desapontado e espera evoluções importantes";
}

function descreverVolumeOpinioes(total: number | null): string | null {
  if (!total || !Number.isFinite(total) || total <= 0) {
    return null;
  }
  if (total >= 1000) {
    return "com muita gente compartilhando experiências recentes";
  }
  if (total >= 200) {
    return "com um grande volume de relatos de quem já testou";
  }
  if (total >= 50) {
    return "com muitos clientes trazendo impressões parecidas";
  }
  return "com um grupo menor de pessoas dividindo impressões";
}

function formatarListaMetricas(metricas: Array<{ rotulo: string }>): string {
  const labels = metricas.map((m) => m.rotulo);
  if (labels.length === 1) {
    return labels[0];
  }
  if (labels.length === 2) {
    return `${labels[0]} e ${labels[1]}`;
  }
  return `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`;
}