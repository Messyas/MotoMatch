import { describe, expect, it } from "bun:test";
import {
  ConflictError,
  DatabaseUnavailableError,
  ExternalServiceError,
  ForbiddenError,
  InvalidConfigError,
  NotFoundError,
  QuotaExhaustedError,
  UnauthorizedError,
  ValidationError,
} from "./app-error";

describe("AppError hierarchy", () => {
  it("creates standard errors with status codes and codes", () => {
    const notFound = new NotFoundError("Device not found", { context: { id: "123" } });
    expect(notFound.code).toBe("NOT_FOUND");
    expect(notFound.httpStatus).toBe(404);
    expect(notFound.retryable).toBe(false);
    expect(notFound.context).toEqual({ id: "123" });

    const validation = new ValidationError("Invalid payload");
    expect(validation.code).toBe("VALIDATION_FAILED");
    expect(validation.httpStatus).toBe(400);

    const conflict = new ConflictError("Device already exists");
    expect(conflict.code).toBe("CONFLICT");
    expect(conflict.httpStatus).toBe(409);

    const unauthorized = new UnauthorizedError("Admin key missing");
    expect(unauthorized.code).toBe("UNAUTHORIZED");
    expect(unauthorized.httpStatus).toBe(401);

    const forbidden = new ForbiddenError("Forbidden action");
    expect(forbidden.code).toBe("FORBIDDEN");
    expect(forbidden.httpStatus).toBe(403);

    const quota = new QuotaExhaustedError("Daily quota exhausted");
    expect(quota.code).toBe("QUOTA_EXHAUSTED");
    expect(quota.httpStatus).toBe(429);
  });

  it("marks DatabaseUnavailableError as retryable=true with 503", () => {
    const dbErr = new DatabaseUnavailableError("DB connection refused", { cause: new Error("ECONNREFUSED") });
    expect(dbErr.code).toBe("DATABASE_UNAVAILABLE");
    expect(dbErr.httpStatus).toBe(503);
    expect(dbErr.retryable).toBe(true);
    expect(dbErr.cause).toBeDefined();
  });

  it("formats ExternalServiceError with provider, operation, status and details", () => {
    const ext = new ExternalServiceError({
      provider: "youtube",
      operation: "commentThreads.list",
      status: 429,
      retryable: true,
      detail: "quota exceeded",
    });
    expect(ext.code).toBe("EXTERNAL_SERVICE_FAILED");
    expect(ext.httpStatus).toBe(502);
    expect(ext.retryable).toBe(true);
    expect(ext.message).toBe("youtube commentThreads.list failed with HTTP 429: quota exceeded");
    expect(ext.context).toEqual({ provider: "youtube", operation: "commentThreads.list", status: 429 });
  });

  it("formats InvalidConfigError with all issues concatenated", () => {
    const configErr = new InvalidConfigError([
      { path: ["gemini", "apiKey"], message: "Required" },
      { path: ["database", "url"], message: "Must be a valid URL" },
    ]);
    expect(configErr.code).toBe("INVALID_CONFIG");
    expect(configErr.httpStatus).toBe(500);
    expect(configErr.message).toBe("Invalid configuration: gemini.apiKey: Required; database.url: Must be a valid URL");
  });
});
