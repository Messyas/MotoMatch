import { describe, expect, it } from "bun:test";
import { findAspects, normalizeText } from "./text-normalizer";

describe("Text Normalizer", () => {
  it("normalizes accents, diacritics and case", () => {
    expect(normalizeText("Ótimo celular! Bateria dura muito.")).toBe(
      "otimo celular bateria dura muito",
    );
    expect(normalizeText("CÂMERA excelente, com zoom incrível...")).toBe(
      "camera excelente com zoom incrivel",
    );
  });

  it("finds mentioned aspects based on vocabulary", () => {
    const text = "A bateria dura o dia todo mas o carregador esquenta e trava no jogo";
    const aspects = findAspects(text);
    expect(aspects).toContain("battery");
    expect(aspects).toContain("performance");
  });

  it("handles empty or punctuation-only strings", () => {
    expect(normalizeText("   ")).toBe("");
    expect(normalizeText("??? !!! ...")).toBe("");
    expect(findAspects("")).toEqual([]);
  });
});
