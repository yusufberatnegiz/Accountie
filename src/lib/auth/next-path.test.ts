import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

describe("giriş sonrası dönüş yolu", () => {
  it("panel yollarını kabul eder", () => {
    for (const p of ["/panel", "/panel/kurallar", "/panel/fis/3f2a-91_b"]) expect(safeNextPath(p), p).toBe(p);
  });

  it("panel dışını ve açık yönlendirme denemelerini reddeder", () => {
    for (const p of ["/", "/panelx", "/panel/", "//evil.example/panel", "/panel/../giris", "/panel\\evil", "https://evil.example/panel", "/panel?x=1", "/panel/%2F%2Fevil", "panel", "", null, undefined, 42, "/panel/" + "a".repeat(300)]) {
      expect(safeNextPath(p), String(p)).toBeNull();
    }
  });
});
