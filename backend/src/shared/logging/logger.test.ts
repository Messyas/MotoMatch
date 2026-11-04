import { describe, expect, it } from "bun:test";
import { MemoryLogger } from "./logger";

describe("Logger", () => {
  it("records log entries and redacts sensitive keys", () => {
    const logger = new MemoryLogger();
    logger.info("auth.attempt", {
      username: "alice",
      token: "secret-token-123",
      apiKey: "secret-api-key",
      nested: { password: "p4ss" },
    });

    expect(logger.entries).toHaveLength(1);
    const entry = logger.entries[0]!;
    expect(entry.event).toBe("auth.attempt");
    expect(entry.level).toBe("info");
    expect(entry.context?.username).toBe("alice");
    expect(entry.context?.token).toBe("[REDACTED]");
    expect(entry.context?.apiKey).toBe("[REDACTED]");
    expect((entry.context?.nested as Record<string, unknown>).password).toBe("[REDACTED]");
  });

  it("can clear entries", () => {
    const logger = new MemoryLogger();
    logger.warn("system.warning", { count: 1 });
    expect(logger.entries).toHaveLength(1);
    logger.clear();
    expect(logger.entries).toHaveLength(0);
  });
});
