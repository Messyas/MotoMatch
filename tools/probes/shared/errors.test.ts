import { describe, expect, test } from "bun:test";
import { ExternalServiceError } from "./errors";

describe("ExternalServiceError", () => {
  test("builds a descriptive message and keeps the cause", () => {
    const cause = new Error("socket hang up");
    const error = new ExternalServiceError({
      provider: "youtube",
      operation: "commentThreads.list",
      status: 403,
      reason: "commentsDisabled",
      detail: "video abc will be skipped",
      cause,
    });
    expect(error.message).toBe("youtube commentThreads.list failed with HTTP 403 (commentsDisabled): video abc will be skipped");
    expect(error.cause).toBe(cause);
    expect(error.code).toBe("EXTERNAL_SERVICE_FAILED");
  });

  test.each([
    [429, true],
    [503, true],
    [null, true],
    [400, false],
    [403, false],
    [404, false],
  ])("status %p is retryable=%p", (status, retryable) => {
    expect(new ExternalServiceError({ provider: "p", operation: "o", status }).retryable).toBe(retryable);
  });
});
