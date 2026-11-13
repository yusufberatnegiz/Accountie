import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

describe("giriş sonrası dönüş yolu", () => {
  it("panel yollarını kabul eder", () => {
    for (const p of ["/panel", "/panel/kurallar", "/panel/fis/3f2a-91_b", "/panel/firmalar?ay=2026-09"]) expect(safeNextPath(p), p).toBe(p);
  });

  it("panel dışını ve açık yönlendirme denemelerini reddeder", () => {
    for (const p of ["/", "/panelx", "/panel/", "//evil.example/panel", "/panel/../giris", "/panel\\evil", "https://evil.example/panel", "/panel?x=1", "/panel?ay=2026-13", "/panel?ay=2026-09&x=1", "/panel?ay=2026-09#x", "/panel/%2F%2Fevil", "panel", "", null, undefined, 42, "/panel/" + "a".repeat(300)]) {
      expect(safeNextPath(p), String(p)).toBeNull();
    }
  });

  it("Fiyatlar'dan gelen paket yalnız Kontör sayfasında ve yalnız paket kimliği biçiminde taşınır", () => {
    expect(safeNextPath("/panel/kontor?paket=k5000")).toBe("/panel/kontor?paket=k5000");
    for (const p of ["/panel?paket=k100", "/panel/fis?paket=k100", "/panel/kontor?paket=x", "/panel/kontor?paket=k100&x=1", "/panel/kontor?paket=k100//evil", "/panel/kontor?paket=k1234567"]) {
      expect(safeNextPath(p), p).toBeNull();
    }
  });
});
