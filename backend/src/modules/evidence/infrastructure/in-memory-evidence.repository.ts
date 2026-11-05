import type {
  EvidenceRepository,
  PendingReviewForEmbedding,
} from "../domain/evidence.repository";
import type {
  EvidenceSnippet,
  EvidenceSnippetDraft,
  FindEvidenceQuery,
} from "../domain/snippet";

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const valA = a[i] ?? 0;
    const valB = b[i] ?? 0;
    dot += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

export class InMemoryEvidenceRepository implements EvidenceRepository {
  private readonly snippets: EvidenceSnippet[] = [];
  public pendingReviews: PendingReviewForEmbedding[] = [];

  async saveSnippets(drafts: EvidenceSnippetDraft[]): Promise<void> {
    for (const draft of drafts) {
      const existingIdx = this.snippets.findIndex(
        (s) =>
          s.reviewId === draft.reviewId && s.chunkIndex === draft.chunkIndex,
      );

      const snippet: EvidenceSnippet = {
        id: crypto.randomUUID(),
        reviewId: draft.reviewId,
        chunkIndex: draft.chunkIndex,
        deviceId: draft.deviceId,
        aspect: draft.aspect,
        text: draft.text,
        sentiment: draft.sentiment,
        provider: draft.provider,
        publishedAt: draft.publishedAt,
        embedding: draft.embedding,
        createdAt: new Date(),
      };

      if (existingIdx >= 0) {
        this.snippets[existingIdx] = snippet;
      } else {
        this.snippets.push(snippet);
      }
    }
  }

  async findEvidence(query: FindEvidenceQuery): Promise<EvidenceSnippet[]> {
    let filtered = this.snippets.filter((s) => s.deviceId === query.deviceId);

    if (query.aspects && query.aspects.length > 0) {
      const aspectSet = new Set(query.aspects);
      filtered = filtered.filter((s) => aspectSet.has(s.aspect));
    }

    // Sort by vector similarity if queryEmbedding provided, else by date
    if (query.queryEmbedding && query.queryEmbedding.length > 0) {
      filtered.sort((a, b) => {
        const simA = a.embedding
          ? cosineSimilarity(a.embedding, query.queryEmbedding!)
          : -1;
        const simB = b.embedding
          ? cosineSimilarity(b.embedding, query.queryEmbedding!)
          : -1;
        return simB - simA;
      });
    } else {
      filtered.sort((a, b) => {
        // Sentiment match priority
        if (query.targetSentiment) {
          const aMatch = a.sentiment === query.targetSentiment ? 1 : 0;
          const bMatch = b.sentiment === query.targetSentiment ? 1 : 0;
          if (aMatch !== bMatch) return bMatch - aMatch;
        }
        const timeA = a.publishedAt?.getTime() ?? 0;
        const timeB = b.publishedAt?.getTime() ?? 0;
        return timeB - timeA;
      });
    }

    // Group and limit per aspect
    const limitPerAspect = query.limitPerAspect ?? 1;
    const aspectCounts = new Map<string, number>();
    const result: EvidenceSnippet[] = [];

    for (const snippet of filtered) {
      const count = aspectCounts.get(snippet.aspect) ?? 0;
      if (count < limitPerAspect) {
        result.push(snippet);
        aspectCounts.set(snippet.aspect, count + 1);
      }
    }

    return result;
  }

  async findPendingReviewsForEmbedding(
    limit: number,
  ): Promise<PendingReviewForEmbedding[]> {
    return this.pendingReviews.slice(0, limit);
  }

  async pruneExcessSnippets(maxPerDeviceAspect: number): Promise<number> {
    const grouped = new Map<string, EvidenceSnippet[]>();
    for (const s of this.snippets) {
      const key = `${s.deviceId}:${s.aspect}`;
      const list = grouped.get(key) ?? [];
      list.push(s);
      grouped.set(key, list);
    }

    let deleted = 0;
    this.snippets.length = 0;

    for (const list of grouped.values()) {
      // Sort newest first
      list.sort(
        (a, b) =>
          (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
      );
      const kept = list.slice(0, maxPerDeviceAspect);
      deleted += list.length - kept.length;
      this.snippets.push(...kept);
    }

    return deleted;
  }

  async countSnippets(): Promise<number> {
    return this.snippets.length;
  }
}
