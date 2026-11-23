import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../extension/luca-import.js";

type Period = { lucaId: string; shortName: string; donemId: string; start: string; end: string };
type Luca = {
  firmsToImport(list: string[][], year: string): Period[];
  activeIds(list: string[][], year: string): Set<string>;
  selected(list: string[][], sirketId: string, donemId: string): Period | null;
  switchUrl(f: Period): string;
  parseIdentity(text: string): { name: string; start: string; end: string; taxNumber: string | null } | null;
  parsePlan(doc: unknown): { code: string; name: string }[];
  sessionIds(html: string): { sirket: string | null; donem: string | null };
  readFirm(f: Period, verifyIds?: boolean): Promise<{ lucaId: string; name: string; taxNumber: string | null; accounts: { code: string; name: string }[]; verified: boolean }>;
};
const { AccountieLuca: luca } = globalThis as unknown as { AccountieLuca: Luca };

// Luca'nın sirketDonem dizisi: [0] firma no, [1] kısa ad, 5'ten sonra dörtlüler (dönem no, başlangıç, bitiş, bayrak).
const LIST = [
  ["11", "ÖRNEK A", "", "", "", "501", "01/01/2025", "31/12/2025", "0", "502", "01/01/2026", "31/12/2026", "1"],
  ["12", "ÖRNEK B", "", "", "", "601", "01/01/2024", "31/12/2024", "0"],
];

describe("Luca firma listesi", () => {
  it("her firmayı verir: o yılın dönemiyle, o yıl dönemi açılmamışsa en son dönemiyle", () => {
    expect(luca.firmsToImport(LIST, "2025")).toEqual([
      { lucaId: "11", shortName: "ÖRNEK A", donemId: "501", start: "01/01/2025", end: "31/12/2025" },
      { lucaId: "12", shortName: "ÖRNEK B", donemId: "601", start: "01/01/2024", end: "31/12/2024" },
    ]);
    expect(luca.firmsToImport(LIST, "2027").map((f) => f.donemId)).toEqual(["502"]);
    expect(luca.firmsToImport([["13", "DÖNEMSİZ", "", "", ""]], "2026")).toEqual([]);
    // Last period ended in 2024: closed by 2026, not brought in; still current for 2025.
    expect(luca.firmsToImport(LIST, "2026").map((f) => f.lucaId)).toEqual(["11"]);
    expect(luca.firmsToImport([["14", "GEÇEN YIL", "", "", "", "701", "01/01/2025", "31/12/2025", "0"]], "2026").map((f) => f.donemId)).toEqual(["701"]);
  });

  it("e-Tebligat için yalnız bu yıl dönemi olan firmalar aktif sayılır", () => {
    expect([...luca.activeIds(LIST, "2026")]).toEqual(["11"]);
    expect([...luca.activeIds(LIST, "2024")]).toEqual(["12"]);
    expect([...luca.activeIds(LIST, "2027")]).toEqual([]);
  });

  it("şu an seçili firma ve dönemi bulur; bulamazsa null", () => {
    expect(luca.selected(LIST, "12", "601")?.shortName).toBe("ÖRNEK B");
    expect(luca.selected(LIST, "12", "502")).toBeNull();
  });

  it("firma değiştirme adresi Luca'nın kendi seçicisinin gittiği adrestir", () => {
    const url = luca.switchUrl({ lucaId: "11", shortName: "ÖRNEK A", donemId: "502", start: "01/01/2026", end: "31/12/2026" });
    expect(url).toMatch(/^TopFrameAction\.do\?SIRKET_ID=11&DONEM_ID=502&DONEM_TXT=01\/01\/2026%20-%2031\/12\/2026&time=\d+$/);
  });
});

describe("Luca oturum numaraları", () => {
  it("firma ve dönem numarasını yalnız __SESSION nesnesinden okur", () => {
    expect(luca.sessionIds(`<input name="SIRKET_ID" value="9"><script>var __SESSION = {"SIRKET_ID":"11","DONEM_ID":"502","USER":"x"};</script>`))
      .toEqual({ sirket: "11", donem: "502" });
    expect(luca.sessionIds(`<script>var __SESSION = { SIRKET_ID: 12, DONEM_ID: 601 };</script>`)).toEqual({ sirket: "12", donem: "601" });
    // No __SESSION: no number, so only the period dates are checked.
    expect(luca.sessionIds(`<input name="SIRKET_ID" value="9">`)).toEqual({ sirket: null, donem: null });
    // A longer key is not the key; a nested object before it does not end the search.
    expect(luca.sessionIds(`<script>var __SESSION = {"USER":{"ID":1},"ANA_SIRKET_ID":3,"ONCEKI_DONEM_ID":400,"SIRKET_ID":11,"DONEM_ID":502};</script>`))
      .toEqual({ sirket: "11", donem: "502" });
  });
});

describe("Luca firma kimliği", () => {
  it("tam unvanı, dönemi ve vergi numarasını okur", () => {
    expect(luca.parseIdentity("  Şu an ÖRNEK GIDA\n SAN. VE TİC. LTD. ŞTİ. 01/01/2026-31/12/2026 döneminde çalışıyorsunuz!  Vergi No: 1234567890 "))
      .toEqual({ name: "ÖRNEK GIDA SAN. VE TİC. LTD. ŞTİ.", start: "01/01/2026", end: "31/12/2026", taxNumber: "1234567890" });
  });

  it("vergi numarası yoksa null, cümle yoksa hiçbir şey", () => {
    expect(luca.parseIdentity("Şu an ÖRNEK A 01/01/2026 - 31/12/2026 döneminde çalışıyorsunuz!")?.taxNumber).toBeNull();
    expect(luca.parseIdentity("Oturumunuz sona erdi.")).toBeNull();
  });
});

describe("Luca hesap planı", () => {
  const tr = (...cells: string[]) => ({ children: cells.map((textContent) => ({ textContent })) });
  const doc = (rows: unknown[]) => ({ querySelectorAll: () => rows });

  it("kod ve adı okur; başlık satırlarını, tek hücreli satırları ve yinelenen kodu atlar", () => {
    expect(luca.parsePlan(doc([
      tr("Hesap Kodu", "Hesap Adı"), tr(" 770.08 ", " Yeme-İçme Ve Ağırlama "), tr("320.M07", "ÖRNEK SATICI"), tr("770.08", "Yinelenen"), tr("100"), tr("Toplam", "18"),
    ]))).toEqual([{ code: "770.08", name: "Yeme-İçme Ve Ağırlama" }, { code: "320.M07", name: "ÖRNEK SATICI" }]);
  });
});

// Luca's pages as the reader fetches them: the firm picker, the firm's details (with __SESSION) and its chart of accounts.
function fakeLuca(open: { sirket: string; donem: string; name: string; start: string; end: string }) {
  const pages = (path: string) => {
    if (path.startsWith("TopFrameAction.do")) return `<html><body><select id="SirketCombo"></select><script>alert('x')</script></body></html>`;
    if (path.startsWith("musteriBilgileri.do")) return `<html><body>Şu an ${open.name} ${open.start}-${open.end} döneminde çalışıyorsunuz! Vergi No: 1234567890<script>var __SESSION = {"SIRKET_ID":"${open.sirket}","DONEM_ID":"${open.donem}"};</script></body></html>`;
    return `<table><tr><td>770.01</td><td>Akaryakıt</td></tr></table>`;
  };
  vi.stubGlobal("fetch", async (path: string) => new Response(pages(path), { headers: { "content-type": "text/html; charset=utf-8" } }));
  vi.stubGlobal("DOMParser", class {
    parseFromString(text: string) {
      const rows = [...text.matchAll(/<tr><td>([^<]*)<\/td><td>([^<]*)<\/td><\/tr>/g)].map((m) => ({ children: [{ textContent: m[1] }, { textContent: m[2] }] }));
      return {
        body: { textContent: text.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ") },
        documentElement: { innerHTML: text },
        getElementById: (id: string) => (text.includes(`id="${id}"`) ? {} : null),
        querySelectorAll: () => rows,
      };
    }
  });
}

describe("Luca firma geçişi (sahte Luca)", () => {
  afterEach(() => vi.unstubAllGlobals());
  const f: Period = { lucaId: "11", shortName: "ÖRNEK A", donemId: "502", start: "01/01/2026", end: "31/12/2026" };

  it("dönem ve numara tutunca planı okur ve firmayı doğrulanmış sayar", async () => {
    fakeLuca({ sirket: "11", donem: "502", name: "ÖRNEK A LTD", start: "01/01/2026", end: "31/12/2026" });
    const got = await luca.readFirm(f, true);
    expect(got).toMatchObject({ lucaId: "11", name: "ÖRNEK A LTD", verified: true, accounts: [{ code: "770.01", name: "Akaryakıt" }] });
  });

  it("aynı dönemli başka firmada kalırsa (numara tutmaz) geçmedi der; iki numarayı da yazar, seçici sayfasının alert'ini yanıt saymaz", async () => {
    fakeLuca({ sirket: "12", donem: "502", name: "ÖRNEK B LTD", start: "01/01/2026", end: "31/12/2026" });
    const err = await luca.readFirm(f, true).catch((e: Error) => e.message);
    expect(err).toContain("Luca bu firmaya geçmedi");
    expect(err).toContain("no 11");
    expect(err).toContain("no 12");
    expect(err).not.toContain("Luca'nın yanıtı");
  }, 10_000);

  it("Luca dönemi aynı yıl içinde başka günden başlatsa da firma ve dönem numarası tutuyorsa geçmiş sayılır", async () => {
    const opened: Period = { ...f, start: "06/01/2026" };
    fakeLuca({ sirket: "11", donem: "502", name: "ÖRNEK A LTD", start: "01/01/2026", end: "31/12/2026" });
    expect(await luca.readFirm(opened, true)).toMatchObject({ lucaId: "11", verified: true });
  });

  it("başlangıç farklıyken numara tutmazsa, başka yıl ya da numara kontrolü kapalıysa yine geçmedi der", async () => {
    const opened: Period = { ...f, start: "06/01/2026" };
    fakeLuca({ sirket: "11", donem: "999", name: "ÖRNEK A LTD", start: "01/01/2026", end: "31/12/2026" });
    expect(await luca.readFirm(opened, true).catch((e: Error) => e.message)).toContain("Luca bu firmaya geçmedi");
    fakeLuca({ sirket: "11", donem: "502", name: "ÖRNEK A LTD", start: "01/01/2025", end: "31/12/2026" });
    expect(await luca.readFirm(opened, true).catch((e: Error) => e.message)).toContain("Luca bu firmaya geçmedi");
    fakeLuca({ sirket: "11", donem: "502", name: "ÖRNEK A LTD", start: "01/01/2026", end: "31/12/2026" });
    expect(await luca.readFirm(opened, false).catch((e: Error) => e.message)).toContain("Luca bu firmaya geçmedi");
  }, 20_000);

  it("numara kontrolü kapalıyken yalnız dönem tarihine bakar", async () => {
    fakeLuca({ sirket: "12", donem: "999", name: "ÖRNEK A LTD", start: "01/01/2026", end: "31/12/2026" });
    expect((await luca.readFirm(f, false)).verified).toBe(false);
  });
});
