import type { VideoCandidate } from "../youtube/video-selection";

/** Test Data Builder (docs/ARQUITETURA.md §6.2): readable fixtures with sensible defaults. */
export class VideoCandidateBuilder {
  private static sequence = 0;
  private video: VideoCandidate;

  constructor() {
    VideoCandidateBuilder.sequence++;
    this.video = {
      id: `video${String(VideoCandidateBuilder.sequence).padStart(6, "0")}`,
      title: "Moto G85 review",
      channelId: `channel-${VideoCandidateBuilder.sequence}`,
      publishedAt: "2025-01-10T00:00:00Z",
      durationSec: 600,
      viewCount: 50_000,
      commentCount: 300,
    };
  }

  withId(id: string): this { this.video.id = id; return this; }
  titled(title: string): this { this.video.title = title; return this; }
  fromChannel(channelId: string): this { this.video.channelId = channelId; return this; }
  publishedAt(iso: string): this { this.video.publishedAt = iso; return this; }
  lasting(durationSec: number): this { this.video.durationSec = durationSec; return this; }
  withComments(count: number): this { this.video.commentCount = count; return this; }
  withViews(count: number): this { this.video.viewCount = count; return this; }
  withCommentsDisabled(): this { this.video.commentsDisabled = true; return this; }
  asManualLink(): this { this.video.isManual = true; return this; }

  build(): VideoCandidate {
    return { ...this.video };
  }
}

export const aVideo = () => new VideoCandidateBuilder();
