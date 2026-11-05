import { describe, expect, it } from "bun:test";
import { chunkReviewContent } from "./text-chunker";

describe("Text Chunker", () => {
  it("chunks review content into sentences and detects aspect and sentiment", () => {
    const input = {
      reviewId: "rev-1",
      deviceId: "dev-1",
      provider: "youtube",
      content:
        "A bateria dura o dia todo com folga, excelente autonomia! A tela amoled tem 120hz com cores lindas. Mas esquenta e trava um pouco em jogos pesados.",
      publishedAt: new Date("2026-03-15T12:00:00Z"),
    };

    const chunks = chunkReviewContent(input);

    expect(chunks.length).toBe(3);

    // 1st chunk: Battery (positive)
    expect(chunks[0]!.aspect).toBe("battery");
    expect(chunks[0]!.sentiment).toBe("positive");
    expect(chunks[0]!.chunkIndex).toBe(0);
    expect(chunks[0]!.text).toContain("bateria dura o dia todo");

    // 2nd chunk: Screen (positive)
    expect(chunks[1]!.aspect).toBe("screen");
    expect(chunks[1]!.sentiment).toBe("positive");
    expect(chunks[1]!.chunkIndex).toBe(1);

    // 3rd chunk: Performance (negative)
    expect(chunks[2]!.aspect).toBe("performance");
    expect(chunks[2]!.sentiment).toBe("negative");
    expect(chunks[2]!.chunkIndex).toBe(2);
  });

  it("skips sentences without recognized aspects", () => {
    const input = {
      reviewId: "rev-2",
      deviceId: "dev-1",
      provider: "youtube",
      content:
        "Fala galera do canal, tudo bem com vocês? A câmera tira fotos incríveis mesmo à noite.",
    };

    const chunks = chunkReviewContent(input);

    expect(chunks.length).toBe(1);
    expect(chunks[0]!.aspect).toBe("camera");
    expect(chunks[0]!.text).toContain("câmera tira fotos");
  });

  it("handles short or empty content gracefully", () => {
    expect(
      chunkReviewContent({
        reviewId: "rev-3",
        deviceId: "dev-1",
        provider: "youtube",
        content: "ok",
      }),
    ).toHaveLength(0);
  });
});
