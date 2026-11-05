import type { Clock } from "../../../shared/time/clock";
import type { Logger } from "../../../shared/logging/logger";
import type { EventBus } from "../../../shared/events/event-bus";
import type {
  AnalyticsRepository,
  FeedbackKind,
} from "../domain/analytics.repository";

export interface RecordFeedbackDeps {
  readonly analyticsRepository: AnalyticsRepository;
  readonly eventBus?: EventBus;
  readonly clock: Clock;
  readonly logger: Logger;
}

export interface RecordFeedbackInput {
  readonly sessionId: string;
  readonly deviceId: string;
  readonly intentSig: string;
  readonly kind: FeedbackKind;
}

export interface RecordFeedbackResult {
  readonly recorded: boolean;
}

export class RecordFeedbackUseCase {
  constructor(private readonly deps: RecordFeedbackDeps) {}

  async execute(input: RecordFeedbackInput): Promise<RecordFeedbackResult> {
    const now = this.deps.clock.now();

    const { recorded } =
      await this.deps.analyticsRepository.recordFeedbackEvent({
        id: crypto.randomUUID(),
        sessionId: input.sessionId,
        deviceId: input.deviceId,
        intentSig: input.intentSig,
        kind: input.kind,
        createdAt: now,
      });

    if (!recorded) {
      this.deps.logger.info("analytics.feedback_duplicate_ignored", {
        sessionId: input.sessionId,
        deviceId: input.deviceId,
      });
      return { recorded: false };
    }

    let deltaAlpha = 0;
    let deltaBeta = 0;

    switch (input.kind) {
      case "up":
        deltaAlpha = 1.0;
        break;
      case "down":
        deltaBeta = 1.0;
        break;
      case "detail":
      case "compare":
        deltaAlpha = 0.2;
        break;
    }

    await this.deps.analyticsRepository.incrementCollectiveScore({
      deviceId: input.deviceId,
      intentSig: input.intentSig,
      deltaAlpha,
      deltaBeta,
      now,
    });

    if (this.deps.eventBus) {
      await this.deps.eventBus.publish({
        type: "feedback.given",
        payload: {
          deviceId: input.deviceId,
          intentSig: input.intentSig,
          kind: input.kind,
        },
        occurredAt: now,
      });
    }

    this.deps.logger.info("analytics.feedback_recorded", {
      deviceId: input.deviceId,
      kind: input.kind,
    });

    return { recorded: true };
  }
}
