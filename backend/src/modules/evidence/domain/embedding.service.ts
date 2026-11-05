export interface EmbeddingService {
  embed(texts: string[]): Promise<number[][]>;
}

export const EMBEDDING_DIMENSION = 768;

/**
 * Generates a deterministic pseudo-embedding of length `dimensions` for a given string.
 * Used for offline testing and graceful degradation when external API is unreachable.
 * The output vector is normalized to unit L2 norm so dot product = cosine similarity.
 */
export function generatePseudoEmbedding(
  text: string,
  dimensions = EMBEDDING_DIMENSION,
): number[] {
  const vector = new Array<number>(dimensions);
  const normalized = text.trim().toLowerCase();

  // FNV-1a hash base
  let h = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i++) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  // Linear Congruential Generator seeded by hash
  let seed = h >>> 0;
  let sumSq = 0;

  for (let i = 0; i < dimensions; i++) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    // Map to [-1, 1]
    const val = (seed / 0xffffffff) * 2 - 1;
    vector[i] = val;
    sumSq += val * val;
  }

  // L2 normalize
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < dimensions; i++) {
    vector[i] = Number((vector[i]! / norm).toFixed(6));
  }

  return vector;
}

export class InMemoryEmbeddingService implements EmbeddingService {
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => generatePseudoEmbedding(t));
  }
}
