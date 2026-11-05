export interface EvidenceSnippet {
  readonly id: string;
  readonly reviewId: string;
  readonly chunkIndex: number;
  readonly deviceId: string;
  readonly aspect: string;
  readonly text: string;
  readonly sentiment: "positive" | "negative" | "neutral";
  readonly provider: string;
  readonly publishedAt?: Date;
  readonly embedding?: number[];
  readonly createdAt?: Date;
}

export interface EvidenceSnippetDraft {
  readonly reviewId: string;
  readonly chunkIndex: number;
  readonly deviceId: string;
  readonly aspect: string;
  readonly text: string;
  readonly sentiment: "positive" | "negative" | "neutral";
  readonly provider: string;
  readonly publishedAt?: Date;
  readonly embedding?: number[];
}

export interface FindEvidenceQuery {
  readonly deviceId: string;
  readonly aspects?: string[];
  readonly limitPerAspect?: number;
  readonly targetSentiment?: "positive" | "negative" | "neutral";
  readonly queryEmbedding?: number[];
}

export interface FormattedEvidenceItem {
  readonly aspect: string;
  readonly text: string;
  readonly provider: string;
  readonly publishedAt?: Date;
  readonly quote: string;
}

