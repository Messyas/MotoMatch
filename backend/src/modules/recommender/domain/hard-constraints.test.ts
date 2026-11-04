import { describe, expect, it } from "bun:test";
import { aDevice } from "../../../../test/builders/device.builder";
import { applyHardConstraints } from "./hard-constraints";

describe("Hard Constraints", () => {
  it("filters devices by maxPrice, 5G, and minimum RAM", () => {
    const d1 = aDevice().withId("d1").withPriceCents(150000).with5g(true).withRamGb(8).build();
    const d2 = aDevice().withId("d2").withPriceCents(200000).with5g(true).withRamGb(8).build(); // too expensive
    const d3 = aDevice().withId("d3").withPriceCents(130000).with5g(false).withRamGb(8).build(); // no 5g
    const d4 = aDevice().withId("d4").withPriceCents(140000).with5g(true).withRamGb(4).build(); // low ram

    const res = applyHardConstraints([d1, d2, d3, d4], [
      { kind: "maxPrice", value: 160000 },
      { kind: "requires5g" },
      { kind: "minRamGb", value: 6 },
    ]);

    expect(res.filtered).toHaveLength(1);
    expect(res.filtered[0]?.id).toBe("d1");
    expect(res.relaxationNotice).toBeUndefined();
  });

  it("relaxes maxPrice when no candidate matches and provides a notice", () => {
    const d1 = aDevice().withId("d1").withModel("Galaxy A55").withPriceCents(164900).with5g(true).build();
    const d2 = aDevice().withId("d2").withModel("Edge 50 Ultra").withPriceCents(299900).with5g(true).build();

    const res = applyHardConstraints([d1, d2], [
      { kind: "maxPrice", value: 150000 },
      { kind: "requires5g" },
    ]);

    expect(res.filtered).toHaveLength(2);
    expect(res.filtered[0]?.id).toBe("d1");
    expect(res.relaxationNotice).toBeDefined();
    expect(res.relaxationNotice).toContain("Galaxy A55");
  });
});
