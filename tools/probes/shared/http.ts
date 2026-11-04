/** Injectable fetch: the global fetch in production, a mock in tests. */
export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export type Outcome =
  | "ok"
  | "unauthorized" // 401: missing/invalid token
  | "policy_blocked" // 403 PolicyAgent: app permission not enabled
  | "forbidden" // 403: third-party resource or edge/IP block
  | "not_found"
  | "rate_limited"
  | "server_error"
  | "network_error"
  | "other";

export interface ProbeResult<T = unknown> {
  name: string;
  url: string;
  status: number | null;
  outcome: Outcome;
  durationMs: number;
  body?: T;
  error?: string;
}

export interface ProbeRequest {
  fetcher: Fetcher;
  name: string;
  url: string;
  init?: RequestInit;
}

const POLICY_BLOCK_PATTERN = /policyagent|policy returned unauthorized/i;

export function classify(status: number | null, bodyText = ""): Outcome {
  if (status === null) return "network_error";
  if (status >= 200 && status < 300) return "ok";
  if (status === 401) return "unauthorized";
  if (status === 403) return POLICY_BLOCK_PATTERN.test(bodyText) ? "policy_blocked" : "forbidden";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  return "other";
}

function parseBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text; // non-JSON bodies are kept as text on purpose
  }
}

/** Never throws: network failures become `network_error` results so a probe can report every endpoint. */
export async function probeJson<T = unknown>({ fetcher, name, url, init }: ProbeRequest): Promise<ProbeResult<T>> {
  const startedAt = performance.now();
  const elapsed = () => Math.round(performance.now() - startedAt);
  try {
    const response = await fetcher(url, init);
    const text = await response.text();
    return {
      name,
      url,
      status: response.status,
      outcome: classify(response.status, text),
      durationMs: elapsed(),
      body: parseBody(text) as T,
    };
  } catch (error) {
    return {
      name,
      url,
      status: null,
      outcome: "network_error",
      durationMs: elapsed(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

type MockHandler = (url: string, init?: RequestInit) => { status: number; body: unknown };

/** Minimal fetch mock: matches the URL against regexes and returns the configured response. */
export function mockFetcher(routes: Array<[RegExp, MockHandler]>): Fetcher & { calls: string[] } {
  const calls: string[] = [];
  const fetcher = (async (url: string, init?: RequestInit) => {
    calls.push(url);
    const route = routes.find(([pattern]) => pattern.test(url));
    if (!route) return new Response(JSON.stringify({ error: "no mock route" }), { status: 404 });
    const { status, body } = route[1](url, init);
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  }) as Fetcher & { calls: string[] };
  fetcher.calls = calls;
  return fetcher;
}
