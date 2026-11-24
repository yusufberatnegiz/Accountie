import { describe, expect, it } from "vitest";
import { byFirm, daysSince, gibDay, recentNotice, servedState } from "./notices";

describe("e-Tebligat tarihleri", () => {
  it("GİB tarihi gün olarak okunur, saat yok sayılır, bozuk tarih null", () => {
    expect(gibDay("23/11/2026")).toBe("2026-11-23");
    expect(gibDay("23.11.2026 14:05:00")).toBe("2026-11-23");
    expect(gibDay("2026-11-23")).toBeNull();
    expect(gibDay(null)).toBeNull();
  });
  it("tebliğ günü Türkiye saatiyle: o gün ve sonrası geçmiş, öncesi ileri", () => {
    const now = new Date("2026-11-22T22:30:00Z"); // Türkiye'de 23 Kasım 01:30
    expect(servedState("22/11/2026", now)).toBe("past");
    expect(servedState("23/11/2026", now)).toBe("today");
    expect(servedState("24/11/2026", now)).toBe("future");
    expect(servedState(null, now)).toBeNull();
  });
  it("gün farkı", () => {
    expect(daysSince(new Date("2026-11-12T09:00:00Z"), new Date("2026-11-20T08:00:00Z"))).toBe(7);
  });
});

describe("e-Tebligat firma çekmeceleri", () => {
  const row = (id: string, firmId: string, firmName: string, isNew: boolean) => ({ id, firmId, firmName, isNew });

  it("firmaya göre toplar, yeni sayısını sayar; yenisi çok olan firma önde, eşitlikte gelen sıra (en yeni bulunan önde); satır sırası korunur", () => {
    const groups = byFirm([row("1", "z", "ZEYTİN", false), row("2", "a", "ALFA", true), row("3", "c", "ÇAĞ", true), row("4", "c", "ÇAĞ", true), row("5", "a", "ALFA", false), row("6", "b", "BETA", false)]);
    expect(groups.map((g) => [g.firmName, g.fresh, g.rows.map((r) => r.id)])).toEqual([["ÇAĞ", 2, ["3", "4"]], ["ALFA", 1, ["2", "5"]], ["ZEYTİN", 0, ["1"]], ["BETA", 0, ["6"]]]);
  });

  it("boş liste boş çekmece listesi", () => {
    expect(byFirm([])).toEqual([]);
  });
});

describe("e-Tebligat: yalnız son bir hafta", () => {
  const now = new Date("2026-11-24T09:00:00Z");
  const n = (sentAt: string | null, servedAt: string | null = null) => recentNotice({ sentAt, servedAt }, now);

  it("gönderimi 7 gün içindeyse alınır, daha eskiyse alınmaz", () => {
    expect(n("24/11/2026")).toBe(true);
    expect(n("17/11/2026 14:05:00")).toBe(true);
    expect(n("16/11/2026")).toBe(false);
    expect(n("15/06/2026")).toBe(false);
  });

  it("gönderim tarihi yoksa tebliğ tarihine bakılır; hiç tarih okunamazsa kaybolmasın diye alınır", () => {
    expect(n(null, "20/11/2026")).toBe(true);
    expect(n(null, "01/06/2026")).toBe(false);
    expect(n(null, null)).toBe(true);
    expect(n("tarih yok")).toBe(true);
  });
});
