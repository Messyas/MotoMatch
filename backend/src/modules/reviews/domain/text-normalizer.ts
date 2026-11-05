import {
  ASPECT_TERMS,
  type ReviewAspectType,
} from "../../../locales/pt-BR/review-vocabulary";

export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findAspects(text: string): ReviewAspectType[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const found = new Set<ReviewAspectType>();
  const words = ` ${normalized} `;

  for (const [aspect, terms] of Object.entries(ASPECT_TERMS)) {
    for (const term of terms) {
      if (words.includes(` ${term} `)) {
        found.add(aspect as ReviewAspectType);
        break;
      }
    }
  }

  return Array.from(found);
}
