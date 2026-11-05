import type {
  EvidenceSnippet,
  EvidenceSnippetDraft,
  FindEvidenceQuery,
} from "./snippet";

export interface PendingReviewForEmbedding {
  readonly id: string;
  readonly deviceId: string;
  readonly provider: string;
  readonly content: string;
  readonly publishedAt?: Date;
  readonly knownAspects?: string[];
}

export interface EvidenceRepository {
  saveSnippets(snippets: EvidenceSnippetDraft[]): Promise<void>;
  findEvidence(query: FindEvidenceQuery): Promise<EvidenceSnippet[]>;
  findPendingReviewsForEmbedding(
    limit: number,
  ): Promise<PendingReviewForEmbedding[]>;
  pruneExcessSnippets(maxPerDeviceAspect: number): Promise<number>;
  countSnippets(): Promise<number>;
}
