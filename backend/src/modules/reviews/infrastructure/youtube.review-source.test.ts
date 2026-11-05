import { describe, expect, it } from "bun:test";
import { YoutubeReviewSource } from "./youtube.review-source";
import type { ReviewSourceLink } from "../domain/review";

describe("YoutubeReviewSource", () => {
  it("collects comments from YouTube Data API and returns mapped raw reviews", async () => {
    const mockFetcher = async (url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("commentThreads")) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "yt-c1",
                snippet: {
                  topLevelComment: {
                    snippet: {
                      textDisplay: "Bateria excelente, dura 2 dias!",
                      publishedAt: "2026-05-01T12:00:00Z",
                      likeCount: 5,
                    },
                  },
                },
              },
            ],
            nextPageToken: "next-token-123",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("Not Found", { status: 404 });
    };

    const source = new YoutubeReviewSource({
      apiKey: "test-api-key",
      fetcher: mockFetcher,
    });

    const link: ReviewSourceLink = {
      id: "l-1",
      deviceId: "d-1",
      provider: "youtube",
      externalRef: "video-abc",
      cursor: null,
      nextDueAt: new Date(),
      intervalDays: 1,
      lastNewCount: 0,
    };

    const result = await source.collect(link);

    expect(result.reviews).toHaveLength(1);
    expect(result.reviews[0]!.externalRef).toBe("yt-c1");
    expect(result.reviews[0]!.content).toBe("Bateria excelente, dura 2 dias!");
    expect(result.nextCursor).toBe("next-token-123");
  });

  it("handles errors gracefully by throwing ExternalServiceError", async () => {
    const mockFetcher = async () => {
      return new Response(
        JSON.stringify({
          error: {
            message: "Quota exceeded",
            errors: [{ reason: "quotaExceeded" }],
          },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    };

    const source = new YoutubeReviewSource({
      apiKey: "test-api-key",
      fetcher: mockFetcher,
    });

    const link: ReviewSourceLink = {
      id: "l-1",
      deviceId: "d-1",
      provider: "youtube",
      externalRef: "video-abc",
      cursor: null,
      nextDueAt: new Date(),
      intervalDays: 1,
      lastNewCount: 0,
    };

    expect(source.collect(link)).rejects.toThrow();
  });
});
