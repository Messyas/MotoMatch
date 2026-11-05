import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { createErrorHandler } from "./error-handler";
import { createCronAuthMiddleware } from "./cron-auth.middleware";

describe("cronAuthMiddleware", () => {
  const secret = "super-secret-cron-token-24-chars";
  const app = new Hono();
  app.onError(createErrorHandler());
  app.use("/internal/*", createCronAuthMiddleware(secret));
  app.post("/internal/tick", (c) => c.json({ ok: true }));

  it("blocks requests without X-Cron-Secret", async () => {
    const res = await app.request("/internal/tick", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("blocks requests with incorrect X-Cron-Secret", async () => {
    const res = await app.request("/internal/tick", {
      method: "POST",
      headers: { "X-Cron-Secret": "wrong-secret-token-xyz" },
    });
    expect(res.status).toBe(401);
  });

  it("allows requests with correct X-Cron-Secret", async () => {
    const res = await app.request("/internal/tick", {
      method: "POST",
      headers: { "X-Cron-Secret": secret },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.ok).toBe(true);
  });
});
