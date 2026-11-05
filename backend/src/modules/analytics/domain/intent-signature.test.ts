import { describe, expect, it } from "bun:test";
import { computeIntentSignature } from "./intent-signature";

describe("computeIntentSignature", () => {
  it("generates deterministic canonical signature from constraints and aspect priorities", () => {
    const sig1 = computeIntentSignature({
      maxPriceCents: 180000,
      has5G: true,
      minRamGb: 8,
      aspectWeights: {
        battery: 0.4,
        camera: 0.1,
        performance: 0.3,
        valueForMoney: 0.2,
      },
    });

    const sig2 = computeIntentSignature({
      // Same criteria with different key order
      minRamGb: 8,
      has5G: true,
      maxPriceCents: 180000,
      aspectWeights: {
        valueForMoney: 0.2,
        performance: 0.3,
        camera: 0.1,
        battery: 0.4,
      },
    });

    expect(sig1).toBe(sig2);
    expect(sig1).toContain("price:<=2000");
    expect(sig1).toContain("5g:true");
    expect(sig1).toContain("ram:>=8");
    expect(sig1).toContain("bat:high");
  });

  it("handles empty criteria with default global signature", () => {
    const sig = computeIntentSignature({});
    expect(sig).toBe("default");
  });
});
