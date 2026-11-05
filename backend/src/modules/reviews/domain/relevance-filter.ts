import {
  ASPECT_TERMS,
  COMMENT_PATTERNS,
  type ReviewAspectType,
} from "../../../locales/pt-BR/review-vocabulary";
import { findAspects, normalizeText } from "./text-normalizer";

export interface CommentVerdict {
  readonly isRelevant: boolean;
  readonly aspects: ReviewAspectType[];
  readonly isOwnerReport: boolean;
  readonly weight: number;
  readonly reasons: string[];
}

export interface CommentFilterOptions {
  readonly minChars: number;
  readonly maxChars: number;
}

export const DEFAULT_COMMENT_FILTER_OPTIONS: CommentFilterOptions = {
  minChars: 20,
  maxChars: 3000,
};

const WEIGHTS = {
  baseline: 1.0,
  ownerBonus: 0.5,
  richCommentBonus: 0.2,
  richCommentMinAspects: 3,
} as const;

export function evaluateComment(
  text: string,
  options: CommentFilterOptions = DEFAULT_COMMENT_FILTER_OPTIONS,
): CommentVerdict {
  const raw = (text ?? "").trim();
  const normalized = normalizeText(raw);

  if (raw.length < options.minChars) {
    return {
      isRelevant: false,
      aspects: [],
      isOwnerReport: false,
      weight: 0,
      reasons: ["too short"],
    };
  }

  if (
    COMMENT_PATTERNS.spam.test(normalized) ||
    COMMENT_PATTERNS.spam.test(raw.toLowerCase())
  ) {
    return {
      isRelevant: false,
      aspects: [],
      isOwnerReport: false,
      weight: 0,
      reasons: ["spam, link or engagement bait"],
    };
  }

  if (COMMENT_PATTERNS.creatorPraiseOnly.test(normalized)) {
    return {
      isRelevant: false,
      aspects: [],
      isOwnerReport: false,
      weight: 0,
      reasons: ["praise for the creator only"],
    };
  }

  const aspects = findAspects(normalized);
  const isOwnerReport = COMMENT_PATTERNS.ownership.test(normalized);

  if (!aspects.length) {
    return {
      isRelevant: false,
      aspects: [],
      isOwnerReport,
      weight: 0,
      reasons: [
        isOwnerReport
          ? "owner report without any device aspect"
          : "no device aspect mentioned",
      ],
    };
  }

  const reasons: string[] = [];
  if (raw.length > options.maxChars) {
    reasons.push("long (will be truncated for analysis)");
  }

  let weight = WEIGHTS.baseline;
  if (isOwnerReport) {
    weight += WEIGHTS.ownerBonus;
    reasons.push("owner report");
  }

  if (aspects.length >= WEIGHTS.richCommentMinAspects) {
    weight += WEIGHTS.richCommentBonus;
  }
  reasons.push(`aspects: ${aspects.join(", ")}`);

  return {
    isRelevant: true,
    aspects,
    isOwnerReport,
    weight: Number(weight.toFixed(2)),
    reasons,
  };
}
