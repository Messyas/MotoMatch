import { describe, expect, test } from "bun:test";
import { evaluateComment } from "./comment-filter";

describe("evaluateComment", () => {
  test("an owner report with aspects is relevant and weighs more", () => {
    const verdict = evaluateComment("Comprei faz 3 meses, a bateria dura o dia todo mas a câmera noturna é fraca");
    expect(verdict.isRelevant).toBe(true);
    expect(verdict.isOwnerReport).toBe(true);
    expect(verdict.aspects).toEqual(expect.arrayContaining(["battery", "camera"]));
    expect(verdict.weight).toBeGreaterThan(1);
  });

  test("a non-owner opinion is relevant with baseline weight", () => {
    const verdict = evaluateComment("Esse processador esquenta demais em jogos pesados, achei caro");
    expect(verdict.isRelevant).toBe(true);
    expect(verdict.isOwnerReport).toBe(false);
    expect(verdict.weight).toBe(1);
  });

  test.each([
    ["primeiro!!!"],
    ["Ótimo vídeo, parabéns pelo conteúdo mano, sempre assisto"],
    ["Quem tá vendo em 2026? deixa o like aí galera"],
    ["Confira a promoção no link https://bit.ly/xyz bateria top"],
    ["Muito bom o vídeo cara, explicou tudo direitinho obrigado"],
  ])("drops noise: %s", (text) => {
    expect(evaluateComment(text).isRelevant).toBe(false);
  });

  test("drops praise aimed only at the creator", () => {
    expect(evaluateComment("excelente conteudo mano parabens").isRelevant).toBe(false);
  });
});
