export type FeedbackKind = "up" | "down" | "detail" | "compare";

export interface SearchEvent {
  readonly id: string;
  readonly sessionId: string;
  readonly intentSig: string;
  readonly criteria: Record<string, unknown>;
  readonly discarded: Record<string, unknown>;
  readonly resultIds: string[];
  readonly createdAt: Date;
}

export interface FeedbackEvent {
  readonly id: string;
  readonly sessionId: string;
  readonly deviceId: string;
  readonly intentSig: string;
  readonly kind: FeedbackKind;
  readonly createdAt: Date;
}

export interface CollectiveScore {
  readonly deviceId: string;
  readonly intentSig: string;
  readonly alpha: number;
  readonly beta: number;
  readonly updatedAt: Date;
}

export interface DailyRollup {
  readonly day: string; // YYYY-MM-DD
  readonly metric: string;
  readonly dim: string;
  readonly value: number;
}

export interface UsageDashboardResult {
  readonly dailySearches: Array<{ day: string; count: number }>;
  readonly thumbsRatio: { up: number; down: number; upPercent: number };
  readonly topRequestedCriteria: Array<{ criteria: string; count: number }>;
  readonly topRecommendedDevices: Array<{ deviceId: string; count: number }>;
  readonly discardedCriteria: Array<{ criteria: string; count: number }>;
}

export interface RetentionSweepResult {
  readonly deletedSearches: number;
  readonly deletedFeedbacks: number;
  readonly decayedCollectiveScores: number;
  readonly storageUsageWarning?: boolean;
}

export interface AnalyticsRepository {
  recordSearchEvent(event: SearchEvent): Promise<void>;
  recordFeedbackEvent(event: FeedbackEvent): Promise<{ recorded: boolean }>;
  getCollectiveScore(
    deviceId: string,
    intentSig: string,
  ): Promise<CollectiveScore | null>;
  incrementCollectiveScore(input: {
    deviceId: string;
    intentSig: string;
    deltaAlpha: number;
    deltaBeta: number;
    now: Date;
  }): Promise<void>;
  saveDailyRollups(rollups: DailyRollup[]): Promise<void>;
  getUsageDashboard(days?: number): Promise<UsageDashboardResult>;
  runDailyRollups(day: string): Promise<number>;
  runRetentionSweep(options: {
    retentionDays: number;
    now: Date;
  }): Promise<RetentionSweepResult>;
}

