import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { NotFoundError } from "../errors/app-error";
import { MemoryLogger } from "../logging/logger";
import { createErrorHandler } from "./error-handler";

describe("createErrorHandler", () => {
  it("formats AppError into standardized JSON response", async () => {
    const logger = new MemoryLogger();
    const app = new Hono();
    app.onError(createErrorHandler(logger));

    app.get("/test-not-found", () => {
      throw new NotFoundError("Device not found", { context: { deviceId: "d1" } });
    });

    const res = await app.request("/test-not-found");
    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Device not found",
        details: { deviceId: "d1" },
      },
    });
  });

  it("masks unexpected errors with 500 INTERNAL_SERVER_ERROR", async () => {
    const logger = new MemoryLogger();
    const app = new Hono();
    app.onError(createErrorHandler(logger));

    app.get("/test-crash", () => {
      throw new Error("Secret database stack trace");
    });

    const res = await app.request("/test-crash");
    expect(res.status).toBe(500);
    const body = (await res.json()) as any;
    expect(body).toEqual({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      },
    });
    expect(logger.entries).toHaveLength(1);
    expect(logger.entries[0]?.event).toBe("http.unhandled_error");
  });
});
