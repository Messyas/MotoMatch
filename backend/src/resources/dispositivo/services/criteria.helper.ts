/**
 * Funções utilitárias relacionadas à normalização e cobertura de critérios.
 */
import {
  CriterioPesquisa,
  ChatMsg,
  SeletoresPesquisa,
  PesquisaDispositivoDTO,
} from "../dispositivo.types";

type PreferenceAspect = "camera" | "bateria" | "preco" | "desempenho";
type PreferenceLevel = "basica" | "ok" | "boa" | "top";

const CRITERION_ASPECT_HINT: Partial<Record<string, PreferenceAspect>> = {
  battery: "bateria",
  main_camera: "camera",
  secondary_camera: "camera",
  tertiary_camera: "camera",
  front_camera: "camera",
  camera: "camera",
  benchmark: "desempenho",
  ram: "desempenho",
  rom: "desempenho",
  processor: "desempenho",
  preco_intervalo: "preco",
  preco: "preco",
  price: "preco",
  custo: "preco",
};

const PRICE_TYPE_SET = new Set(["preco_intervalo", "preco", "price", "custo"]);

type UserCriteriaSplit = {
  structured: CriterioPesquisa[];
  textoLivre: string[];
};

export function splitUserCriteria(message: ChatMsg | undefined): UserCriteriaSplit {
  const result: UserCriteriaSplit = { structured: [], textoLivre: [] };
  if (!message || message.role !== "user") {
    return result;
  }
  const rawCriterios = (message as any).criterios;
  if (!Array.isArray(rawCriterios)) {
    return result;
  }
  for (const criterio of rawCriterios) {
    const normalized = normalizeCriterion(criterio);
    if (!normalized) continue;
    if (normalized.tipo === "texto_livre") {
      result.textoLivre.push(normalized.descricao);
    } else {
      result.structured.push(normalized);
    }
  }
  return result;
}

export function criteriosFromSeletores(
  seletores?: SeletoresPesquisa
): CriterioPesquisa[] {
  if (!seletores) return [];
  return Object.entries(seletores)
    .map(([tipo, rawValue]) => {
      if (typeof rawValue !== "string") return null;
      const descricao = rawValue.trim();
      if (!descricao) return null;
      return normalizeCriterion({ tipo, descricao });
    })
    .filter(
      (criterio): criterio is CriterioPesquisa => criterio !== null
    );
}

export function mergeCriteriaLists(
  ...lists: Array<CriterioPesquisa[] | undefined | null>
): CriterioPesquisa[] {
  const merged: CriterioPesquisa[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    if (!list) continue;
    for (const criterio of list) {
      const normalized = normalizeCriterion(criterio);
      if (!normalized) continue;
      const key = `${normalized.tipo.toLowerCase()}::${normalized.descricao.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(normalized);
    }
  }
  return merged;
}

export function collectConsoleInput(
  message: ChatMsg | undefined
): string | null {
  if (!message || message.role !== "user") return null;
  const consoleInput = (message as any).consoleInput;
  if (typeof consoleInput !== "string") return null;
  const trimmed = consoleInput.trim();
  return trimmed.length ? trimmed : null;
}

export function analyzeCriteriaCoverage(criterios: CriterioPesquisa[]) {
  let hasPrice = false;
  const aspects = new Set<PreferenceAspect>();

  for (const criterio of criterios) {
    const tipo = criterio.tipo.toLowerCase();
    if (PRICE_TYPE_SET.has(tipo)) {
      hasPrice = true;
      continue;
    }
    const aspect = CRITERION_ASPECT_HINT[tipo];
    if (aspect) {
      aspects.add(aspect);
    }
  }

  return { hasPrice, aspects };
}

export function hasMinimumCoverage(coverage: { hasPrice: boolean; aspects: Set<PreferenceAspect> }) {
  if (coverage.hasPrice && coverage.aspects.size >= 1) {
    return true;
  }
  return coverage.aspects.size >= 2;
}

export function buildCoverageQuestion(
  coverage: { hasPrice: boolean; aspects: Set<PreferenceAspect> }
): string {
  if (!coverage.hasPrice) {
    return "Qual é a faixa de preço ou orçamento máximo que você deseja considerar?";
  }
  if (coverage.aspects.size === 0) {
    return "Quais características são mais importantes para você? (Ex.: câmera, bateria, desempenho)";
  }
  return "Preciso de mais detalhes sobre o que você prioriza (câmera, bateria, desempenho) para refinar a busca. Pode me dizer?";
}

function normalizeTextChunk(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function inferLevelFromText(
  normalizedText: string,
  fallback: PreferenceLevel = "boa"
): PreferenceLevel {
  if (/(top|premium|excelent|incrivel|fantastic)/.test(normalizedText)) {
    return "top";
  }
  if (/(boa|otima|ótima|melhor|perfeit)/.test(normalizedText)) {
    return "boa";
  }
  if (/(ok|intermedi|mediana|regular)/.test(normalizedText)) {
    return "ok";
  }
  if (/(simples|basica|de entrada|barata)/.test(normalizedText)) {
    return "basica";
  }
  return fallback;
}

function inferPriceRangeFromText(normalizedText: string): string | null {
  const numberMatches = normalizedText.match(/\d{3,5}/g)?.map((n) => Number(n));
  if (numberMatches && numberMatches.length > 0) {
    const sorted = numberMatches.sort((a, b) => a - b);
    if (sorted.length >= 2) {
      return `${sorted[0]}-${sorted[sorted.length - 1]}`;
    }
    const single = sorted[0];
    if (/(ate|até|maxim|no maximo)/.test(normalizedText)) {
      return `0-${single}`;
    }
    if (/(acima|mais de|a partir)/.test(normalizedText)) {
      return `${single}-99999`;
    }
    return `${Math.max(0, single - 500)}-${single + 500}`;
  }

  if (/(barat|custo-beneficio|economico)/.test(normalizedText)) {
    return "0-1500";
  }
  if (/(intermedi|medio|equilibrado)/.test(normalizedText)) {
    return "1500-2500";
  }
  if (/(caro|premium|top|flagship|alto)/.test(normalizedText)) {
    return "2500-99999";
  }
  return null;
}

export function inferCriteriaFromKeywords(textChunks: string[]): CriterioPesquisa[] {
  if (!textChunks?.length) return [];
  const normalizedTexts = textChunks
    .map((chunk) => normalizeTextChunk(chunk).trim())
    .filter((chunk) => chunk.length > 0);
  if (!normalizedTexts.length) return [];

  const combined = normalizedTexts.join(" ");
  const criterios: CriterioPesquisa[] = [];

  const add = (criterio: CriterioPesquisa | null) => {
    if (criterio) {
      criterios.push(criterio);
    }
  };

  if (/(foto|camera|selfie|imagem|retrato)/.test(combined)) {
    add(
      normalizeCriterion({
        tipo: "camera",
        descricao: inferLevelFromText(combined, "boa"),
      })
    );
  }

  if (/(bateria|autonomi|dia todo|carregar|durabilidade)/.test(combined)) {
    add(
      normalizeCriterion({
        tipo: "battery",
        descricao: inferLevelFromText(combined, "boa"),
      })
    );
  }

  if (/(jogo|game|desempenho|rapido|fluido|processador|multitaref)/.test(combined)) {
    add(
      normalizeCriterion({
        tipo: "benchmark",
        descricao: inferLevelFromText(combined, "boa"),
      })
    );
  }

  const priceRange = inferPriceRangeFromText(combined);
  if (priceRange) {
    add(
      normalizeCriterion({
        tipo: "preco_intervalo",
        descricao: priceRange,
      })
    );
  }

  return criterios.filter(
    (criterio): criterio is CriterioPesquisa => criterio !== null
  );
}

function normalizeCriterion(
  criterio: Partial<CriterioPesquisa> | undefined
): CriterioPesquisa | null {
  if (!criterio) return null;
  const tipo = criterio.tipo?.trim();
  const descricao = criterio.descricao?.toString().trim();
  if (!tipo || !descricao) return null;
  return { tipo, descricao };
}
