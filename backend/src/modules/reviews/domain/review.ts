export type ReviewProvider = "youtube" | "mercadolivre" | "csv" | "manual";

export type ReviewStatus =
  | "pending"
  | "analyzing"
  | "irrelevant"
  | "analyzed"
  | "failed";

export type VideoPhase = "launch" | "mid" | "long" | "unknown";

export interface ReviewSourceLink {
  readonly id: string;
  readonly deviceId: string;
  readonly provider: ReviewProvider;
  readonly externalRef: string;
  readonly cursor: string | null;
  readonly nextDueAt: Date;
  readonly intervalDays: number;
  readonly lastNewCount: number;
}

export interface Review {
  readonly id: string;
  readonly deviceId: string;
  readonly provider: ReviewProvider;
  readonly externalRef: string;
  readonly authorHash: string | null;
  readonly rating: number | null;
  readonly content: string;
  readonly publishedAt: Date | null;
  readonly videoPhase: VideoPhase;
  readonly daysSinceLaunch: number | null;
  readonly status: ReviewStatus;
  readonly leaseUntil: Date | null;
  readonly attempts: number;
  readonly nextAttemptAt: Date | null;
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
  readonly analyzedAt: Date | null;
  readonly aggregatedAt: Date | null;
  readonly contentPurgedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateReviewInput {
  readonly id?: string;
  readonly deviceId: string;
  readonly provider: ReviewProvider;
  readonly externalRef: string;
  readonly authorHash?: string | null;
  readonly rating?: number | null;
  readonly content: string;
  readonly publishedAt?: Date | null;
  readonly videoPhase?: VideoPhase;
  readonly daysSinceLaunch?: number | null;
  readonly status?: ReviewStatus;
  readonly leaseUntil?: Date | null;
  readonly attempts?: number;
  readonly nextAttemptAt?: Date | null;
  readonly analyzedAt?: Date | null;
  readonly aggregatedAt?: Date | null;
}

export function createReview(
  input: CreateReviewInput,
  options: { now?: Date } = {},
): Review {
  const now = options.now ?? new Date();
  return {
    id: input.id ?? crypto.randomUUID(),
    deviceId: input.deviceId,
    provider: input.provider,
    externalRef: input.externalRef,
    authorHash: input.authorHash ?? null,
    rating: input.rating ?? null,
    content: input.content,
    publishedAt: input.publishedAt ?? null,
    videoPhase: input.videoPhase ?? "unknown",
    daysSinceLaunch: input.daysSinceLaunch ?? null,
    status: input.status ?? "pending",
    leaseUntil: input.leaseUntil ?? null,
    attempts: input.attempts ?? 0,
    nextAttemptAt: input.nextAttemptAt ?? null,
    errorCode: null,
    errorMessage: null,
    analyzedAt: input.analyzedAt ?? null,
    aggregatedAt: input.aggregatedAt ?? null,
    contentPurgedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}
