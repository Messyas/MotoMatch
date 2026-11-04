import { describe, expect, it } from "bun:test";
import { FixedClock, SystemClock } from "./clock";

describe("Clock", () => {
  it("SystemClock returns valid date and UTC day string", () => {
    const clock = new SystemClock();
    expect(clock.now()).toBeInstanceOf(Date);
    expect(clock.todayUtcString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("FixedClock maintains fixed time and advances by ms", () => {
    const clock = new FixedClock("2026-11-04T12:00:00.000Z");
    expect(clock.now().toISOString()).toBe("2026-11-04T12:00:00.000Z");
    expect(clock.todayUtcString()).toBe("2026-11-04");

    clock.advanceMs(1000 * 60 * 60 * 24); // +1 day
    expect(clock.now().toISOString()).toBe("2026-11-05T12:00:00.000Z");
    expect(clock.todayUtcString()).toBe("2026-11-05");
  });
});
