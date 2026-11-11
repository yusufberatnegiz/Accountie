import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, rulesFromRows, rulesToRows } from "./default-rules";
import { approvalProblem } from "./journal";
import { buildForeignLines, buildSalesLines, foreignTotalTl, type ForeignData, type SalesData } from "./journal-kinds";
import { bulletinUrl, rateFromBulletin, tcmbRate } from "./tcmb";

const lines = (r: { lines: { accountCode: string; debitKurus: number; creditKurus: number }[] }) => r.lines.map((l) => [l.accountCode, l.debitKurus, l.creditKurus]);
const codes = (r: { warnings: { code: string }[] }) => r.warnings.map((w) => w.code);

const google: ForeignData = { vendorName: "Google Ireland Limited", invoiceNo: "5234567890", date: "2026-10-31", currency: "TRY", totalMinor: 125000, vatMinor: 0, paymentMethod: "card" };

describe("yurt dışı hizmet faturası", () => {
  it("TL faturada gider, sorumlu sıfatıyla KDV (191 borç, 360 alacak) ve ödeme satırı kurar; dengeli ve onaylanabilir", () => {
    const r = buildForeignLines(google, DEFAULT_RULES, null);
    expect(lines(r)).toEqual([["760.01", 125000, 0], ["191.04", 25000, 0], ["360.01", 0, 25000], ["331.01", 0, 125000]]);
    expect(r.balanced).toBe(true);
    expect(r.lines.every((l) => l.documentType === "FT" && l.documentNo === "5234567890" && l.description === "GOOGLE IRELAND LIMITED")).toBe(true);
    expect(approvalProblem(r.lines)).toBeNull();
    expect(codes(r)).toEqual(["foreign_withholding"]);
  });

  it("dövizli faturayı TCMB kuruyla TL'ye çevirir ve kuru uyarıda söyler", () => {
    const usd = { ...google, currency: "USD", totalMinor: 10000 }; // 100,00 USD
    const fx = { rate: 50.1078, bulletinDate: "2026-10-30" };
    expect(foreignTotalTl(usd, fx)).toBe(501078);
    const r = buildForeignLines(usd, DEFAULT_RULES, fx);
    expect(lines(r)[0]).toEqual(["760.01", 501078, 0]);
    expect(r.balanced).toBe(true);
    expect(r.warnings[0].message).toContain("30.10.2026");
  });

  it("kur alınamazsa tutarları boş bırakır: onay tutar girilene kadar kapalı", () => {
    const r = buildForeignLines({ ...google, currency: "USD" }, DEFAULT_RULES, null);
    expect(codes(r)).toContain("foreign_rate_missing");
    expect(approvalProblem(r.lines)).toMatch(/tutar yok/);
  });

  it("faturada KDV varsa sorumlu sıfatıyla KDV hesaplamaz, uyarır", () => {
    const r = buildForeignLines({ ...google, vatMinor: 20833 }, DEFAULT_RULES, null);
    expect(lines(r)).toEqual([["760.01", 125000, 0], ["331.01", 0, 125000]]);
    expect(codes(r)).toContain("foreign_vat_charged");
  });

  it("firmanın kuralları (ör. 760.012, 191.100, 360.004, kartla ödeme 309.001) uygulanır", () => {
    const rows = rulesToRows(DEFAULT_RULES).map((r) =>
      r.kind === "foreign" && r.key === "expense" ? { ...r, accountCode: "760.012" }
      : r.kind === "foreign" && r.key === "vatIn" ? { ...r, accountCode: "191.100" }
      : r.kind === "foreign" && r.key === "vatOut" ? { ...r, accountCode: "360.004" }
      : r.kind === "payment" && r.key === "card" ? { ...r, accountCode: "309.001" }
      : r.kind === "setting" && r.key === "foreignDocumentType" ? { ...r, accountCode: "DK" } : r);
    const r = buildForeignLines(google, rulesFromRows(rows), null);
    expect(lines(r).map((l) => l[0])).toEqual(["760.012", "191.100", "360.004", "309.001"]);
    expect(r.lines[0].documentType).toBe("DK");
  });
});

const z: SalesData = {
  vendorName: "ÖRNEK KAFE", zNo: "0128", date: "2026-11-10",
  vatLines: [{ rate: 10, grossKurus: 330000, vatKurus: 30000 }, { rate: 20, grossKurus: 120000, vatKurus: 20000 }],
  totalKurus: 450000, cashKurus: 150000, cardKurus: 300000, invoicedKurus: null,
};

describe("Z raporu gelir fişi", () => {
  it("nakit ve kart borç; oran başına 600 satış ve 391 KDV alacak; dengeli", () => {
    const r = buildSalesLines(z, DEFAULT_RULES);
    expect(lines(r)).toEqual([["100.01", 150000, 0], ["108.01", 300000, 0], ["600.10", 0, 300000], ["391.10", 0, 30000], ["600.20", 0, 100000], ["391.20", 0, 20000]]);
    expect(r.balanced).toBe(true);
    expect(r.warnings).toEqual([]);
    expect(r.lines[0]).toMatchObject({ documentNo: "0128", documentType: "ÖK", description: "Z RAPORU 0128" });
    expect(approvalProblem(r.lines)).toBeNull();
  });

  it("faturalı satış varsa iki kez hasılat uyarısı verir, tutarı söyler", () => {
    const r = buildSalesLines({ ...z, invoicedKurus: 50000 }, DEFAULT_RULES);
    expect(r.warnings.find((w) => w.code === "z_invoiced")?.message).toContain("500,00");
  });

  it("tahsilat okunamazsa hepsi nakit yazılır ve uyarılır; yalnız kart okunduysa kalanı nakit olur", () => {
    const none = buildSalesLines({ ...z, cashKurus: null, cardKurus: null }, DEFAULT_RULES);
    expect(lines(none).slice(0, 1)).toEqual([["100.01", 450000, 0]]);
    expect(codes(none)).toContain("z_payment_split");
    const cardOnly = buildSalesLines({ ...z, cashKurus: null }, DEFAULT_RULES);
    expect(lines(cardOnly).slice(0, 2)).toEqual([["100.01", 150000, 0], ["108.01", 300000, 0]]);
    expect(codes(cardOnly)).not.toContain("z_payment_split");
    const allCash = buildSalesLines({ ...z, cashKurus: 450000, cardKurus: null }, DEFAULT_RULES);
    expect(codes(allCash)).not.toContain("z_payment_split");
  });

  it("KDV'siz satış yalnız 600 satırı açar; bilinmeyen oran boş kodla uyarılır", () => {
    const r = buildSalesLines({ ...z, vatLines: [{ rate: 0, grossKurus: 450000, vatKurus: 0 }] }, DEFAULT_RULES);
    expect(lines(r).slice(2)).toEqual([["600.00", 0, 450000]]);
    const odd = buildSalesLines({ ...z, vatLines: [{ rate: 8, grossKurus: 450000, vatKurus: 33333 }] }, DEFAULT_RULES);
    expect(codes(odd)).toContain("z_unknown_rate");
    expect(approvalProblem(odd.lines)).toMatch(/hesap kodu yok/);
  });
});

describe("kurallar", () => {
  it("yeni kural satırları gidip gelir (rulesToRows ve rulesFromRows)", () => {
    expect(rulesFromRows(rulesToRows(DEFAULT_RULES))).toEqual(DEFAULT_RULES);
    const rows = rulesToRows(DEFAULT_RULES).filter((r) => r.kind === "foreign" || r.kind === "sales");
    expect(rows.map((r) => r.key)).toEqual(["expense", "vatIn", "vatOut", "cash", "card", "revenue:0", "revenue:1", "revenue:10", "revenue:20", "vat:1", "vat:10", "vat:20"]);
  });
});

const BULLETIN = `<Tarih_Date Tarih="30.10.2026"><Currency CrossOrder="0" Kod="USD" CurrencyCode="USD"><Unit>1</Unit><ForexBuying>50.1078</ForexBuying><ForexSelling>50.1981</ForexSelling></Currency>
<Currency CrossOrder="5" Kod="JPY" CurrencyCode="JPY"><Unit>100</Unit><ForexBuying>31.6241</ForexBuying></Currency></Tarih_Date>`;

describe("TCMB kuru", () => {
  it("bülten adresini ve döviz alış kurunu birim başına okur", () => {
    expect(bulletinUrl("2026-10-30")).toBe("https://www.tcmb.gov.tr/kurlar/202610/30102026.xml");
    expect(rateFromBulletin(BULLETIN, "USD")).toBe(50.1078);
    expect(rateFromBulletin(BULLETIN, "JPY")).toBeCloseTo(0.316241, 6);
    expect(rateFromBulletin(BULLETIN, "XYZ")).toBeNull();
  });

  it("fatura gününden önceki ilk bülteni kullanır; hafta sonunu atlar", async () => {
    const asked: string[] = [];
    const fetcher = async (url: string) => {
      asked.push(url);
      return url.endsWith("30102026.xml") ? new Response(BULLETIN) : new Response("", { status: 404 });
    };
    // 2 Kasım 2026 Pazartesi: 1 Kasım Pazar, 31 Ekim Cumartesi, 30 Ekim Cuma.
    expect(await tcmbRate("USD", "2026-11-02", fetcher)).toEqual({ rate: 50.1078, bulletinDate: "2026-10-30" });
    expect(asked.map((u) => u.slice(-12))).toEqual(["01112026.xml", "31102026.xml", "30102026.xml"]);
  });

  it("TCMB'ye ulaşılamazsa ya da geçersiz girdide null döner", async () => {
    expect(await tcmbRate("USD", "2026-11-02", async () => { throw new Error("ağ yok"); })).toBeNull();
    expect(await tcmbRate("usd", "2026-11-02", async () => new Response(BULLETIN))).toBeNull();
  });
});

describe("jüri tur 19 düzeltmeleri", () => {
  it("para birimi okunamayan faturada tutar TL sayılmaz: satırlar boş, onay kapalı, uyarı var", () => {
    const r = buildForeignLines({ ...google, currency: "" }, DEFAULT_RULES, null);
    expect(lines(r)[0]).toEqual(["760.01", 0, 0]);
    expect(codes(r)).toContain("currency_unsure");
    expect(approvalProblem(r.lines)).toMatch(/tutar yok/);
  });

  it("Z raporunda firmanın VKN'si Kasa ve Kart satırlarına Vergi No olarak yazılmaz; fişte gider satırına yazılır", async () => {
    const { lucaGridRows } = await import("./luca/clipboard");
    const zRows = lucaGridRows(buildSalesLines(z, DEFAULT_RULES).lines, "1111111114");
    expect(zRows.every((row) => row.taxNumber === "")).toBe(true);
  });

  it("PDF sayfaları sayılır (Pages kök nesnesi sayılmaz)", async () => {
    const { pdfPageCount } = await import("./image");
    const pdf = new TextEncoder().encode("%PDF-1.7\n1 0 obj << /Type /Pages /Count 2 >>\n2 0 obj << /Type /Page >>\n3 0 obj << /Type/Page /Parent 1 0 R >>");
    expect(pdfPageCount(pdf)).toBe(2);
  });
});
