import type { EmbeddingService } from "../domain/embedding.service";
import type { EvidenceRepository } from "../domain/evidence.repository";
import type {
  EvidenceSnippet,
  FormattedEvidenceItem,
} from "../domain/snippet";

export interface FindEvidenceDeps {
  readonly evidenceRepository: EvidenceRepository;
  readonly embeddingService?: EmbeddingService;
}

export interface FindEvidenceInput {
  readonly deviceId: string;
  readonly aspects?: string[];
  readonly limitPerAspect?: number;
  readonly targetSentiment?: "positive" | "negative" | "neutral";
  readonly queryText?: string;
}

const MONTH_NAMES_PT: Record<number, string> = {
  0: "jan",
  1: "fev",
  2: "mar",
  3: "abr",
  4: "mai",
  5: "jun",
  6: "jul",
  7: "ago",
  8: "set",
  9: "out",
  10: "nov",
  11: "dez",
};

function formatQuote(snippet: EvidenceSnippet): string {
  const providerDisplay =
    snippet.provider.toLowerCase() === "youtube" ? "YouTube" : snippet.provider;

  let datePart = "";
  if (snippet.publishedAt) {
    const month = MONTH_NAMES_PT[snippet.publishedAt.getUTCMonth()] ?? "";
    const year = snippet.publishedAt.getUTCFullYear();
    datePart = `, ${month}/${year}`;
  }

  return `"${snippet.text}" (${providerDisplay}${datePart})`;
}

export class FindEvidenceUseCase {
  constructor(private readonly deps: FindEvidenceDeps) {}

  async execute(input: FindEvidenceInput): Promise<FormattedEvidenceItem[]> {
    let queryEmbedding: number[] | undefined;

    if (input.queryText && this.deps.embeddingService) {
      const embeddings = await this.deps.embeddingService.embed([
        input.queryText,
      ]);
      queryEmbedding = embeddings[0];
    }

    const snippets = await this.deps.evidenceRepository.findEvidence({
      deviceId: input.deviceId,
      aspects: input.aspects,
      limitPerAspect: input.limitPerAspect ?? 1,
      targetSentiment: input.targetSentiment,
      queryEmbedding,
    });

    return snippets.map((s) => ({
      aspect: s.aspect,
      text: s.text,
      provider: s.provider,
      publishedAt: s.publishedAt,
      quote: formatQuote(s),
    }));
  }

  async executeAsMap(
    input: FindEvidenceInput,
  ): Promise<Record<string, FormattedEvidenceItem>> {
    const list = await this.execute(input);
    const map: Record<string, FormattedEvidenceItem> = {};
    for (const item of list) {
      if (!map[item.aspect]) {
        map[item.aspect] = item;
      }
    }
    return map;
  }
}
