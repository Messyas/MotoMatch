import { describe, expect, it } from "bun:test";
import { RuleBasedCriteriaExtractor } from "./rule-based-criteria-extractor";

describe("RuleBasedCriteriaExtractor", () => {
  it("extracts maxPrice, 5G, and aspect priorities", async () => {
    const extractor = new RuleBasedCriteriaExtractor();
    const result = await extractor.extract(
      "quero um celular até 1800 reais com 5G e bateria que dure o dia todo",
    );

    const maxPrice = result.constraints.find((c) => c.kind === "maxPrice");
    expect(maxPrice).toBeDefined();
    expect((maxPrice as any).value).toBe(180000);

    const has5g = result.constraints.find((c) => c.kind === "requires5g");
    expect(has5g).toBeDefined();

    expect(result.prioritizedAspects.some((p) => p.aspect === "battery")).toBe(true);
  });

  it("extracts brand and minimum RAM", async () => {
    const extractor = new RuleBasedCriteriaExtractor();
    const result = await extractor.extract("Samsung com 8GB de RAM para jogos");

    const brand = result.constraints.find((c) => c.kind === "brand");
    expect(brand).toBeDefined();
    expect((brand as any).value).toBe("Samsung");

    const ram = result.constraints.find((c) => c.kind === "minRamGb");
    expect(ram).toBeDefined();
    expect((ram as any).value).toBe(8);

    expect(result.prioritizedAspects.some((p) => p.aspect === "performance")).toBe(true);
  });
});
