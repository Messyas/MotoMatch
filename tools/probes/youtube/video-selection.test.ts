import { describe, expect, test } from "bun:test";
import { aVideo } from "../test/video-candidate.builder";
import { inferLaunchDate, phaseOf, scoreVideo, selectVideos } from "./video-selection";

const MODEL = "Moto G85";
const LAUNCH = "2025-01-01T00:00:00Z";
const score = (builder: ReturnType<typeof aVideo>) => scoreVideo({ video: builder.build(), model: MODEL, launchDate: LAUNCH });

describe("phaseOf", () => {
  test("uses the default phase boundaries", () => {
    expect(phaseOf(0)).toBe("launch");
    expect(phaseOf(2)).toBe("launch");
    expect(phaseOf(6)).toBe("mid");
    expect(phaseOf(12)).toBe("long");
  });
});

describe("scoreVideo", () => {
  test("rejects wrong model, shorts and disabled comments", () => {
    expect(score(aVideo().titled("Moto G84 review")).isRejected).toBe(true);
    expect(score(aVideo().lasting(50)).isRejected).toBe(true);
    expect(score(aVideo().withCommentsDisabled()).isRejected).toBe(true);
  });
  test("scores a long-term review above an unboxing", () => {
    const longTerm = score(aVideo().titled("Moto G85 depois de 6 meses de uso: vale a pena?"));
    const unboxing = score(aVideo().titled("Moto G85 unboxing"));
    expect(longTerm.score).toBeGreaterThan(unboxing.score);
  });
  test("penalizes accessory videos", () => {
    expect(score(aVideo().titled("Moto G85 melhor capinha e película")).score).toBeLessThan(score(aVideo()).score);
  });
  test("values comments more than views", () => {
    const manyComments = score(aVideo().withComments(5000).withViews(10_000));
    const manyViews = score(aVideo().withComments(50).withViews(1_000_000));
    expect(manyComments.score).toBeGreaterThan(manyViews.score);
  });
  test("never rejects a manual link by title and ranks it first", () => {
    const manual = score(aVideo().titled("any title").asManualLink());
    expect(manual.isRejected).toBe(false);
    expect(manual.score).toBeGreaterThan(100);
  });
});

describe("inferLaunchDate", () => {
  test("uses the oldest matching video and ignores other models", () => {
    const videos = [
      aVideo().titled("Moto G84 review").publishedAt("2024-01-01T00:00:00Z").build(),
      aVideo().publishedAt("2025-03-01T00:00:00Z").build(),
      aVideo().publishedAt("2025-02-01T00:00:00Z").build(),
    ];
    expect(inferLaunchDate({ videos, model: MODEL })).toBe("2025-02-01T00:00:00Z");
    expect(inferLaunchDate({ videos, model: MODEL, knownLaunchDate: "2025-01-15" })).toBe("2025-01-15");
  });
});

describe("selectVideos", () => {
  const candidates = [
    aVideo().withId("L1").fromChannel("a").publishedAt("2025-01-05T00:00:00Z").withComments(900).build(),
    aVideo().withId("L2").fromChannel("b").publishedAt("2025-01-20T00:00:00Z").titled("Moto G85 análise completa").withComments(700).build(),
    aVideo().withId("L3").fromChannel("a").publishedAt("2025-01-25T00:00:00Z").titled("Moto G85 review 2").withComments(2000).build(),
    aVideo().withId("M1").fromChannel("c").publishedAt("2025-07-01T00:00:00Z").titled("Moto G85 depois de 6 meses").withComments(400).build(),
    aVideo().withId("M2").fromChannel("d").publishedAt("2025-08-01T00:00:00Z").titled("Moto G85 ainda vale a pena?").withComments(350).build(),
    aVideo().withId("G1").fromChannel("e").publishedAt("2026-03-01T00:00:00Z").titled("Moto G85 1 ano de uso").withComments(120).build(),
    aVideo().withId("X1").fromChannel("f").publishedAt("2025-02-01T00:00:00Z").titled("Moto G85 capinha").withComments(5000).build(),
    aVideo().withId("S1").fromChannel("g").publishedAt("2025-01-10T00:00:00Z").lasting(40).withComments(9000).build(),
  ];

  test("mixes phases, enforces channel diversity and drops noise", () => {
    const { selected, launchDate } = selectVideos({ candidates, model: MODEL });
    const ids = selected.map((video) => video.id);
    expect(launchDate).toBe("2025-01-05T00:00:00Z");
    expect(ids).toHaveLength(5);
    expect(new Set(selected.map((video) => video.phase))).toEqual(new Set(["launch", "mid", "long"]));
    expect(ids).toContain("G1");
    expect(ids).not.toContain("S1");
    expect(ids).not.toContain("X1");
    expect(selected.filter((video) => video.channelId === "a")).toHaveLength(1);
  });

  test("puts manual links first", () => {
    const manual = aVideo().withId("MAN").titled("no model name").asManualLink().publishedAt("2025-07-15T00:00:00Z").build();
    const { selected } = selectVideos({ candidates: [...candidates, manual], model: MODEL });
    expect(selected[0]!.id).toBe("MAN");
    expect(selected.length).toBeLessThanOrEqual(5);
  });

  test("returns nothing when no candidate matches", () => {
    const { selected, launchDate } = selectVideos({ candidates: [aVideo().titled("Another phone").build()], model: MODEL });
    expect(launchDate).toBeNull();
    expect(selected).toEqual([]);
  });
});
