import { describe, expect, test } from "bun:test";
import { loadYoutubeConfig } from "../shared/config";
import { mockFetcher } from "../shared/http";
import { runYoutubeProbe } from "./run-probe";

const config = loadYoutubeConfig({ YOUTUBE_API_KEY: "K" });

const apiVideo = (input: { id: string; title: string; publishedAt: string; channelId: string; commentCount?: number; statistics?: object }) => ({
  id: input.id,
  snippet: { title: input.title, channelId: input.channelId, channelTitle: `Channel ${input.channelId}`, publishedAt: input.publishedAt },
  contentDetails: { duration: "PT10M5S" },
  statistics: input.statistics ?? { viewCount: "40000", commentCount: String(input.commentCount ?? 300) },
});

const API_VIDEOS = [
  apiVideo({ id: "aaaaaaaaaa1", title: "Moto G85 review completo", publishedAt: "2025-01-05T00:00:00Z", channelId: "c1" }),
  apiVideo({ id: "aaaaaaaaaa2", title: "Moto G85 depois de 6 meses de uso", publishedAt: "2025-07-05T00:00:00Z", channelId: "c2" }),
  apiVideo({ id: "aaaaaaaaaa3", title: "Moto G85 1 ano depois: ainda vale a pena?", publishedAt: "2026-02-05T00:00:00Z", channelId: "c3" }),
  apiVideo({ id: "aaaaaaaaaa4", title: "Moto G84 review", publishedAt: "2024-01-05T00:00:00Z", channelId: "c4" }),
  apiVideo({ id: "aaaaaaaaaa5", title: "Moto G85 sem comentários", publishedAt: "2025-02-05T00:00:00Z", channelId: "c5", statistics: { viewCount: "10" } }),
];
const MANUAL_VIDEO = apiVideo({ id: "MANUALxxxx1", title: "Vídeo do meu canal", publishedAt: "2025-09-01T00:00:00Z", channelId: "cm" });

const commentThread = (id: string, text: string) => ({
  id,
  snippet: { totalReplyCount: 0, topLevelComment: { snippet: { textOriginal: text, likeCount: 0, publishedAt: "2025-03-01T00:00:00Z" } } },
});
const COMMENTS = {
  items: [
    commentThread("t1", "Comprei faz 2 meses, bateria excelente e câmera boa de dia"),
    commentThread("t2", "primeiro"),
    commentThread("t3", "O meu esquenta muito jogando free fire, fora isso tranquilo"),
  ],
};

function makeFetcher() {
  return mockFetcher([
    [/\/search\?/, () => ({ status: 200, body: { items: API_VIDEOS.map((video) => ({ id: { videoId: video.id } })) } })],
    [/\/videos\?/, (url) => {
      const ids = new URL(url).searchParams.get("id")!.split(",");
      return { status: 200, body: { items: [...API_VIDEOS, MANUAL_VIDEO].filter((video) => ids.includes(video.id)) } };
    }],
    [/commentThreads.*videoId=aaaaaaaaaa3/, () => ({ status: 403, body: { error: { message: "Comments disabled", errors: [{ reason: "commentsDisabled" }] } } })],
    [/commentThreads.*pageToken=P2/, () => ({ status: 200, body: COMMENTS })],
    [/commentThreads/, () => ({ status: 200, body: { ...COMMENTS, nextPageToken: "P2" } })],
  ]);
}

describe("runYoutubeProbe", () => {
  test("selects by phase, filters comments and tracks quota", async () => {
    const fetcher = makeFetcher();
    const report = await runYoutubeProbe({ fetcher, config, model: "Moto G85", queryTemplates: ["{model} review", "{model} vale a pena"], maxPagesPerVideo: 2 });

    expect(report.launchDate).toBe("2025-01-05T00:00:00Z");
    const ids = report.videos.map((video) => video.id);
    expect(ids).toEqual(expect.arrayContaining(["aaaaaaaaaa1", "aaaaaaaaaa2", "aaaaaaaaaa3"]));
    expect(ids).not.toContain("aaaaaaaaaa4");
    expect(ids).not.toContain("aaaaaaaaaa5");
    expect(report.rejected.map((video) => video.id)).toEqual(expect.arrayContaining(["aaaaaaaaaa4", "aaaaaaaaaa5"]));

    const first = report.videos.find((video) => video.id === "aaaaaaaaaa1")!;
    expect(first).toMatchObject({ fetched: 6, relevant: 4, ownerReports: 4 });
    expect(first.aspects.battery).toBe(2);

    const disabled = report.videos.find((video) => video.id === "aaaaaaaaaa3")!;
    expect(disabled.phase).toBe("long");
    expect(disabled.error).toEqual({
      code: "commentsDisabled",
      message: "youtube commentThreads.list failed with HTTP 403 (commentsDisabled): Comments disabled",
      retryable: false,
    });

    expect(report.totals.byPhase.mid.videos).toBe(1);
    expect(report.quota.searchCalls).toBe(2);
    expect(report.quota.units).toBe(1 + 4 + 1); // 1 videos.list + 2 pages × 2 videos + 1 failed call
    expect(fetcher.calls.every((url) => url.includes("key=K"))).toBe(true);
    expect(fetcher.calls.every((url) => url.startsWith(config.baseUrl))).toBe(true);
  });

  test("includes manual links even without the model name and reports invalid links", async () => {
    const report = await runYoutubeProbe({
      fetcher: makeFetcher(),
      config,
      model: "Moto G85",
      queryTemplates: ["{model} review"],
      maxPagesPerVideo: 1,
      manualLinks: ["https://youtu.be/MANUALxxxx1", "https://vimeo.com/1"],
    });
    expect(report.videos[0]!.id).toBe("MANUALxxxx1");
    expect(report.invalidLinks).toEqual(["https://vimeo.com/1"]);
  });

  test("propagates a search failure as a descriptive ExternalServiceError", async () => {
    const fetcher = mockFetcher([[/\/search\?/, () => ({ status: 403, body: { error: { message: "API key not valid", errors: [{ reason: "keyInvalid" }] } } })]]);
    await expect(runYoutubeProbe({ fetcher, config, model: "Moto G85", queryTemplates: ["{model}"] })).rejects.toThrow(
      "youtube search.list failed with HTTP 403 (keyInvalid): API key not valid",
    );
  });
});
