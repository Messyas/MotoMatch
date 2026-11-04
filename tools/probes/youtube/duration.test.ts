import { describe, expect, test } from "bun:test";
import { parseIsoDuration, parseVideoId } from "./duration";

describe("parseIsoDuration", () => {
  test("parses common formats", () => {
    expect(parseIsoDuration("PT12M30S")).toBe(750);
    expect(parseIsoDuration("PT1H2M3S")).toBe(3723);
    expect(parseIsoDuration("PT45S")).toBe(45);
    expect(parseIsoDuration("P1DT1S")).toBe(86401);
  });
  test("returns null for invalid input", () => {
    expect(parseIsoDuration("")).toBeNull();
    expect(parseIsoDuration("12:30")).toBeNull();
    expect(parseIsoDuration("PT")).toBeNull();
  });
});

describe("parseVideoId", () => {
  const id = "dQw4w9WgXcQ";
  test.each([
    id,
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?feature=share&v=${id}&t=10`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `  https://m.youtube.com/watch?v=${id}  `,
  ])("extracts the id from %s", (input) => {
    expect(parseVideoId(input)).toBe(id);
  });
  test("rejects non-YouTube input", () => {
    expect(parseVideoId("https://vimeo.com/123")).toBeNull();
    expect(parseVideoId("abc")).toBeNull();
  });
});
