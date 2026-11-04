import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { createErrorHandler } from "./error-handler";
import { createAdminAuthMiddleware, timingSafeEqualString } from "./admin-auth.middleware";

describe("adminAuthMiddleware", () => {
  it("timingSafeEqualString correctly compares strings", () => {
    expect(timingSafeEqualString("secret", "secret")).toBe(true);
    expect(timingSafeEqualString("secret", "wrong")).toBe(false);
    expect(timingSafeEqualString("secret", "secre")).toBe(false);
  });

  it("blocks requests without X-Admin-Key", async () => {
    const app = new Hono();
    app.onError(createErrorHandler());
    app.use("/admin/*", createAdminAuthMiddleware("super-secret-key-123456789"));
    app.get("/admin/test", (c) => c.text("ok"));

    const res = await app.request("/admin/test");
    expect(res.status).toBe(401);
  });

  it("blocks requests with incorrect X-Admin-Key", async () => {
    const app = new Hono();
    app.onError(createErrorHandler());
    app.use("/admin/*", createAdminAuthMiddleware("super-secret-key-123456789"));
    app.get("/admin/test", (c) => c.text("ok"));

    const res = await app.request("/admin/test", {
      headers: { "X-Admin-Key": "wrong-key-value-123456789" },
    });
    expect(res.status).toBe(401);
  });

  it("allows requests with correct X-Admin-Key", async () => {
    const app = new Hono();
    app.onError(createErrorHandler());
    app.use("/admin/*", createAdminAuthMiddleware("super-secret-key-123456789"));
    app.get("/admin/test", (c) => c.text("ok"));

    const res = await app.request("/admin/test", {
      headers: { "X-Admin-Key": "super-secret-key-123456789" },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });
});
