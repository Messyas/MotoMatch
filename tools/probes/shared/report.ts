import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPORTS_DIR = join(import.meta.dir, "..", "reports");

export function saveReport(prefix: string, data: unknown): string {
  mkdirSync(REPORTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(REPORTS_DIR, `${prefix}-${stamp}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  return file;
}

/** Top-level boundary for CLIs: prints a descriptive error (with cause) and exits non-zero. */
export async function runCli(main: () => Promise<void>): Promise<void> {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error && error.cause instanceof Error ? `\n  caused by: ${error.cause.message}` : "";
    console.error(`\n✖ ${message}${cause}`);
    process.exit(1);
  }
}
