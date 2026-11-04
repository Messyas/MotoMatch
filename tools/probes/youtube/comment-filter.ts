import { ASPECT_TERMS, type Aspect, COMMENT_PATTERNS } from "../locales/pt-BR/review-vocabulary";
import { findTerms, normalize } from "./text";

export interface CommentVerdict {
  isRelevant: boolean;
  aspects: Aspect[];
  isOwnerReport: boolean;
  /** 0 when irrelevant; 1 baseline; higher for owner reports and rich comments. */
  weight: number;
  reasons: string[];
}

export interface CommentFilterOptions {
  minChars: number;
  maxChars: number;
}

export const DEFAULT_COMMENT_FILTER_OPTIONS: CommentFilterOptions = { minChars: 25, maxChars: 3000 };

const WEIGHTS = { baseline: 1, ownerBonus: 0.5, richCommentBonus: 0.2, richCommentMinAspects: 3 } as const;

const irrelevant = (reason: string, partial: Partial<CommentVerdict> = {}): CommentVerdict => ({
  isRelevant: false,
  aspects: [],
  isOwnerReport: false,
  weight: 0,
  reasons: [reason],
  ...partial,
});

export function evaluateComment(text: string, options: CommentFilterOptions = DEFAULT_COMMENT_FILTER_OPTIONS): CommentVerdict {
  const raw = (text ?? "").trim();
  const normalized = normalize(raw);

  if (raw.length < options.minChars) return irrelevant("too short");
  if (COMMENT_PATTERNS.spam.test(normalized) || COMMENT_PATTERNS.spam.test(raw.toLowerCase())) return irrelevant("spam, link or engagement bait");
  if (COMMENT_PATTERNS.creatorPraiseOnly.test(normalized)) return irrelevant("praise for the creator only");

  const aspects = (Object.keys(ASPECT_TERMS) as Aspect[]).filter((aspect) => findTerms(normalized, ASPECT_TERMS[aspect]).length > 0);
  const isOwnerReport = COMMENT_PATTERNS.ownership.test(normalized);
  if (!aspects.length) {
    return irrelevant(isOwnerReport ? "owner report without any device aspect" : "no device aspect mentioned", { isOwnerReport });
  }

  const reasons = raw.length > options.maxChars ? ["long (will be truncated for analysis)"] : [];
  let weight: number = WEIGHTS.baseline;
  if (isOwnerReport) {
    weight += WEIGHTS.ownerBonus;
    reasons.push("owner report");
  }
  if (aspects.length >= WEIGHTS.richCommentMinAspects) weight += WEIGHTS.richCommentBonus;
  reasons.push(`aspects: ${aspects.join(", ")}`);

  return { isRelevant: true, aspects, isOwnerReport, weight: Number(weight.toFixed(2)), reasons };
}
