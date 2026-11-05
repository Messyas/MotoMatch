import { describe, expect, it } from "bun:test";
import { RuleBasedSentimentAnalyzer } from "./rule-based-sentiment-analyzer";

describe("RuleBasedSentimentAnalyzer", () => {
  const analyzer = new RuleBasedSentimentAnalyzer();

  it("extracts positive battery sentiment", async () => {
    const reviews = [
      {
        id: "rev-1",
        content: "A bateria dura muito, excelente autonomia o dia todo!",
      },
    ];

    const result = await analyzer.analyzeBatch(reviews);
    const aspects = result.get("rev-1");

    expect(aspects).toBeDefined();
    expect(aspects).toHaveLength(1);
    expect(aspects![0]!.aspect).toBe("battery");
    expect(aspects![0]!.sentiment).toBe("positive");
    expect(aspects![0]!.score).toBeGreaterThanOrEqual(4);
  });

  it("extracts negative performance sentiment", async () => {
    const reviews = [
      {
        id: "rev-2",
        content: "O desempenho é péssimo, esquenta muito e trava em qualquer jogo",
      },
    ];

    const result = await analyzer.analyzeBatch(reviews);
    const aspects = result.get("rev-2");

    expect(aspects).toBeDefined();
    expect(aspects![0]!.aspect).toBe("performance");
    expect(aspects![0]!.sentiment).toBe("negative");
    expect(aspects![0]!.score).toBeLessThanOrEqual(2);
  });

  it("returns neutral or default 3 when no strong sentiment keyword is present", async () => {
    const reviews = [
      {
        id: "rev-3",
        content: "Testei a câmera tirando algumas fotos no parque",
      },
    ];

    const result = await analyzer.analyzeBatch(reviews);
    const aspects = result.get("rev-3");

    expect(aspects).toBeDefined();
    expect(aspects![0]!.aspect).toBe("camera");
    expect(aspects![0]!.sentiment).toBe("neutral");
    expect(aspects![0]!.score).toBe(3);
  });
});
