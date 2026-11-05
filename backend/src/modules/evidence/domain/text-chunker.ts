import type { EvidenceSnippetDraft } from "./snippet";

interface ChunkInput {
  readonly reviewId: string;
  readonly deviceId: string;
  readonly provider: string;
  readonly content: string;
  readonly publishedAt?: Date;
  readonly knownAspects?: string[];
}

const ASPECT_KEYWORDS: Record<string, string[]> = {
  battery: [
    "bateria",
    "autonomia",
    "carregador",
    "recarga",
    "mah",
    "dura",
    "duração",
    "drenando",
    "descarrega",
    "carregamento",
  ],
  camera: [
    "camera",
    "câmera",
    "cameras",
    "câmeras",
    "foto",
    "fotos",
    "lente",
    "sensor",
    "video",
    "vídeo",
    "gravacao",
    "gravação",
    "selfie",
    "noturna",
    "foco",
  ],
  performance: [
    "desempenho",
    "travando",
    "trava",
    "jogos",
    "jogo",
    "roda",
    "fluidez",
    "multitarefa",
    "processador",
    "esquenta",
    "aquecimento",
    "lag",
    "fps",
    "ram",
    "snapdragon",
    "dimensity",
  ],
  screen: [
    "tela",
    "amoled",
    "oled",
    "ips",
    "display",
    "120hz",
    "90hz",
    "brilho",
    "sol",
    "resolucao",
    "resolução",
    "cores",
  ],
  build: [
    "construcao",
    "construção",
    "acabamento",
    "plastico",
    "plástico",
    "vidro",
    "resistente",
    "pegada",
    "design",
    "pesado",
    "leve",
    "som",
    "audio",
    "áudio",
    "alto-falante",
  ],
  cost_benefit: [
    "custo-beneficio",
    "custo beneficio",
    "custo-benefício",
    "custo benefício",
    "preco",
    "preço",
    "vale a pena",
    "barato",
    "caro",
    "promocao",
    "promoção",
  ],
};

const POSITIVE_WORDS = [
  "bom",
  "boa",
  "bons",
  "boas",
  "otimo",
  "ótimo",
  "otima",
  "ótima",
  "otimos",
  "ótimos",
  "otimas",
  "ótimas",
  "excelente",
  "excelentes",
  "top",
  "incrivel",
  "incrível",
  "incriveis",
  "incríveis",
  "rapido",
  "rápido",
  "rapida",
  "rápida",
  "liso",
  "perfeito",
  "perfeita",
  "dura muito",
  "recomendo",
  "adorei",
  "gostei",
  "maravilhoso",
  "maravilhosa",
  "linda",
  "lindas",
  "lindo",
  "lindos",
];

const NEGATIVE_WORDS = [
  "ruim",
  "pessimo",
  "péssimo",
  "pessima",
  "péssima",
  "fraco",
  "fraca",
  "trava",
  "travando",
  "esquenta",
  "lento",
  "lenta",
  "descarrega rapido",
  "horrivel",
  "horrível",
  "decepcao",
  "decepção",
  "nao vale",
  "não vale",
];

function detectAspect(text: string, knownAspects?: string[]): string | null {
  const lower = text.toLowerCase();
  for (const [aspect, keywords] of Object.entries(ASPECT_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      return aspect;
    }
  }

  if (knownAspects && knownAspects.length === 1 && knownAspects[0]) {
    return knownAspects[0];
  }

  return null;
}

function detectSentiment(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  let pos = 0;
  let neg = 0;

  for (const word of POSITIVE_WORDS) {
    if (lower.includes(word)) pos++;
  }
  for (const word of NEGATIVE_WORDS) {
    if (lower.includes(word)) neg++;
  }

  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
}

export function chunkReviewContent(input: ChunkInput): EvidenceSnippetDraft[] {
  if (!input.content || input.content.trim().length < 15) {
    return [];
  }

  // Split by sentence terminators or newlines
  const rawSentences = input.content
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 15);

  const drafts: EvidenceSnippetDraft[] = [];
  let chunkIndex = 0;

  for (const sentence of rawSentences) {
    // Truncate excessively long sentences cleanly
    const cleanText =
      sentence.length > 250
        ? `${sentence.slice(0, 247).trim()}...`
        : sentence;

    const aspect = detectAspect(cleanText, input.knownAspects);
    if (!aspect) {
      continue;
    }

    const sentiment = detectSentiment(cleanText);

    drafts.push({
      reviewId: input.reviewId,
      chunkIndex: chunkIndex++,
      deviceId: input.deviceId,
      aspect,
      text: cleanText,
      sentiment,
      provider: input.provider,
      publishedAt: input.publishedAt,
    });
  }

  return drafts;
}
