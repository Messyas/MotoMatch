// Arquivo: src/services/analysis.provider.ts

import { IAnalysisService } from "./analysis.interface";
import { GeminiAnalysisService } from "../gemini.client";

// --- (Quando o seu modelo estiver pronto, você o importará aqui) ---
// import { MeuModeloProprioService } from "../integrations/meu-modelo.service";

/**
 * Este é o "Interruptor" (Ponto de Troca).
 *
 * O resto da aplicação (especialmente o `commentProcessing.ts`) vai
 * importar o `analysisService` deste ficheiro.
 *
 * Para trocar o Gemini pelo seu modelo, você só precisará
 * de alterar esta linha.
 */

// Instancia o serviço que queremos usar
const analysisServiceInstance: IAnalysisService = new GeminiAnalysisService();

// (Exemplo de como seria a troca no futuro)
// const servicoAtivo = process.env.ANALYSIS_SERVICE === 'MEU_MODELO'
//   ? new MeuModeloProprioService()
//   : new GeminiAnalysisService();
// export const analysisService = servicoAtivo;


// Exporta a instância escolhida
export const analysisService = analysisServiceInstance;