import { SEARCH_QUERY_TEMPLATES } from "../locales/pt-BR/review-vocabulary";
import type { YoutubeConfig } from "../shared/config";
import { ExternalServiceError } from "../shared/errors";
import type { Fetcher } from "../shared/http";
import { evaluateComment } from "./comment-filter";
import { parseVideoId } from "./duration";
import { type Phase, type ScoredVideo, selectVideos } from "./video-selection";
import { QuotaTracker, YoutubeClient } from "./youtube-api";

const DEFAULT_MAX_PAGES_PER_VIDEO = 2;
const SAMPLES_PER_VIDEO = 3;
const SAMPLE_MAX_CHARS = 180;

export interface YtProbeInput {
  fetcher: Fetcher;
  config: YoutubeConfig;
  model: string;
  manualLinks?: string[];
  knownLaunchDate?: string;
  queryTemplates?: readonly string[];
  maxPagesPerVideo?: number;
}

export interface VideoReport {
  id: string;
  title: string;
  channel?: string;
  phase: Phase;
  monthsSinceLaunch: number;
  score: number;
  reasons: string[];
  fetched: number;
  relevant: number;
  ownerReports: number;
  aspects: Record<string, number>;
  samples: string[];
  error?: { code: string; message: string; retryable: boolean };
}

export interface YtProbeReport {
  model: string;
  launchDate: string | null;
  candidateCount: number;
  rejected: Array<{ id: string; title: string; reasons: string[] }>;
  videos: VideoReport[];
  totals: {
    fetched: number;
    relevant: number;
    relevantPercent: number;
    ownerReports: number;
    byPhase: Record<Phase, { videos: number; relevant: number }>;
    aspects: Record<string, number>;
  };
  quota: ReturnType<QuotaTracker["snapshot"]>;
  invalidLinks: string[];
}

function splitLinks(links: string[]): { videoIds: string[]; invalidLinks: string[] } {
  const videoIds: string[] = [];
  const invalidLinks: string[] = [];
  for (const link of links) {
    const id = parseVideoId(link);
    if (id) videoIds.push(id);
    else invalidLinks.push(link);
  }
  return { videoIds, invalidLinks };
}

export async function runYoutubeProbe(input: YtProbeInput): Promise<YtProbeReport> {
  const client = new YoutubeClient({ fetcher: input.fetcher, config: input.config });
  const { videoIds: manualIds, invalidLinks } = splitLinks(input.manualLinks ?? []);

  const foundIds = new Set<string>();
  for (const template of input.queryTemplates ?? SEARCH_QUERY_TEMPLATES) {
    const ids = await client.searchVideoIds({ query: template.replace("{model}", input.model) });
    ids.forEach((id) => foundIds.add(id));
  }
  const details = await client.videoDetails([...new Set([...manualIds, ...foundIds])]);
  const candidates = details.map((video) => ({ ...video, isManual: manualIds.includes(video.id) }));
  const { launchDate, selected, scored } = selectVideos({ candidates, model: input.model, knownLaunchDate: input.knownLaunchDate });

  const videos: VideoReport[] = [];
  for (const video of selected) {
    videos.push(await collectVideo({ client, video, maxPages: input.maxPagesPerVideo ?? DEFAULT_MAX_PAGES_PER_VIDEO }));
  }

  return {
    model: input.model,
    launchDate,
    candidateCount: candidates.length,
    rejected: scored.filter((video) => video.isRejected).map(({ id, title, reasons }) => ({ id, title, reasons })),
    videos,
    totals: summarize(videos),
    quota: client.quota.snapshot(),
    invalidLinks,
  };
}

function summarize(videos: VideoReport[]): YtProbeReport["totals"] {
  const byPhase: YtProbeReport["totals"]["byPhase"] = {
    launch: { videos: 0, relevant: 0 },
    mid: { videos: 0, relevant: 0 },
    long: { videos: 0, relevant: 0 },
  };
  const aspects: Record<string, number> = {};
  let fetched = 0;
  let relevant = 0;
  let ownerReports = 0;
  for (const video of videos) {
    fetched += video.fetched;
    relevant += video.relevant;
    ownerReports += video.ownerReports;
    byPhase[video.phase].videos++;
    byPhase[video.phase].relevant += video.relevant;
    for (const [aspect, count] of Object.entries(video.aspects)) aspects[aspect] = (aspects[aspect] ?? 0) + count;
  }
  const relevantPercent = fetched ? Math.round((relevant / fetched) * 100) : 0;
  return { fetched, relevant, relevantPercent, ownerReports, byPhase, aspects };
}

function emptyVideoReport(video: ScoredVideo): VideoReport {
  return {
    id: video.id,
    title: video.title,
    channel: video.channelTitle,
    phase: video.phase,
    monthsSinceLaunch: video.monthsSinceLaunch,
    score: video.score,
    reasons: video.reasons,
    fetched: 0,
    relevant: 0,
    ownerReports: 0,
    aspects: {},
    samples: [],
  };
}

/**
 * Per-video boundary: an external failure on one video is recorded in its report
 * and does not abort the whole probe. Unexpected (non-external) errors propagate.
 */
async function collectVideo(input: { client: YoutubeClient; video: ScoredVideo; maxPages: number }): Promise<VideoReport> {
  const report = emptyVideoReport(input.video);
  let pageToken: string | undefined;
  try {
    for (let page = 0; page < input.maxPages; page++) {
      const result = await input.client.commentPage({ videoId: input.video.id, pageToken });
      for (const comment of result.comments) tallyComment(report, comment.text);
      pageToken = result.nextPageToken;
      if (!pageToken) break;
    }
  } catch (error) {
    if (!(error instanceof ExternalServiceError)) throw error;
    report.error = { code: error.reason ?? error.code, message: error.message, retryable: error.retryable };
  }
  return report;
}

function tallyComment(report: VideoReport, text: string): void {
  report.fetched++;
  const verdict = evaluateComment(text);
  if (!verdict.isRelevant) return;
  report.relevant++;
  if (verdict.isOwnerReport) report.ownerReports++;
  for (const aspect of verdict.aspects) report.aspects[aspect] = (report.aspects[aspect] ?? 0) + 1;
  if (report.samples.length < SAMPLES_PER_VIDEO) report.samples.push(text.slice(0, SAMPLE_MAX_CHARS));
}
