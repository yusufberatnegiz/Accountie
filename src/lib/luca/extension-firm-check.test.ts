import { describe, expect, it } from "vitest";
import "../../../extension/firm-check.js";

type R = { firm: string; firmLucaId: string; firmTaxNumber: string };
type Session = { sirket: string | null; taxNumber: string | null } | null;
const { AccountieFirmCheck: check } = globalThis as unknown as { AccountieFirmCheck: { firmProblem(list: R[], screen: string | null, session: Session): string | null } };

const A: R = { firm: "ÖRNEK A", firmLucaId: "11", firmTaxNumber: "1111111114" };

describe("eklenti: fişin firması Luca'da açık mı", () => {
  it("ekran ve oturum fişin firmasıysa yazılır", () => {
    expect(check.firmProblem([A], "11", { sirket: "11", taxNumber: "1111111114" })).toBeNull();
  });
  it("Luca'dan çekilmemiş firmanın fişi yazılmaz", () => {
    expect(check.firmProblem([{ ...A, firmLucaId: "" }], "11", { sirket: "11", taxNumber: null })).toMatch(/Luca'dan çekilmemiş/);
  });
  it("ekrandaki firma okunamıyorsa ya da başka firmaysa yazılmaz", () => {
    expect(check.firmProblem([A], null, { sirket: "11", taxNumber: null })).toMatch(/açık firma okunamadı/);
    expect(check.firmProblem([A], "12", { sirket: "12", taxNumber: null })).toMatch(/ÖRNEK A firmasını seçin/);
  });
  it("oturum okunamıyorsa ya da ekrandan farklıysa yazılmaz", () => {
    expect(check.firmProblem([A], "11", null)).toMatch(/oturumundaki firma okunamadı/);
    expect(check.firmProblem([A], "11", { sirket: "12", taxNumber: "1111111114" })).toMatch(/oturumdaki firma farklı/);
  });
  it("oturum numarası yoksa VKN tutarsa yazılır, tutmazsa ya da VKN yoksa yazılmaz", () => {
    expect(check.firmProblem([A], "11", { sirket: null, taxNumber: "1111111114" })).toBeNull();
    expect(check.firmProblem([A], "11", { sirket: null, taxNumber: "2222222222" })).toMatch(/doğrulanamadı/);
    expect(check.firmProblem([{ ...A, firmTaxNumber: "" }], "11", { sirket: null, taxNumber: "1111111114" })).toMatch(/doğrulanamadı/);
    expect(check.firmProblem([A], "11", { sirket: null, taxNumber: null })).toMatch(/doğrulanamadı/);
  });
});
