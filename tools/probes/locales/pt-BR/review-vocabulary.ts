/**
 * PT-BR domain vocabulary used for matching (docs/ARQUITETURA.md §8.1).
 * This is locale data, not logic: terms stay in Portuguese because they match Portuguese content.
 * Terms are written already normalized (lowercase, no accents).
 */

export const SEARCH_QUERY_TEMPLATES = [
  "{model} review",
  "{model} vale a pena",
  "{model} depois de meses de uso",
  "{model} teste de bateria",
] as const;

export const VIDEO_TITLE_TERMS = {
  review: [
    "review", "analise", "vale a pena", "depois de", "meses de uso", "mes de uso", "uso prolongado",
    "teste", "testei", "opiniao", "impressoes", "experiencia", "honesto", "sincero", "pontos negativos",
    "pros e contras", "ainda vale", "bateria", "camera",
  ],
  longTerm: ["depois de", "meses de uso", "mes de uso", "uso prolongado", "1 ano", "um ano", "ainda vale", "longo prazo"],
  nonReview: [
    "capinha", "capa", "pelicula", "case", "sorteio", "giveaway", "shorts", "como formatar", "hard reset",
    "desbloquear", "frp", "preco caiu", "promocao", "oferta",
  ],
  unboxing: ["unboxing", "abrindo a caixa", "chegou"],
  comparison: ["vs", "x", "comparativo"],
} as const;

export const ASPECT_TERMS = {
  battery: ["bateria", "carga", "carregador", "carregamento", "autonomia", "mah", "dura o dia", "descarrega", "recarga"],
  camera: ["camera", "cameras", "foto", "fotos", "selfie", "zoom", "lente", "grava", "gravacao", "noturna", "noturno"],
  performance: [
    "desempenho", "travando", "trava", "travou", "lento", "lentidao", "rapido", "fluido", "lag", "fps", "jogo", "jogos",
    "processador", "aquece", "esquenta", "aquecimento", "free fire", "ram",
  ],
  display: ["tela", "display", "brilho", "amoled", "oled", "lcd", "hz", "toque", "touch"],
  audio: ["som", "audio", "alto falante", "fone", "p2", "volume"],
  software: ["atualizacao", "atualizacoes", "android", "sistema", "bug", "bugs", "update", "propaganda", "bloatware"],
  build: ["acabamento", "plastico", "vidro", "resistente", "quebrou", "trincou", "durabilidade", "pesado", "leve", "agua", "ip68", "ip54"],
  connectivity: ["sinal", "wifi", "wi fi", "5g", "4g", "chip", "nfc", "bluetooth", "gps"],
  valueForMoney: ["custo beneficio", "preco", "caro", "barato", "vale a pena", "valeu a pena", "dinheiro"],
} as const;

export type Aspect = keyof typeof ASPECT_TERMS;

/** Patterns run against normalized text. */
export const COMMENT_PATTERNS = {
  ownership:
    /\b(comprei|tenho( o| um)?|uso (ha|faz)|to usando|estou usando|meu (celular|aparelho|g\d+|a\d+)|o meu|depois de \d+ (dias|semanas|meses|ano)|\d+ (meses|mes|anos?) de uso|troquei)\b/,
  spam: /(https?:\/\/|www\.|\bprimeiro\b|\bfirst\b|quem (ta|esta) (vendo|assistindo)|sorteio|me (inscrevi|segue)|inscreva|whats(app)?|\+55|ganhe|\bpix\b)/,
  creatorPraiseOnly: /^(otimo|excelente|muito bom|parabens|top|show)( (video|conteudo|canal|review|trabalho))?( mano| cara| irmao)?$/,
} as const;
