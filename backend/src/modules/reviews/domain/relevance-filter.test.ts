import { describe, expect, it } from "bun:test";
import { evaluateComment } from "./relevance-filter";

describe("Relevance Filter", () => {
  it("an owner report with aspects is relevant and weighs more", () => {
    const verdict = evaluateComment(
      "Comprei o meu ha 3 meses e a bateria dura o dia todo, cameras muito boas",
    );
    expect(verdict.isRelevant).toBe(true);
    expect(verdict.isOwnerReport).toBe(true);
    expect(verdict.weight).toBeGreaterThan(1.0);
    expect(verdict.aspects).toContain("battery");
    expect(verdict.aspects).toContain("camera");
  });

  it("a non-owner opinion is relevant with baseline weight", () => {
    const verdict = evaluateComment(
      "Pelo preco esse processador roda qualquer jogo sem travamentos",
    );
    expect(verdict.isRelevant).toBe(true);
    expect(verdict.isOwnerReport).toBe(false);
    expect(verdict.weight).toBe(1.0);
    expect(verdict.aspects).toContain("performance");
  });

  it("drops noise: too short", () => {
    const verdict = evaluateComment("Top!");
    expect(verdict.isRelevant).toBe(false);
    expect(verdict.reasons[0]).toBe("too short");
  });

  it("drops noise: spam links and engagement bait", () => {
    const verdict = evaluateComment(
      "Confira a promocao imperdivel no link https://bit.ly/xyz bateria top",
    );
    expect(verdict.isRelevant).toBe(false);
    expect(verdict.reasons[0]).toBe("spam, link or engagement bait");
  });

  it("drops noise: creator praise only", () => {
    const verdict = evaluateComment(
      "Muito bom o video mano parabens pelo canal",
    );
    expect(verdict.isRelevant).toBe(false);
  });
});
