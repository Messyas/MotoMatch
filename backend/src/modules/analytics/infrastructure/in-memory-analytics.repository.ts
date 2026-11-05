import type {
  AnalyticsRepository,
  CollectiveScore,
  DailyRollup,
  FeedbackEvent,
  RetentionSweepResult,
  SearchEvent,
  UsageDashboardResult,
} from "../domain/analytics.repository";

export class InMemoryAnalyticsRepository implements AnalyticsRepository {
  private searches: SearchEvent[] = [];
  private feedbacks: FeedbackEvent[] = [];
  private collectiveScores = new Map<string, CollectiveScore>();
  private rollups = new Map<string, DailyRollup>();

  async recordSearchEvent(event: SearchEvent): Promise<void> {
    this.searches.push(event);
  }

  async recordFeedbackEvent(
    event: FeedbackEvent,
  ): Promise<{ recorded: boolean }> {
    const dayStr = event.createdAt.toISOString().slice(0, 10);
    // Anti-abuse check (PLANO_ATUALIZACAO §3.6)
    const duplicate = this.feedbacks.some(
      (f) =>
        f.sessionId === event.sessionId &&
        f.deviceId === event.deviceId &&
        f.intentSig === event.intentSig &&
        f.createdAt.toISOString().slice(0, 10) === dayStr,
    );

    if (duplicate) {
      return { recorded: false };
    }

    this.feedbacks.push(event);
    return { recorded: true };
  }

  async getCollectiveScore(
    deviceId: string,
    intentSig: string,
  ): Promise<CollectiveScore | null> {
    return this.collectiveScores.get(`${deviceId}:${intentSig}`) ?? null;
  }

  async incrementCollectiveScore(input: {
    deviceId: string;
    intentSig: string;
    deltaAlpha: number;
    deltaBeta: number;
    now: Date;
  }): Promise<void> {
    const key = `${input.deviceId}:${input.intentSig}`;
    const current = this.collectiveScores.get(key) ?? {
      deviceId: input.deviceId,
      intentSig: input.intentSig,
      alpha: 1.0,
      beta: 1.0,
      updatedAt: input.now,
    };

    this.collectiveScores.set(key, {
      ...current,
      alpha: Number((current.alpha + input.deltaAlpha).toFixed(4)),
      beta: Number((current.beta + input.deltaBeta).toFixed(4)),
      updatedAt: input.now,
    });
  }

  async saveDailyRollups(rollups: DailyRollup[]): Promise<void> {
    for (const r of rollups) {
      this.rollups.set(`${r.day}:${r.metric}:${r.dim}`, r);
    }
  }

  async runDailyRollups(day: string): Promise<number> {
    // Computes searches count for the day
    const daySearches = this.searches.filter(
      (s) => s.createdAt.toISOString().slice(0, 10) === day,
    );
    const dayFeedbacks = this.feedbacks.filter(
      (f) => f.createdAt.toISOString().slice(0, 10) === day,
    );

    const rollups: DailyRollup[] = [
      {
        day,
        metric: "searches_total",
        dim: "all",
        value: daySearches.length,
      },
      {
        day,
        metric: "feedbacks_thumbs_up",
        dim: "all",
        value: dayFeedbacks.filter((f) => f.kind === "up").length,
      },
      {
        day,
        metric: "feedbacks_thumbs_down",
        dim: "all",
        value: dayFeedbacks.filter((f) => f.kind === "down").length,
      },
    ];

    await this.saveDailyRollups(rollups);
    return rollups.length;
  }

  async getUsageDashboard(days = 14): Promise<UsageDashboardResult> {
    const dailyMap = new Map<string, number>();
    for (const s of this.searches) {
      const day = s.createdAt.toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
    }

    const dailySearches = Array.from(dailyMap.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day))
      .slice(-days);

    let up = 0;
    let down = 0;
    for (const f of this.feedbacks) {
      if (f.kind === "up") up++;
      if (f.kind === "down") down++;
    }

    const totalThumbs = up + down;
    const upPercent = totalThumbs > 0 ? Math.round((up / totalThumbs) * 100) : 100;

    const recommendedMap = new Map<string, number>();
    for (const s of this.searches) {
      for (const id of s.resultIds) {
        recommendedMap.set(id, (recommendedMap.get(id) ?? 0) + 1);
      }
    }

    const topRecommendedDevices = Array.from(recommendedMap.entries())
      .map(([deviceId, count]) => ({ deviceId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      dailySearches,
      thumbsRatio: { up, down, upPercent },
      topRequestedCriteria: [],
      topRecommendedDevices,
      discardedCriteria: [],
    };
  }

  async runRetentionSweep(options: {
    retentionDays: number;
    now: Date;
  }): Promise<RetentionSweepResult> {
    const cutoff = new Date(
      options.now.getTime() - options.retentionDays * 86400000,
    );

    const initialSearches = this.searches.length;
    this.searches = this.searches.filter((s) => s.createdAt >= cutoff);
    const deletedSearches = initialSearches - this.searches.length;

    const initialFeedbacks = this.feedbacks.length;
    this.feedbacks = this.feedbacks.filter((f) => f.createdAt >= cutoff);
    const deletedFeedbacks = initialFeedbacks - this.feedbacks.length;

    // Monthly decay of collective score (PLANO_ATUALIZACAO §5.4: alpha, beta * 0.9)
    let decayedCount = 0;
    for (const [key, cs] of this.collectiveScores.entries()) {
      this.collectiveScores.set(key, {
        ...cs,
        alpha: Number((cs.alpha * 0.9).toFixed(4)),
        beta: Number((cs.beta * 0.9).toFixed(4)),
        updatedAt: options.now,
      });
      decayedCount++;
    }

    return {
      deletedSearches,
      deletedFeedbacks,
      decayedCollectiveScores: decayedCount,
      storageUsageWarning: false,
    };
  }
}

