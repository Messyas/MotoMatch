import type { CatalogApi } from "../../catalog";
import { DEFAULT_ASPECT_WEIGHTS } from "../domain/aspect";
import { applyHardConstraints } from "../domain/hard-constraints";
import { type ScoredDeviceResult, scoreDeviceMaut } from "../domain/maut-scorer";
import { applyParetoFilter, type ParetoDroppedItem, type ScoredCandidate } from "../domain/pareto-filter";
import { type CatalogStats, computeCatalogStats } from "../domain/percentile-normalizer";
import type { RecommendationQuery } from "../domain/recommendation-query.builder";

export interface RecommendUseCaseDeps {
  readonly catalogApi: CatalogApi;
}

export interface RecommendationResult {
  readonly items: readonly ScoredDeviceResult[];
  readonly dropped: readonly ParetoDroppedItem[];
  readonly relaxationNotice?: string;
  readonly totalEvaluated: number;
}

export class RecommendUseCase {
  private cachedStats?: { stats: CatalogStats; expiresAt: number };

  constructor(private readonly deps: RecommendUseCaseDeps) {}

  private async getCatalogStats(activeDevices: Parameters<typeof computeCatalogStats>[0]): Promise<CatalogStats> {
    const now = Date.now();
    if (this.cachedStats && this.cachedStats.expiresAt > now) {
      return this.cachedStats.stats;
    }

    const stats = computeCatalogStats(activeDevices);
    // Cache for 5 minutes
    this.cachedStats = { stats, expiresAt: now + 5 * 60 * 1000 };
    return stats;
  }

  async execute(query: RecommendationQuery): Promise<RecommendationResult> {
    const catalogResult = await this.deps.catalogApi.listActiveDevices({ limit: 500 });
    const allDevices = catalogResult.items;

    if (allDevices.length === 0) {
      return {
        items: [],
        dropped: [],
        totalEvaluated: 0,
      };
    }

    const stats = await this.getCatalogStats(allDevices);

    // 1. Apply hard constraints
    const { filtered: eligibleDevices, relaxationNotice } = applyHardConstraints(
      allDevices,
      query.constraints,
    );

    if (eligibleDevices.length === 0) {
      return {
        items: [],
        dropped: [],
        relaxationNotice,
        totalEvaluated: allDevices.length,
      };
    }

    // 2. Score with MAUT
    const weights = query.weights ?? DEFAULT_ASPECT_WEIGHTS;
    const scoredList: ScoredDeviceResult[] = eligibleDevices.map((device) =>
      scoreDeviceMaut({
        device,
        weights,
        catalogStats: stats,
      }),
    );

    // 3. Apply Pareto filter
    const paretoCandidates: ScoredCandidate[] = scoredList.map((s) => ({
      device: s.device,
      aspectScores: s.aspectScores,
      utility: s.utility,
    }));

    const { nonDominated, dropped } = applyParetoFilter(paretoCandidates, weights);

    // 4. Map back to full scored results and rank by utility descending
    const nonDominatedIds = new Set(nonDominated.map((nd) => nd.device.id));
    const finalCandidates = scoredList.filter((s) => nonDominatedIds.has(s.device.id));

    finalCandidates.sort((a, b) => b.utility - a.utility);

    // 5. Slice to requested limit (e.g. top 3)
    const items = finalCandidates.slice(0, query.limit);

    return {
      items,
      dropped,
      relaxationNotice,
      totalEvaluated: allDevices.length,
    };
  }
}
