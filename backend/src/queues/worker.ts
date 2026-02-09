// Arquivo: src/worker.ts

// Importa a função principal de processamento (do seu cod3)
// ATENÇÃO: Verifique se este caminho está correto para o seu projeto
import { executarProcessamentoCompleto } from '../queues/commentProcessing'; 

// Esta variável impede que o worker execute duas vezes ao mesmo tempo
let isRunning = false; 

/**
 * Função que executa um ciclo de processamento.
 */
async function processarCiclo() {
  // Se o ciclo anterior ainda estiver rodando, pula esta execução
  if (isRunning) {
    console.log('[Worker] Ciclo anterior ainda em execução. Pulando.');
    return;
  }

  // "Trava" a execução
  isRunning = true;
  console.log('[Worker] Iniciando novo ciclo: buscando comentários pendentes...');

  try {
    // Apenas executa a função. Ela não retorna nada (void) por enquanto.
    // Isso remove os erros de 'truthiness' e 'totalProcessado'.
    await executarProcessamentoCompleto();
    
    // Apenas logamos que o ciclo terminou.
    console.log('[Worker] Ciclo de processamento finalizado.');
    
  } catch (error) {
    // Em caso de erro grave no processo, o worker registra mas não para
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Worker] Erro grave durante o ciclo de processamento:', message);
  } finally {
    // "Destrava" a execução, permitindo que o próximo ciclo rode
    isRunning = false; 
  }
}

/**
 * Inicia o worker para rodar em intervalos.
 * Esta função será chamada pelo seu 'startServer.ts'.
 */
export function startWorker() {
  console.log('[Worker] Worker iniciado.');
  
  // Define o intervalo (1 minuto).
  // Você pode aumentar para 5 minutos (5 * 60 * 1000) se preferir.
  const MINUTOS = 1;
  const INTERVALO_MS = MINUTOS * 60 * 1000;

  // 1. Roda o ciclo IMEDIATAMENTE na primeira vez
  // (Isso garante que a análise comece assim que o servidor ligar)
  processarCiclo();

  // 2. Agenda para rodar repetidamente no intervalo definido
  setInterval(processarCiclo, INTERVALO_MS);
}