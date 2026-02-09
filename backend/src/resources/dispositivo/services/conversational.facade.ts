import { GeminiService } from "./gemini.service";
import {
  splitUserCriteria,
  criteriosFromSeletores,
  mergeCriteriaLists,
  collectConsoleInput,
  inferCriteriaFromKeywords,
  analyzeCriteriaCoverage,
  hasMinimumCoverage,
  buildCoverageQuestion,
} from "./criteria.helper";
import { getMatchingFacade } from "./matching.facade";
import {
  ChatMsg,
  SeletoresPesquisa,
  CriterioPesquisa,
} from "../dispositivo.types";
import { registrarEventoPesquisa } from "./pesquisa-evento.service";

/**
 * Fachada responsável por orquestrar a pesquisa conversacional (Gemini + matching).
 */
export class ConversationalMatchingFacade {
  async orquestrarPesquisaConversacional(
    historicoConversa: ChatMsg[],
    filtrosSelecionados: SeletoresPesquisa,
    idUsuario: string | undefined
  ) {
    const decisaoGemini = await GeminiService.orquestrar(
      historicoConversa,
      filtrosSelecionados
    );

    const ultimaMensagemUsuario = historicoConversa
      .filter((m) => m.role === "user")
      .pop();
    const consoleInput = collectConsoleInput(ultimaMensagemUsuario);
    const { textoLivre: textoLivreChunks } =
      splitUserCriteria(ultimaMensagemUsuario);

    const iaFilters =
      decisaoGemini.acao === "PESQUISAR"
        ? (decisaoGemini.dados?.filtros as CriterioPesquisa[])
        : undefined;

    const perguntaGemini =
      typeof decisaoGemini.dados?.pergunta === "string"
        ? decisaoGemini.dados.pergunta.trim()
        : undefined;
    const perguntaGeminiEhFallback =
      perguntaGemini === GeminiService.FALLBACK_ERROR_PROMPT ||
      /Desculpe, tive um problema/.test(perguntaGemini ?? "");

    const filtrosCompletos = await this.buildFiltersFromConversation({
      userMessage: ultimaMensagemUsuario,
      seletores: filtrosSelecionados,
      iaFilters,
      allowTextExtraction: true,
    });

    const eventoPesquisa = await registrarEventoPesquisa({
      idUsuario,
      textoLivre:
        consoleInput ??
        textoLivreChunks.find((value) => Boolean(value?.trim())) ??
        null,
      selecionadosUi: filtrosSelecionados,
      criteriosGemini: iaFilters,
      criteriosUsados: filtrosCompletos,
    });
    const eventoId = eventoPesquisa?.idEvento;

    const coverage = analyzeCriteriaCoverage(filtrosCompletos);
    const temCoberturaMinima =
      filtrosCompletos.length > 0 && hasMinimumCoverage(coverage);

    const deveExecutarMatch =
      temCoberturaMinima &&
      (decisaoGemini.acao === "PESQUISAR" || perguntaGeminiEhFallback);

    if (deveExecutarMatch) {
      const dispositivos = await getMatchingFacade().findMatchingDispositivos(
        filtrosCompletos,
        idUsuario,
        {
          consoleInput,
          seletores: filtrosSelecionados,
          eventoId,
        }
      );

      return {
        acao: "RESULTADO",
        dados: dispositivos,
      };
    }

    const perguntaFinal =
      perguntaGemini && !perguntaGeminiEhFallback
        ? perguntaGemini
        : buildCoverageQuestion(coverage);

    return {
      acao: "PERGUNTAR",
      dados: { texto: perguntaFinal },
    };
  }

  private async buildFiltersFromConversation(params: {
    userMessage?: ChatMsg;
    seletores?: SeletoresPesquisa;
    iaFilters?: CriterioPesquisa[];
    allowTextExtraction?: boolean;
  }): Promise<CriterioPesquisa[]> {
    const { userMessage, seletores, iaFilters, allowTextExtraction = false } =
      params;
    const { structured, textoLivre } = splitUserCriteria(userMessage);
    const criteriosSeletores = criteriosFromSeletores(seletores);
    let extractedFromText: CriterioPesquisa[] = [];
    const plainTextChunks = [...textoLivre];
    const consoleInput = collectConsoleInput(userMessage);
    if (consoleInput) {
      plainTextChunks.push(consoleInput);
    }

    if (allowTextExtraction && textoLivre.length) {
      const joined = plainTextChunks
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value && value.length))
        .join(". ");

      if (joined) {
        extractedFromText = await GeminiService.extract(joined);
      }
    }

    const heuristicCriterios = inferCriteriaFromKeywords(plainTextChunks);

    return mergeCriteriaLists(
      structured,
      criteriosSeletores,
      iaFilters,
      extractedFromText,
      heuristicCriterios
    );
  }
}

export const conversationalFacade = new ConversationalMatchingFacade();
