// Arquivo: src/services/analysis.interface.ts

import {
  ComentarioParaAnalise,
  AnaliseAspecto, // Importa o tipo genérico que definimos
  AnaliseResultado, // Importa o tipo genérico que definimos
} from "../../resources/comentario/comentario.types";

/**
 * Esta é a interface (o "Contrato") que qualquer Serviço de Análise deve implementar.
 *
 * Ela define um único método, `analisarComentario`, que recebe um comentário
 * e promete devolver um `AnaliseResultado`.
 *
 * O resto da aplicação (como o `commentProcessing.ts`) dependerá APENAS
 * desta interface, e não de uma implementação específica como o Gemini.
 */
export interface IAnalysisService {
  /**
   * Analisa o conteúdo de um comentário para extrair um resumo e aspectos.
   * @param comentario O objeto `ComentarioParaAnalise` contendo os dados necessários.
   * @returns Uma Promise que resolve para um objeto `AnaliseResultado`.
   */
  analisarComentario(
    comentario: ComentarioParaAnalise
  ): Promise<AnaliseResultado>;
}

/**
 * NOTA:
 * Os tipos `AnaliseAspecto` e `AnaliseResultado` (que estão em
 * `comentario.types.ts`) definem a ESTRUTURA DE DADOS que esperamos
 * de qualquer serviço.
 *
 * Esta interface `IAnalysisService` define o COMPORTAMENTO (o método)
 * que esperamos.
 */