import type { Logger } from "../../../shared/logging/logger";
import type { EmbeddingService } from "../domain/embedding.service";
import type { EvidenceRepository } from "../domain/evidence.repository";
import type { EvidenceSnippetDraft } from "../domain/snippet";
import { chunkReviewContent } from "../domain/text-chunker";

export interface EmbedPendingReviewsDeps {
  readonly evidenceRepository: EvidenceRepository;
  readonly embeddingService: EmbeddingService;
  readonly logger: Logger;
  readonly batchSize?: number;
  readonly maxSnippetsPerAspect?: number;
}

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_MAX_SNIPPETS_PER_ASPECT = 20;

export interface EmbedPendingResult {
  readonly processedReviews: number;
  readonly snippetsSaved: number;
  readonly snippetsPruned: number;
}

export class EmbedPendingReviewsUseCase {
  private readonly batchSize: number;
  private readonly maxSnippetsPerAspect: number;

  constructor(private readonly deps: EmbedPendingReviewsDeps) {
    this.batchSize = deps.batchSize ?? DEFAULT_BATCH_SIZE;
    this.maxSnippetsPerAspect =
      deps.maxSnippetsPerAspect ?? DEFAULT_MAX_SNIPPETS_PER_ASPECT;
  }

  async execute(): Promise<EmbedPendingResult> {
    const reviews =
      await this.deps.evidenceRepository.findPendingReviewsForEmbedding(
        this.batchSize,
      );

    if (reviews.length === 0) {
      return { processedReviews: 0, snippetsSaved: 0, snippetsPruned: 0 };
    }

    const allDrafts: EvidenceSnippetDraft[] = [];

    for (const review of reviews) {
      const drafts = chunkReviewContent({
        reviewId: review.id,
        deviceId: review.deviceId,
        provider: review.provider,
        content: review.content,
        publishedAt: review.publishedAt,
        knownAspects: review.knownAspects,
      });
      allDrafts.push(...drafts);
    }

    let snippetsSaved = 0;

    if (allDrafts.length > 0) {
      const texts = allDrafts.map((d) => d.text);
      const embeddings = await this.deps.embeddingService.embed(texts);

      const snippetsWithEmbeddings = allDrafts.map((draft, idx) => ({
        ...draft,
        embedding: embeddings[idx],
      }));

      await this.deps.evidenceRepository.saveSnippets(snippetsWithEmbeddings);
      snippetsSaved = snippetsWithEmbeddings.length;
    }

    // Prune excess to keep database within storage bounds
    const snippetsPruned =
      await this.deps.evidenceRepository.pruneExcessSnippets(
        this.maxSnippetsPerAspect,
      );

    this.deps.logger.info("evidence.embedded", {
      processedReviews: reviews.length,
      snippetsSaved,
      snippetsPruned,
    });

    return {
      processedReviews: reviews.length,
      snippetsSaved,
      snippetsPruned,
    };
  }
}
