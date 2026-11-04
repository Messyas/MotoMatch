import type { CritiqueAction } from "../../recommender";

export function detectCritique(message: string): CritiqueAction | null {
  const normalized = message
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Cheap / Lower price
  if (
    /\b(mais barato|menor preco|mais em conta|diminuir o preco|abaixo desse preco)\b/.test(
      normalized,
    )
  ) {
    return { kind: "cheaper" };
  }

  // Similar to reference
  if (/\b(parecido|similar|equivalente|outro como esse|mesmo estilo)\b/.test(normalized)) {
    return { kind: "similarTo" };
  }

  // Battery
  if (
    /\b((?:mais|melhor|maior)\s+bateria|bateria\s+(?:melhor|maior)|mais autonomia|dura mais)\b/.test(
      normalized,
    )
  ) {
    return { kind: "moreOf", aspect: "battery" };
  }

  // Camera
  if (
    /\b((?:mais|melhor|superior)\s+camera|camera\s+(?:melhor|superior)|fotos?\s+melhores?)\b/.test(
      normalized,
    )
  ) {
    return { kind: "moreOf", aspect: "camera" };
  }

  // Performance
  if (
    /\b((?:mais|melhor|superior)\s+desempenho|desempenho\s+(?:melhor|superior)|mais rapido|mais potente|mais velocidade|para jogos|mais ram)\b/.test(
      normalized,
    )
  ) {
    return { kind: "moreOf", aspect: "performance" };
  }

  // Screen
  if (/\b((?:mais|melhor|maior)\s+tela|tela\s+(?:maior|melhor|superior))\b/.test(normalized)) {
    return { kind: "moreOf", aspect: "screen" };
  }

  // Storage
  if (/\b(mais espaco|mais armazenamento|mais memoria interna|mais giga)\b/.test(normalized)) {
    return { kind: "moreOf", aspect: "storage" };
  }

  return null;
}
