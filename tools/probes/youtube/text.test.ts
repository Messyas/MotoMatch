import { describe, expect, test } from "bun:test";
import { findTerms, normalize, titleMatchesModel } from "./text";

describe("normalize", () => {
  test("removes accents and punctuation", () => {
    expect(normalize("Câmera ÓTIMA, vale a pena!!")).toBe("camera otima vale a pena");
  });
});

describe("titleMatchesModel", () => {
  const cases: Array<[title: string, model: string, expected: boolean]> = [
    ["Moto G85 5G: REVIEW completo", "Moto G85", true],
    ["Motorola moto g 85 depois de 6 meses", "Moto G85", true],
    ["Moto G85 review", "Motorola Moto G85", true],
    ["Moto G84 vale a pena?", "Moto G85", false],
    ["Moto G850 existe?", "Moto G85", false],
    ["iPhone 15 Pro Max análise", "iPhone 15", false],
    ["iPhone 15 Pro Max análise", "iPhone 15 Pro Max", true],
    ["iPhone 15 depois de 1 ano", "iPhone 15", true],
    ["Galaxy A55 vs Moto G85", "Galaxy A55", true],
    ["Moto G85 x Galaxy A35 comparativo", "Moto G85", true],
    ["Galaxy A55s chegou", "Galaxy A55", false],
    ["Redmi Note 13 Pro review", "Redmi Note 13", false],
    ["Moto G85 e o Galaxy A35: qual comprar", "Moto G85", true],
  ];
  for (const [title, model, expected] of cases) {
    test(`${expected ? "matches" : "rejects"} "${title}" for "${model}"`, () => {
      expect(titleMatchesModel(title, model)).toBe(expected);
    });
  }
});

describe("findTerms", () => {
  test("matches whole words and phrases, never fragments", () => {
    const text = normalize("Vale a pena? A capacidade da bateria é boa");
    expect(findTerms(text, ["vale a pena", "bateria", "capa"])).toEqual(["vale a pena", "bateria"]);
  });
});
