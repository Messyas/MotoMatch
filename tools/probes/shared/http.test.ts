import { describe, expect, test } from "bun:test";
import { classify, mockFetcher, probeJson } from "./http";

describe("classify", () => {
  test("maps HTTP status to outcome", () => {
    expect(classify(200)).toBe("ok");
    expect(classify(401)).toBe("unauthorized");
    expect(classify(403, '{"message":"forbidden"}')).toBe("forbidden");
    expect(classify(403, '{"blocked_by":"PolicyAgent"}')).toBe("policy_blocked");
    expect(classify(403, "At least one policy returned UNAUTHORIZED.")).toBe("policy_blocked");
    expect(classify(429)).toBe("rate_limited");
    expect(classify(503)).toBe("server_error");
    expect(classify(null)).toBe("network_error");
  });
});

describe("probeJson", () => {
  test("parses JSON and classifies", async () => {
    const fetcher = mockFetcher([[/ok/, () => ({ status: 200, body: { a: 1 } })]]);
    const result = await probeJson<{ a: number }>({ fetcher, name: "t", url: "https://x/ok" });
    expect(result.outcome).toBe("ok");
    expect(result.body?.a).toBe(1);
  });

  test("turns a network failure into a result instead of throwing", async () => {
    const fetcher = async () => {
      throw new Error("ECONNRESET");
    };
    const result = await probeJson({ fetcher, name: "t", url: "https://x" });
    expect(result.outcome).toBe("network_error");
    expect(result.error).toContain("ECONNRESET");
  });
});
