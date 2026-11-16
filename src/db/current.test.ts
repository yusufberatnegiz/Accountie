import { describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({ getDb: vi.fn() }));
const { current } = await import("./queries");

describe("fişin şu anki uyarıları", () => {
  const w = (code: string) => ({ code, message: code });
  it("seçilmemiş araç fişi taslağında araç sorusu çıkar; seçilmişte ya da onaylıda çıkmaz", () => {
    expect(current([], { status: "draft", category: "fuel" }, false).map((x) => x.code)).toEqual(["vehicle_choice"]);
    expect(current([], { status: "draft", category: "fuel" }, true)).toEqual([]);
    expect(current([], { status: "approved", category: "fuel" }, false)).toEqual([]);
    expect(current([], { status: "draft", category: "maintenance" }, false)).toEqual([]);
  });
  it("kaldırılan binek ve ağırlama uyarıları eski kayıtlarda da görünmez", () => {
    expect(current([w("vehicle"), w("meal"), w("date_invalid")], { status: "draft", category: "meal" }, false).map((x) => x.code)).toEqual(["date_invalid"]);
  });
});
