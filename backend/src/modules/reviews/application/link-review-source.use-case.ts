import type { Clock } from "../../../shared/time/clock";
import type { ReviewRepository } from "../domain/review.repository";
import type { ReviewProvider, ReviewSourceLink } from "../domain/review";

export interface LinkReviewSourceDeps {
  readonly reviewRepository: ReviewRepository;
  readonly clock: Clock;
}

export interface LinkReviewSourceInput {
  readonly deviceId: string;
  readonly provider: ReviewProvider;
  readonly externalRef: string;
  readonly intervalDays?: number;
}

export class LinkReviewSourceUseCase {
  constructor(private readonly deps: LinkReviewSourceDeps) {}

  async execute(input: LinkReviewSourceInput): Promise<ReviewSourceLink> {
    const existing = await this.deps.reviewRepository.findSourceLink(
      input.provider,
      input.externalRef,
    );
    if (existing) {
      return existing;
    }

    const now = this.deps.clock.now();
    const link: ReviewSourceLink = {
      id: crypto.randomUUID(),
      deviceId: input.deviceId,
      provider: input.provider,
      externalRef: input.externalRef,
      cursor: null,
      nextDueAt: now,
      intervalDays: input.intervalDays ?? 1,
      lastNewCount: 0,
    };

    await this.deps.reviewRepository.saveSourceLink(link);
    return link;
  }
}
