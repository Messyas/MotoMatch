/**
 * Usage:
 *   bun run probe:yt -- "Moto G85"
 *   bun run probe:yt -- "Galaxy A55" --link https://youtu.be/XXXXXXXXXXX --launch 2024-03-15 --pages 3
 */
import { loadYoutubeConfig } from "../shared/config";
import { runCli, saveReport } from "../shared/report";
import { runYoutubeProbe } from "./run-probe";

const PHASE_LABELS = { launch: "launch", mid: "mid-term", long: "long-term" } as const;

function parseArgs(argv: string[]) {
  const valuesOf = (flag: string) => argv.flatMap((arg, index) => (arg === `--${flag}` && argv[index + 1] ? [argv[index + 1]!] : []));
  const model = argv.find((arg, index) => !arg.startsWith("--") && !argv[index - 1]?.startsWith("--")) ?? "Moto G85";
  const pages = valuesOf("pages")[0];
  return { model, manualLinks: valuesOf("link"), knownLaunchDate: valuesOf("launch")[0], maxPagesPerVideo: pages ? Number(pages) : undefined };
}

await runCli(async () => {
  const args = parseArgs(process.argv.slice(2));
  const report = await runYoutubeProbe({ fetcher: fetch, config: loadYoutubeConfig(), ...args });

  console.log(`\nYouTube — "${args.model}" (launch reference: ${report.launchDate?.slice(0, 10) ?? "?"})\n`);
  console.table(
    report.videos.map((video) => ({
      phase: PHASE_LABELS[video.phase],
      months: video.monthsSinceLaunch,
      score: video.score,
      fetched: video.fetched,
      relevant: video.relevant,
      owners: video.ownerReports,
      error: video.error?.code ?? "",
      title: video.title.slice(0, 50),
    })),
  );
  const { totals, quota } = report;
  console.log(`Comments: ${totals.relevant}/${totals.fetched} relevant (${totals.relevantPercent}%), ${totals.ownerReports} owner reports`);
  console.log(
    "By phase:",
    Object.entries(totals.byPhase)
      .map(([phase, stats]) => `${PHASE_LABELS[phase as keyof typeof PHASE_LABELS]}=${stats.videos} videos/${stats.relevant} relevant`)
      .join(" | "),
  );
  console.log("Aspects:", Object.entries(totals.aspects).sort((a, b) => b[1] - a[1]).map(([aspect, count]) => `${aspect}:${count}`).join(", "));
  console.log(`Quota: ${quota.units} units + ${quota.searchCalls} search.list calls`, quota.callsByMethod);
  console.log(`Candidates: ${report.candidateCount} (rejected: ${report.rejected.length})`);
  if (report.invalidLinks.length) console.log("Invalid links:", report.invalidLinks);
  console.log(`\nReport: ${saveReport(`yt-${args.model.replace(/\W+/g, "_")}`, report)}`);
});
