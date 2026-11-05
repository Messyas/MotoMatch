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

export interface MercadoLivreConfig {
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly baseUrl?: string;
}

export interface CatalogSearchResult {
  readonly id: string;
  readonly name: string;
  readonly brand?: string;
  readonly pictures?: string[];
}

export class MercadoLivreReviewSource implements ReviewSource {
  readonly provider: ReviewProvider = "mercadolivre";
  private readonly baseUrl: string;
  private readonly fetcher: HttpFetcher;

  constructor(
    private readonly config: MercadoLivreConfig,
    fetcher?: HttpFetcher,
  ) {
    this.baseUrl = config.baseUrl ?? "https://api.mercadolibre.com";
    this.fetcher = fetcher ?? fetch;
  }

  async collect(
    link: ReviewSourceLink,
    _budgetCount?: number,
  ): Promise<ReviewSourceCollectResult> {
    if (!this.config.clientId || !this.config.clientSecret) {
      return { reviews: [] };
    }

    try {
      const url = `${this.baseUrl}/reviews/item/${link.externalRef}?catalog_product_id=${link.externalRef}`;
      const response = await this.fetcher(url);
      if (!response.ok) return { reviews: [] };

      const data = (await response.json()) as any;
      const reviewsData = data?.reviews ?? [];
      const reviews: RawReview[] = [];

      for (const item of reviewsData) {
        const content = item?.content ?? item?.title ?? "";
        if (!content.trim()) continue;

        reviews.push({
          externalRef: String(item?.id ?? crypto.randomUUID()),
          rating: item?.rate ? Number(item.rate) : null,
          content,
          publishedAt: item?.date_created ? new Date(item.date_created) : null,
        });
      }

      return { reviews };
    } catch {
      return { reviews: [] };
    }
  }

  async searchCatalog(query: string): Promise<CatalogSearchResult[]> {
    if (!query.trim()) return [];

    try {
      const url = `${this.baseUrl}/products/search?status=active&site_id=MLB&q=${encodeURIComponent(query)}`;
      const response = await this.fetcher(url);
      if (!response.ok) return [];

      const data = (await response.json()) as any;
      const results = data?.results ?? [];

      return results.map((r: any) => ({
        id: r.id,
        name: r.name,
        brand: r.attributes?.find((a: any) => a.id === "BRAND")?.value_name,
        pictures: (r.pictures ?? []).map((p: any) => p.url),
      }));
    } catch {
      return [];
    }
  }
}
