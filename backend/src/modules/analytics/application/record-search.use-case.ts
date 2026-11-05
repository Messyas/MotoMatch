import type { Clock } from "../../../shared/time/clock";
import type { Logger } from "../../../shared/logging/logger";
import type { AnalyticsRepository } from "../domain/analytics.repository";

export interface RecordSearchDeps {
  readonly analyticsRepository: AnalyticsRepository;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface RecordSearchInput {
  readonly sessionId: string;
  readonly intentSig: string;
  readonly criteria?: Record<string, unknown>;
  readonly discarded?: Record<string, unknown>;
  readonly resultIds: string[];
}

export class RecordSearchUseCase {
  constructor(private readonly deps: RecordSearchDeps) {}

  async execute(input: RecordSearchInput): Promise<void> {
    const now = this.deps.clock.now();

    await this.deps.analyticsRepository.recordSearchEvent({
      id: crypto.randomUUID(),
      sessionId: input.sessionId,
      intentSig: input.intentSig,
      criteria: input.criteria ?? {},
      discarded: input.discarded ?? {},
      resultIds: input.resultIds,
      createdAt: now,
    });

    this.deps.logger.info("analytics.search_recorded", {
      intentSig: input.intentSig,
      resultCount: input.resultIds.length,
    });
  }
}
