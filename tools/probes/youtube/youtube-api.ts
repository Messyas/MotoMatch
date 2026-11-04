import type { YoutubeConfig } from "../shared/config";
import { ExternalServiceError } from "../shared/errors";
import { type Fetcher, probeJson } from "../shared/http";
import { parseIsoDuration } from "./duration";
import type { VideoCandidate } from "./video-selection";

const PROVIDER = "youtube";
const VIDEOS_PER_DETAILS_CALL = 50;
const COMMENTS_PER_PAGE = 100;
const DEFAULT_SEARCH_RESULTS = 15;

type Method = "search.list" | "videos.list" | "commentThreads.list";

/** Tracks quota usage. search.list has its own daily call bucket, so it is counted apart from units. */
export class QuotaTracker {
  units = 0;
  searchCalls = 0;
  readonly callsByMethod: Partial<Record<Method, number>> = {};

  record(method: Method): void {
    this.callsByMethod[method] = (this.callsByMethod[method] ?? 0) + 1;
    if (method === "search.list") this.searchCalls++;
    else this.units++;
  }

  snapshot() {
    return { units: this.units, searchCalls: this.searchCalls, callsByMethod: { ...this.callsByMethod } };
  }
}

export interface YtComment {
  id: string;
  text: string;
  likeCount: number;
  publishedAt: string;
  replyCount: number;
}

export interface CommentPageRequest {
  videoId: string;
  pageToken?: string;
  order?: "relevance" | "time";
}

/** Adapter: translates the YouTube Data API into domain types and typed errors. */
export class YoutubeClient {
  readonly quota: QuotaTracker;
  private readonly fetcher: Fetcher;
  private readonly config: YoutubeConfig;

  constructor(deps: { fetcher: Fetcher; config: YoutubeConfig; quota?: QuotaTracker }) {
    this.fetcher = deps.fetcher;
    this.config = deps.config;
    this.quota = deps.quota ?? new QuotaTracker();
  }

  private async get(request: { method: Method; path: string; params: Record<string, string | number> }): Promise<any> {
    const query = new URLSearchParams({ key: this.config.apiKey });
    for (const [name, value] of Object.entries(request.params)) query.set(name, String(value));
    const result = await probeJson<any>({ fetcher: this.fetcher, name: request.method, url: `${this.config.baseUrl}/${request.path}?${query}` });
    this.quota.record(request.method);
    if (result.outcome === "ok") return result.body;
    throw new ExternalServiceError({
      provider: PROVIDER,
      operation: request.method,
      status: result.status,
      reason: result.body?.error?.errors?.[0]?.reason ?? result.outcome,
      detail: result.error ?? result.body?.error?.message,
    });
  }

  async searchVideoIds(input: { query: string; maxResults?: number }): Promise<string[]> {
    const body = await this.get({
      method: "search.list",
      path: "search",
      params: {
        part: "snippet",
        type: "video",
        q: input.query,
        maxResults: input.maxResults ?? DEFAULT_SEARCH_RESULTS,
        regionCode: this.config.regionCode,
        relevanceLanguage: this.config.relevanceLanguage,
      },
    });
    return (body?.items ?? []).map((item: any) => item?.id?.videoId).filter((id: unknown): id is string => typeof id === "string");
  }

  async videoDetails(ids: string[]): Promise<VideoCandidate[]> {
    const videos: VideoCandidate[] = [];
    for (let offset = 0; offset < ids.length; offset += VIDEOS_PER_DETAILS_CALL) {
      const chunk = ids.slice(offset, offset + VIDEOS_PER_DETAILS_CALL);
      const body = await this.get({ method: "videos.list", path: "videos", params: { part: "snippet,contentDetails,statistics", id: chunk.join(",") } });
      videos.push(...(body?.items ?? []).map(toVideoCandidate));
    }
    return videos;
  }

  async commentPage({ videoId, pageToken, order = "relevance" }: CommentPageRequest): Promise<{ comments: YtComment[]; nextPageToken?: string }> {
    const body = await this.get({
      method: "commentThreads.list",
      path: "commentThreads",
      params: { part: "snippet", videoId, maxResults: COMMENTS_PER_PAGE, order, textFormat: "plainText", ...(pageToken ? { pageToken } : {}) },
    });
    return { comments: (body?.items ?? []).map(toComment), nextPageToken: body?.nextPageToken };
  }
}

function toVideoCandidate(item: any): VideoCandidate {
  return {
    id: item.id,
    title: item.snippet?.title ?? "",
    channelId: item.snippet?.channelId ?? "",
    channelTitle: item.snippet?.channelTitle,
    publishedAt: item.snippet?.publishedAt ?? "",
    durationSec: parseIsoDuration(item.contentDetails?.duration ?? ""),
    viewCount: Number(item.statistics?.viewCount ?? 0),
    commentCount: Number(item.statistics?.commentCount ?? 0),
    // A missing statistics.commentCount usually means comments are disabled.
    commentsDisabled: item.statistics ? item.statistics.commentCount === undefined : undefined,
  };
}

function toComment(item: any): YtComment {
  const snippet = item.snippet?.topLevelComment?.snippet ?? {};
  return {
    id: item.id,
    text: String(snippet.textOriginal ?? snippet.textDisplay ?? ""),
    likeCount: Number(snippet.likeCount ?? 0),
    publishedAt: String(snippet.publishedAt ?? ""),
    replyCount: Number(item.snippet?.totalReplyCount ?? 0),
  };
}
