import { ExternalServiceError } from "../../../shared/errors/app-error";
import type {
  RawReview,
  ReviewSource,
  ReviewSourceCollectResult,
} from "../domain/review-source";
import type { ReviewProvider, ReviewSourceLink } from "../domain/review";

export type HttpFetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface YoutubeReviewSourceDeps {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly fetcher?: HttpFetcher;
}

export class YoutubeReviewSource implements ReviewSource {
  readonly provider: ReviewProvider = "youtube";
  private readonly baseUrl: string;
  private readonly fetcher: HttpFetcher;

  constructor(private readonly deps: YoutubeReviewSourceDeps) {
    this.baseUrl = deps.baseUrl ?? "https://www.googleapis.com/youtube/v3";
    this.fetcher = deps.fetcher ?? fetch;
  }

  async collect(
    link: ReviewSourceLink,
    budgetCount = 100,
  ): Promise<ReviewSourceCollectResult> {
    const maxResults = Math.min(100, Math.max(1, budgetCount));
    const url = new URL(`${this.baseUrl}/commentThreads`);
    url.searchParams.set("key", this.deps.apiKey);
    url.searchParams.set("videoId", link.externalRef);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("textFormat", "plainText");
    url.searchParams.set("maxResults", String(maxResults));
    url.searchParams.set("order", "relevance");

    if (link.cursor) {
      url.searchParams.set("pageToken", link.cursor);
    }

    let response: Response;
    try {
      response = await this.fetcher(url.toString());
    } catch (err) {
      throw new ExternalServiceError({
        provider: "youtube",
        operation: "commentThreads.list",
        detail: err instanceof Error ? err.message : String(err),
        cause: err,
        retryable: true,
      });
    }

    if (!response.ok) {
      let bodyText = "";
      try {
        bodyText = await response.text();
      } catch {
        // ignore
      }

      throw new ExternalServiceError({
        provider: "youtube",
        operation: "commentThreads.list",
        status: response.status,
        detail: bodyText,
        retryable: response.status === 429 || response.status >= 500,
      });
    }

    const json = (await response.json()) as any;
    const items = json?.items ?? [];
    const reviews: RawReview[] = [];

    for (const item of items) {
      const snippet = item?.snippet?.topLevelComment?.snippet;
      if (!snippet) continue;

      const text = snippet.textOriginal ?? snippet.textDisplay ?? "";
      if (!text.trim()) continue;

      reviews.push({
        externalRef: item.id ?? crypto.randomUUID(),
        authorHash: snippet.authorDisplayName
          ? String(snippet.authorDisplayName)
          : null,
        content: text,
        publishedAt: snippet.publishedAt ? new Date(snippet.publishedAt) : null,
        videoPhase: "unknown",
      });
    }

    return {
      reviews,
      nextCursor: json?.nextPageToken ?? null,
    };
  }
}
