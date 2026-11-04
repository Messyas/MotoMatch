import { VIDEO_TITLE_TERMS } from "../locales/pt-BR/review-vocabulary";
import { findTerms, normalize, titleMatchesModel } from "./text";

export type Phase = "launch" | "mid" | "long";
const PHASES: readonly Phase[] = ["launch", "mid", "long"];

export interface VideoCandidate {
  id: string;
  title: string;
  channelId: string;
  channelTitle?: string;
  publishedAt: string; // ISO 8601
  durationSec: number | null;
  viewCount: number;
  commentCount: number;
  commentsDisabled?: boolean;
  /** Link provided by the admin when registering the device. */
  isManual?: boolean;
}

export interface ScoredVideo extends VideoCandidate {
  score: number;
  phase: Phase;
  monthsSinceLaunch: number;
  isRejected: boolean;
  reasons: string[];
}

export interface SelectionOptions {
  minDurationSec: number;
  perPhase: Record<Phase, number>;
  maxTotal: number;
  maxPerChannel: number;
  launchPhaseMaxMonths: number;
  midPhaseMaxMonths: number;
}

export const DEFAULT_SELECTION_OPTIONS: SelectionOptions = {
  minDurationSec: 180,
  perPhase: { launch: 2, mid: 2, long: 1 },
  maxTotal: 5,
  maxPerChannel: 1,
  launchPhaseMaxMonths: 2,
  midPhaseMaxMonths: 9,
};

/** Relative weights of each scoring signal. Comments matter more than views: we want opinions. */
const SCORE_WEIGHTS = {
  perReviewTerm: 1,
  maxReviewTerms: 3,
  longTermBonus: 1.5,
  nonReviewPenalty: -3,
  unboxingOnlyPenalty: -1.5,
  comparisonPenalty: -0.5,
  commentsLog: 1.2,
  viewsLog: 0.3,
  manualBonus: 100,
} as const;

const DAYS_PER_MONTH = 30.44;
const MS_PER_DAY = 86_400_000;

export function monthsBetween(fromIso: string, toIso: string): number {
  return (Date.parse(toIso) - Date.parse(fromIso)) / (MS_PER_DAY * DAYS_PER_MONTH);
}

export function phaseOf(months: number, options: SelectionOptions = DEFAULT_SELECTION_OPTIONS): Phase {
  if (months <= options.launchPhaseMaxMonths) return "launch";
  if (months <= options.midPhaseMaxMonths) return "mid";
  return "long";
}

/** Launch reference: the given date, or the oldest video that matches the model. */
export function inferLaunchDate(input: { videos: VideoCandidate[]; model: string; knownLaunchDate?: string }): string | null {
  if (input.knownLaunchDate) return input.knownLaunchDate;
  const matchingDates = input.videos
    .filter((video) => titleMatchesModel(video.title, input.model))
    .map((video) => video.publishedAt)
    .sort();
  return matchingDates[0] ?? null;
}

export interface ScoreVideoInput {
  video: VideoCandidate;
  model: string;
  launchDate: string;
  options?: SelectionOptions;
}

function rejectionReasons({ video, model, options }: Required<Omit<ScoreVideoInput, "launchDate">>): string[] {
  const reasons: string[] = [];
  if (!video.isManual && !titleMatchesModel(video.title, model)) reasons.push("title is not about this exact model");
  if (video.commentsDisabled) reasons.push("comments are disabled");
  if (!video.isManual && video.durationSec !== null && video.durationSec < options.minDurationSec) {
    reasons.push(`too short (${video.durationSec}s)`);
  }
  return reasons;
}

function titleSignals(title: string): { score: number; reasons: string[] } {
  const normalized = normalize(title);
  const reviewTerms = findTerms(normalized, VIDEO_TITLE_TERMS.review);
  const nonReviewTerms = findTerms(normalized, VIDEO_TITLE_TERMS.nonReview);
  const isUnboxingOnly = findTerms(normalized, VIDEO_TITLE_TERMS.unboxing).length > 0 && reviewTerms.length === 0;
  const isLongTerm = findTerms(normalized, VIDEO_TITLE_TERMS.longTerm).length > 0;
  const isComparison = findTerms(normalized, VIDEO_TITLE_TERMS.comparison).length > 0;

  let score = Math.min(SCORE_WEIGHTS.maxReviewTerms, reviewTerms.length) * SCORE_WEIGHTS.perReviewTerm;
  const reasons: string[] = [];
  if (reviewTerms.length) reasons.push(`review terms: ${reviewTerms.join(", ")}`);
  if (isLongTerm) {
    score += SCORE_WEIGHTS.longTermBonus;
    reasons.push("long-term usage");
  }
  if (nonReviewTerms.length) {
    score += SCORE_WEIGHTS.nonReviewPenalty;
    reasons.push(`not a review: ${nonReviewTerms.join(", ")}`);
  }
  if (isUnboxingOnly) {
    score += SCORE_WEIGHTS.unboxingOnlyPenalty;
    reasons.push("unboxing without review");
  }
  if (isComparison) {
    score += SCORE_WEIGHTS.comparisonPenalty;
    reasons.push("comparison (comments mix devices)");
  }
  return { score, reasons };
}

export function scoreVideo({ video, model, launchDate, options = DEFAULT_SELECTION_OPTIONS }: ScoreVideoInput): ScoredVideo {
  const months = Math.max(0, monthsBetween(launchDate, video.publishedAt));
  const rejected = rejectionReasons({ video, model, options });
  const title = titleSignals(video.title);

  let score = title.score;
  score += Math.log10(1 + video.commentCount) * SCORE_WEIGHTS.commentsLog;
  score += Math.log10(1 + video.viewCount) * SCORE_WEIGHTS.viewsLog;
  const reasons = [...rejected, ...title.reasons];
  if (video.isManual) {
    score += SCORE_WEIGHTS.manualBonus;
    reasons.push("link provided at registration");
  }

  return {
    ...video,
    score: Number(score.toFixed(3)),
    phase: phaseOf(months, options),
    monthsSinceLaunch: Number(months.toFixed(1)),
    isRejected: rejected.length > 0,
    reasons,
  };
}

export interface SelectVideosInput {
  candidates: VideoCandidate[];
  model: string;
  knownLaunchDate?: string;
  options?: Partial<SelectionOptions>;
}

export interface SelectionResult {
  launchDate: string | null;
  selected: ScoredVideo[];
  scored: ScoredVideo[];
}

/** Tracks picks while enforcing channel diversity and the total cap. */
class SelectionBasket {
  readonly picked: ScoredVideo[] = [];
  private readonly perChannel = new Map<string, number>();

  constructor(private readonly options: SelectionOptions) {}

  get isFull(): boolean {
    return this.picked.length >= this.options.maxTotal;
  }

  countInPhase(phase: Phase): number {
    return this.picked.filter((video) => video.phase === phase).length;
  }

  canTake(video: ScoredVideo): boolean {
    const channelCount = this.perChannel.get(video.channelId) ?? 0;
    const alreadyPicked = this.picked.some((picked) => picked.id === video.id);
    return !this.isFull && !alreadyPicked && channelCount < this.options.maxPerChannel && video.score > 0;
  }

  take(video: ScoredVideo): void {
    this.picked.push(video);
    this.perChannel.set(video.channelId, (this.perChannel.get(video.channelId) ?? 0) + 1);
  }
}

/**
 * Picks videos mixing lifecycle phases (launch / mid / long term) instead of just the newest.
 * Order: manual links first, then the best of each phase (with channel diversity),
 * then any remaining slots by overall score.
 */
export function selectVideos({ candidates, model, knownLaunchDate, options: overrides = {} }: SelectVideosInput): SelectionResult {
  const options: SelectionOptions = {
    ...DEFAULT_SELECTION_OPTIONS,
    ...overrides,
    perPhase: { ...DEFAULT_SELECTION_OPTIONS.perPhase, ...overrides.perPhase },
  };
  const unique = [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()];
  const launchDate = inferLaunchDate({ videos: unique, model, knownLaunchDate });
  if (!launchDate) {
    const manualOnly = unique
      .filter((video) => video.isManual)
      .map((video) => scoreVideo({ video, model, launchDate: video.publishedAt, options }));
    return { launchDate: null, selected: manualOnly, scored: [] };
  }

  const scored = unique.map((video) => scoreVideo({ video, model, launchDate, options })).sort((a, b) => b.score - a.score);
  const eligible = scored.filter((video) => !video.isRejected);
  const basket = new SelectionBasket(options);

  for (const video of eligible.filter((candidate) => candidate.isManual)) basket.take(video);
  for (const phase of PHASES) {
    for (const video of eligible) {
      if (basket.countInPhase(phase) >= options.perPhase[phase]) break;
      if (video.phase === phase && basket.canTake(video)) basket.take(video);
    }
  }
  for (const video of eligible) {
    if (basket.canTake(video)) basket.take(video);
  }
  return { launchDate, selected: basket.picked, scored };
}
