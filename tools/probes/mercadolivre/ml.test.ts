import { describe, expect, test } from "bun:test";
import { loadMercadoLivreConfig } from "../shared/config";
import { mockFetcher } from "../shared/http";
import { getAppToken, median, pickCatalogProduct, pickItems, runMlProbe, summarizeReviews } from "./ml";

const config = loadMercadoLivreConfig({ ML_CLIENT_ID: "id", ML_CLIENT_SECRET: "secret" });

const reviewsBody = {
  paging: { total: 42, limit: 20, offset: 0 },
  rating_average: 4.6,
  reviews: [
    { id: 1, rate: 5, date_created: "2026-05-01T00:00:00Z", content: "Bateria dura dois dias" },
    { id: 2, rate: 4, date_created: "2026-05-02T00:00:00Z", content: "" },
    { id: 3, rate: 3, date_created: "2026-05-03T00:00:00Z", content: "Câmera ok" },
  ],
};

describe("helpers", () => {
  test("summarizeReviews counts and samples only reviews with text", () => {
    const summary = summarizeReviews(reviewsBody);
    expect(summary).toMatchObject({ total: 42, ratingAverage: 4.6, returned: 3, withText: 2 });
    expect(summary.samples.map((sample) => sample.rating)).toEqual([5, 3]);
  });

  test("summarizeReviews tolerates an invalid body", () => {
    expect(summarizeReviews(null).returned).toBe(0);
  });

  test("pickCatalogProduct, pickItems and median", () => {
    expect(pickCatalogProduct({ results: [{ id: "MLB1", name: "Moto" }] })).toEqual({ id: "MLB1", name: "Moto" });
    expect(pickCatalogProduct({})).toBeNull();
    const items = pickItems({ results: [{ item_id: "MLB9", price: 1500 }, { item_id: "MLB8", price: 1700 }, { price: "x" }] });
    expect(items).toEqual({ itemId: "MLB9", prices: [1500, 1700] });
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("getAppToken", () => {
  test("returns the token on success", async () => {
    const fetcher = mockFetcher([[/oauth\/token/, () => ({ status: 200, body: { access_token: "T", expires_in: 21600, scope: "read" } })]]);
    expect(await getAppToken({ fetcher, config })).toEqual({ ok: true, accessToken: "T", expiresInSec: 21600, scope: "read" });
  });

  test("returns a descriptive error on failure", async () => {
    const fetcher = mockFetcher([[/oauth\/token/, () => ({ status: 400, body: { error: "invalid_client" } })]]);
    const token = await getAppToken({ fetcher, config });
    expect(token.ok).toBe(false);
    expect(token.error).toContain("400");
    expect(token.error).toContain("invalid_client");
  });
});

describe("runMlProbe", () => {
  // Reproduces what developers reported in Oct/2026: open search blocked, catalog needs a token,
  // third-party /items blocked, reviews working.
  const fetcher = mockFetcher([
    [/oauth\/token/, () => ({ status: 200, body: { access_token: "T", expires_in: 21600 } })],
    [/sites\/MLB\/search/, () => ({ status: 403, body: { message: "forbidden" } })],
    [/products\/search/, (_url, init) =>
      (init?.headers as Record<string, string> | undefined)?.Authorization
        ? { status: 200, body: { results: [{ id: "MLB100", name: "Motorola Moto G85" }] } }
        : { status: 403, body: "At least one policy returned UNAUTHORIZED." }],
    [/products\/MLB100\/items/, () => ({ status: 200, body: { results: [{ item_id: "MLB555", price: 1499 }, { item_id: "MLB556", price: 1599 }] } })],
    [/products\/MLB100$/, () => ({ status: 200, body: { id: "MLB100", attributes: [{ id: "RAM" }, { id: "BATTERY" }] } })],
    [/\/items\/MLB555/, () => ({ status: 403, body: { error: "access_denied" } })],
    [/reviews\/item\/MLB555\?catalog_product_id/, () => ({ status: 200, body: reviewsBody })],
    [/reviews\/item\/MLB555\?limit/, () => ({ status: 403, body: { blocked_by: "PolicyAgent" } })],
  ]);

  test("builds the verdict and never leaks the token", async () => {
    const report = await runMlProbe({ fetcher, config, query: "moto g85" });
    expect(report.verdict).toEqual({
      appToken: "ok",
      catalogSearch: "ok",
      productDetail: "ok",
      productPrices: "ok",
      reviews: "ok",
      openListingSearch: "failed",
    });
    expect(report.medianPrice).toBe(1549);
    expect(report.attributesCount).toBe(2);
    expect(report.reviews?.withText).toBe(2);
    expect(JSON.stringify(report)).not.toContain('"T"');
    expect(report.checks.find((check) => check.name === "catalog_search_anonymous")?.outcome).toBe("policy_blocked");
    expect(report.checks.find((check) => check.name === "third_party_item_detail")?.outcome).toBe("forbidden");
  });

  test("marks reviews as not_tested when no product is found", async () => {
    const failing = mockFetcher([[/.*/, () => ({ status: 401, body: { error: "invalid_client" } })]]);
    const report = await runMlProbe({ fetcher: failing, config, query: "x" });
    expect(report.verdict.appToken).toBe("failed");
    expect(report.verdict.reviews).toBe("not_tested");
  });
});
