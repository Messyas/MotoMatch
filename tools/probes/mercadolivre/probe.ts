/**
 * Usage:
 *   bun run probe:ml -- "moto g85"            # searches the catalog
 *   bun run probe:ml -- "moto g85" MLB123456  # forces a catalog_product_id
 *
 * Run it from your PC and from a cloud IP (GitHub Actions) to detect datacenter IP blocking.
 */
import { loadMercadoLivreConfig } from "../shared/config";
import { runCli, saveReport } from "../shared/report";
import { type CapabilityName, runMlProbe } from "./ml";

const CAPABILITY_LABELS: Record<CapabilityName, string> = {
  appToken: "client_credentials token",
  catalogSearch: "catalog search (/products/search)",
  productDetail: "product sheet (/products/{id})",
  productPrices: "prices (/products/{id}/items)",
  reviews: "reviews (/reviews/item)",
  openListingSearch: "open listing search (/sites/{site}/search)",
};
const VERDICT_ICONS = { ok: "✅", failed: "❌", not_tested: "➖" } as const;

await runCli(async () => {
  const [query = "moto g85", productId] = process.argv.slice(2);
  const report = await runMlProbe({ fetcher: fetch, config: loadMercadoLivreConfig(), query, productId });

  console.log(`\nMercado Livre — "${query}"\n`);
  console.table(report.checks.map((check) => ({ endpoint: check.name, status: check.status, outcome: check.outcome, ms: check.durationMs })));
  console.log("Verdict:");
  for (const [capability, verdict] of Object.entries(report.verdict)) {
    console.log(`  ${VERDICT_ICONS[verdict]} ${CAPABILITY_LABELS[capability as CapabilityName]}: ${verdict}`);
  }
  if (report.product) console.log(`\nProduct: ${report.product.name} (${report.product.id})`);
  if (report.medianPrice) console.log(`Median price: R$ ${report.medianPrice.toFixed(2)}`);
  if (report.reviews) {
    const { withText, returned, total, ratingAverage, samples } = report.reviews;
    console.log(`Reviews: ${withText}/${returned} with text, total=${total}, average=${ratingAverage}`);
    for (const sample of samples) console.log(`  • [${sample.rating}★] ${sample.content}`);
  }
  if (!report.token.ok) console.log(`\n⚠️  ${report.token.error}`);
  if (report.checks.some((check) => check.outcome === "policy_blocked")) {
    console.log("\n⚠️  PolicyAgent: enable the app's read permissions in the DevCenter and request a new token.");
  }
  console.log(`\nReport: ${saveReport("ml", report)}`);
});
