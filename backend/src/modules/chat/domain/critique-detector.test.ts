import { describe, expect, it } from "bun:test";
import { detectCritique } from "./critique-detector";

describe("detectCritique", () => {
  it("detects price reduction critique", () => {
    expect(detectCritique("quero um mais barato")).toEqual({ kind: "cheaper" });
    expect(detectCritique("tem algo mais em conta?")).toEqual({ kind: "cheaper" });
  });

  it("detects similarity critique", () => {
    expect(detectCritique("tem outro parecido?")).toEqual({ kind: "similarTo" });
  });

  it("detects aspect critiques", () => {
    expect(detectCritique("preciso de mais bateria")).toEqual({ kind: "moreOf", aspect: "battery" });
    expect(detectCritique("quero uma câmera melhor")).toEqual({ kind: "moreOf", aspect: "camera" });
    expect(detectCritique("preciso de um mais rápido")).toEqual({ kind: "moreOf", aspect: "performance" });
    expect(detectCritique("prefiro tela maior")).toEqual({ kind: "moreOf", aspect: "screen" });
    expect(detectCritique("preciso de mais armazenamento")).toEqual({ kind: "moreOf", aspect: "storage" });
  });

  it("returns null for non-critique regular messages", () => {
    expect(detectCritique("ola, estou procurando um celular")).toBeNull();
    expect(detectCritique("quero um celular motorola")).toBeNull();
  });
});
