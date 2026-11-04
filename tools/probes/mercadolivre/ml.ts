import type { MercadoLivreConfig } from "../shared/config";
import { type Fetcher, type ProbeResult, probeJson } from "../shared/http";

const REVIEWS_PAGE_SIZE = 20;
const REVIEW_SAMPLE_SIZE = 3;
const REVIEW_SAMPLE_MAX_CHARS = 200;

export type CheckVerdict = "ok" | "failed" | "not_tested";

export type CapabilityName =
  | "appToken"
  | "catalogSearch"
  | "productDetail"
  | "productPrices"
  | "reviews"
  | "openListingSearch";

export interface TokenResult {
  ok: boolean;
  accessToken?: string;
  expiresInSec?: number;
  scope?: string;
  error?: string;
}

export interface ReviewsSummary {
  total: number | null;
  ratingAverage: number | null;
  returned: number;
  withText: number;
  samples: Array<{ rating: number | null; createdAt: string | null; content: string }>;
}

export interface CatalogProduct {
  id: string;
  name: string;
}

export interface MlProbeReport {
  query: string;
  token: Omit<TokenResult, "accessToken">;
  product: CatalogProduct | null;
  itemId: string | null;
  medianPrice: number | null;
  attributesCount: number | null;
  reviews: ReviewsSummary | null;
  checks: Array<Omit<ProbeResult, "body"> & { authenticated: boolean }>;
  verdict: Record<CapabilityName, CheckVerdict>;
}

export interface MlProbeInput {
  fetcher: Fetcher;
  config: MercadoLivreConfig;
  query: string;
  /** Forces a catalog_product_id instead of picking the first search result. */
  productId?: string;
}

/** App token (client_credentials): no end-user login required. */
export async function getAppToken({ fetcher, config }: Pick<MlProbeInput, "fetcher" | "config">): Promise<TokenResult> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });
  const result = await probeJson<Record<string, unknown>>({
    fetcher,
    name: "oauth_token",
    url: `${config.baseUrl}/oauth/token`,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: body.toString(),
    },
  });
  if (result.outcome !== "ok" || typeof result.body?.access_token !== "string") {
    return { ok: false, error: `token request failed with ${result.status ?? "network error"}: ${JSON.stringify(result.body ?? result.error)}` };
  }
  return {
    ok: true,
    accessToken: result.body.access_token,
    expiresInSec: Number(result.body.expires_in),
    scope: typeof result.body.scope === "string" ? result.body.scope : undefined,
  };
}

export function summarizeReviews(body: unknown): ReviewsSummary {
  const data = (body ?? {}) as Record<string, any>;
  const reviews: any[] = Array.isArray(data.reviews) ? data.reviews : [];
  const withText = reviews.filter((review) => typeof review?.content === "string" && review.content.trim().length > 0);
  return {
    total: typeof data.paging?.total === "number" ? data.paging.total : null,
    ratingAverage: typeof data.rating_average === "number" ? data.rating_average : null,
    returned: reviews.length,
    withText: withText.length,
    samples: withText.slice(0, REVIEW_SAMPLE_SIZE).map((review) => ({
      rating: typeof review.rate === "number" ? review.rate : null,
      createdAt: typeof review.date_created === "string" ? review.date_created : null,
      content: String(review.content).slice(0, REVIEW_SAMPLE_MAX_CHARS),
    })),
  };
}

export function pickCatalogProduct(body: unknown): CatalogProduct | null {
  const results: any[] = Array.isArray((body as any)?.results) ? (body as any).results : [];
  const first = results.find((result) => typeof result?.id === "string");
  return first ? { id: first.id, name: String(first.name ?? "") } : null;
}

export function pickItems(body: unknown): { itemId: string | null; prices: number[] } {
  const results: any[] = Array.isArray((body as any)?.results) ? (body as any).results : [];
  const prices = results.map((result) => Number(result?.price)).filter((price) => Number.isFinite(price) && price > 0);
  const itemId = results.find((result) => typeof result?.item_id === "string")?.item_id ?? null;
  return { itemId, prices };
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/** Records every endpoint check so the final verdict can be derived from them. */
class CheckRecorder {
  readonly checks: MlProbeReport["checks"] = [];

  constructor(private readonly deps: { fetcher: Fetcher; baseUrl: string; authHeader?: Record<string, string> }) {}

  async call(request: { name: string; path: string; authenticated: boolean }): Promise<ProbeResult> {
    const useAuth = request.authenticated && !!this.deps.authHeader;
    const result = await probeJson({
      fetcher: this.deps.fetcher,
      name: request.name,
      url: `${this.deps.baseUrl}${request.path}`,
      init: useAuth ? { headers: this.deps.authHeader } : undefined,
    });
    const { body: _body, ...withoutBody } = result;
    this.checks.push({ ...withoutBody, authenticated: useAuth });
    return result;
  }

  verdictOf(name: string): CheckVerdict {
    const check = this.checks.find((candidate) => candidate.name === name);
    if (!check) return "not_tested";
    return check.outcome === "ok" ? "ok" : "failed";
  }
}

/**
 * Runs the checks PhoneMatch depends on. Each endpoint is called with a token and, where relevant,
 * without one, to tell "needs a token" apart from "blocked even with a token".
 */
export async function runMlProbe({ fetcher, config, query, productId }: MlProbeInput): Promise<MlProbeReport> {
  const token = await getAppToken({ fetcher, config });
  const recorder = new CheckRecorder({
    fetcher,
    baseUrl: config.baseUrl,
    authHeader: token.accessToken ? { Authorization: `Bearer ${token.accessToken}` } : undefined,
  });
  const encodedQuery = encodeURIComponent(query);
  const listingSearchPath = `/sites/${config.siteId}/search?q=${encodedQuery}&limit=1`;
  const catalogSearchPath = `/products/search?status=active&site_id=${config.siteId}&q=${encodedQuery}`;

  await recorder.call({ name: "listing_search_anonymous", path: listingSearchPath, authenticated: false });
  await recorder.call({ name: "listing_search", path: listingSearchPath, authenticated: true });
  await recorder.call({ name: "catalog_search_anonymous", path: catalogSearchPath, authenticated: false });
  const catalogSearch = await recorder.call({ name: "catalog_search", path: catalogSearchPath, authenticated: true });

  const product = productId
    ? { id: productId, name: "(provided)" }
    : catalogSearch.outcome === "ok"
      ? pickCatalogProduct(catalogSearch.body)
      : null;

  const details = product ? await probeProductDetails({ recorder, productId: product.id }) : EMPTY_DETAILS;
  const { accessToken: _token, ...tokenWithoutSecret } = token;

  return {
    query,
    token: tokenWithoutSecret,
    product,
    ...details,
    checks: recorder.checks,
    verdict: {
      appToken: token.ok ? "ok" : "failed",
      catalogSearch: recorder.verdictOf("catalog_search"),
      productDetail: recorder.verdictOf("product_detail"),
      productPrices: recorder.verdictOf("product_items"),
      reviews: details.reviewsVerdict,
      openListingSearch: recorder.verdictOf("listing_search"),
    },
  };
}

interface ProductDetails {
  itemId: string | null;
  medianPrice: number | null;
  attributesCount: number | null;
  reviews: ReviewsSummary | null;
  reviewsVerdict: CheckVerdict;
}

const EMPTY_DETAILS: ProductDetails = {
  itemId: null,
  medianPrice: null,
  attributesCount: null,
  reviews: null,
  reviewsVerdict: "not_tested",
};

async function probeProductDetails({ recorder, productId }: { recorder: CheckRecorder; productId: string }): Promise<ProductDetails> {
  const detail = await recorder.call({ name: "product_detail", path: `/products/${productId}`, authenticated: true });
  const attributes = (detail.body as any)?.attributes;
  const attributesCount = detail.outcome === "ok" ? (Array.isArray(attributes) ? attributes.length : 0) : null;

  const items = await recorder.call({ name: "product_items", path: `/products/${productId}/items`, authenticated: true });
  const picked = items.outcome === "ok" ? pickItems(items.body) : { itemId: null, prices: [] };
  if (!picked.itemId) {
    return { ...EMPTY_DETAILS, attributesCount, medianPrice: median(picked.prices) };
  }

  await recorder.call({ name: "third_party_item_detail", path: `/items/${picked.itemId}`, authenticated: true });
  const catalogReviews = await recorder.call({
    name: "reviews_with_catalog_id",
    path: `/reviews/item/${picked.itemId}?catalog_product_id=${productId}&limit=${REVIEWS_PAGE_SIZE}`,
    authenticated: true,
  });
  const plainReviews = await recorder.call({
    name: "reviews_without_catalog_id",
    path: `/reviews/item/${picked.itemId}?limit=${REVIEWS_PAGE_SIZE}`,
    authenticated: true,
  });
  const successful = [catalogReviews, plainReviews].find((result) => result.outcome === "ok");

  return {
    itemId: picked.itemId,
    medianPrice: median(picked.prices),
    attributesCount,
    reviews: successful ? summarizeReviews(successful.body) : null,
    reviewsVerdict: successful ? "ok" : "failed",
  };
}
