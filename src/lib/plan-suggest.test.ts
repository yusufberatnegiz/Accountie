import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, rulesToRows } from "./default-rules";
import { suggestRules } from "./plan-suggest";

// A plan shaped like a real Luca one: parents with sub-accounts, the firm's own numbering and names.
const PLAN = [
  { code: "100", name: "Kasa" }, { code: "100.01", name: "Merkez Kasa" },
  { code: "191", name: "İndirilecek Kdv" }, { code: "191.03", name: "İndirilecek Kdv" },
  { code: "191.03.01", name: "% 1 Li İndirilecek Kdv" }, { code: "191.03.10", name: "% 10 Li İndirilecek Kdv" }, { code: "191.03.20", name: "% 20 Li İndirilecek Kdv" },
  { code: "191.09.20", name: "% 20 Tevkifatlı Kdv" },
  { code: "191.04.10", name: "%10 İndirilecek KDV - Sorumlu Sıfatıyla Alımlar İçin Ödenen" },
  { code: "191.110.20", name: "%20 İndirilecek KDV - İthalde Ödenen" },
  { code: "309", name: "Diğer Mali Borçlar" }, { code: "309.01", name: "Kredi Kartı İle Ödemeler" },
  { code: "770", name: "Genel Yönetim Giderleri" },
  { code: "770.01", name: "Kırtasiye-Noter-Pul" }, { code: "770.05", name: "Sigorta-Seyahat-Konaklama" },
  { code: "770.08", name: "Yeme-İçme Ve Ağırlama" }, { code: "770.10", name: "Taşıt Yakıt Ve Tamir Bakım" },
  { code: "770.13", name: "Temizlik" }, { code: "770.14", name: "Diğer Çeşitli" }, { code: "770.16", name: "Kargo Ve Nakliye" },
];
const rows = rulesToRows(DEFAULT_RULES);
const code = (out: ReturnType<typeof suggestRules>, kind: string, key: string) => out.find((r) => r.kind === kind && r.key === key)?.accountCode;

describe("suggestRules", () => {
  const out = suggestRules(rows, PLAN);

  it("gider kurallarını firmanın kendi 770 alt hesaplarına çeker, adı da plandan alır", () => {
    expect(code(out, "expense", "fuel")).toBe("770.10");
    expect(code(out, "expense", "stationery")).toBe("770.01");
    expect(code(out, "expense", "cargo")).toBe("770.16");
    expect(code(out, "expense", "meal")).toBe("770.08");
    expect(code(out, "expense", "cleaning")).toBe("770.13");
    expect(code(out, "expense", "lodging")).toBe("770.05");
    expect(code(out, "expense", "other")).toBe("770.14");
    expect(out.find((r) => r.kind === "expense" && r.key === "meal")?.accountName).toBe("Yeme-İçme Ve Ağırlama");
  });

  it("KDV oranını ayrı bir sayı olarak arar: %1, %10 ile karışmaz; tevkifatlı, sorumlu sıfatıyla ve ithalde ödenen hesap önerilmez", () => {
    expect(code(out, "vat", "1")).toBe("191.03.01");
    expect(code(out, "vat", "10")).toBe("191.03.10");
    expect(code(out, "vat", "20")).toBe("191.03.20");
  });

  it("kart ve nakit: kredi kartı hesabı ve kasanın alt hesabı (üst hesap değil)", () => {
    expect(code(out, "payment", "card")).toBe("309.01");
    expect(code(out, "payment", "cash")).toBe("100.01");
  });

  it("planda karşılığı olmayan kural ve ayarlar olduğu gibi kalır", () => {
    const telecom = rows.find((r) => r.kind === "expense" && r.key === "telecom");
    expect(out.find((r) => r.kind === "expense" && r.key === "telecom")).toEqual(telecom);
    expect(out.filter((r) => r.kind === "setting")).toEqual(rows.filter((r) => r.kind === "setting"));
    expect(suggestRules(rows, [])).toEqual(rows);
  });

  it("alt hesabı olmayan şablon planda gider 770'e, KDV 191'e, kart 309'a, nakit 100'e önerilir", () => {
    const bare = [{ code: "100", name: "KASA" }, { code: "191", name: "İNDİRİLECEK KATMA DEĞER VERGİSİ" }, { code: "309", name: "DİĞER MALİ BORÇLAR" }, { code: "770", name: "GENEL YÖNETİM GİDERLERİ" }];
    const got = suggestRules(rows, bare);
    expect(new Set(got.filter((r) => r.kind === "expense").map((r) => r.accountCode))).toEqual(new Set(["770"]));
    expect(new Set(got.filter((r) => r.kind === "vat").map((r) => r.accountCode))).toEqual(new Set(["191"]));
    expect(code(got, "payment", "card")).toBe("309");
    expect(code(got, "payment", "cash")).toBe("100");
  });

  it("alt hesabı olan planda eşleşmeyen kural ana hesaba atılmaz", () => {
    expect(code(out, "expense", "telecom")).not.toBe("770");
  });
});

describe("suggestRules: yurt dışı fatura ve Z raporu", () => {
  // Names as they appear in real Luca plans (the firm that books Google: 760.012, 191.100, 360.004).
  const plan = [
    { code: "100", name: "KASA" }, { code: "100.01", name: "Kasa" },
    { code: "108", name: "DİĞER HAZIR DEĞERLER" }, { code: "108.01", name: "Kredi Kartı Satışları" },
    { code: "191", name: "İNDİRİLECEK KDV" }, { code: "191.100", name: "SORUMLU SIFATIYLA BEYAN EDİLEN KDV" },
    { code: "360", name: "ÖDENECEK VERGİ VE FONLAR" }, { code: "360.001", name: "ÖDENECEK GELİR VERGİSİ" }, { code: "360.004", name: "ÖDENECEK KDV 2" },
    { code: "391", name: "HESAPLANAN KDV" }, { code: "391.01", name: "% 01 Hesaplanan Kdv" }, { code: "391.10", name: "% 10 Hesaplanan Kdv" },
    { code: "391.20", name: "% 20 Hesaplanan Kdv" }, { code: "391.40", name: "Alışlardan İade Kdv" },
    { code: "600", name: "YURTİÇİ SATIŞLAR" }, { code: "600.00", name: "Kdv Siz Satışlar" }, { code: "600.01", name: "% 01 Kdv Li Satışlar" },
    { code: "600.10", name: "% 10 Kdv Li Satışlar" }, { code: "600.20", name: "% 20 Kdv Li Satışlar" },
    { code: "760", name: "PAZARLAMA SATIŞ VE DAĞITIM GİDERLERİ" }, { code: "760.001", name: "REKLAM GİDERİ" }, { code: "760.012", name: "YURTDIŞI REKLAM GİDERLERİ" },
  ];
  it("planın kendi hesaplarına eşler", () => {
    const out = suggestRules(rulesToRows(DEFAULT_RULES), plan);
    expect([code(out, "foreign", "expense"), code(out, "foreign", "vatIn"), code(out, "foreign", "vatOut")]).toEqual(["760.012", "191.100", "360.004"]);
    expect([code(out, "sales", "cash"), code(out, "sales", "card")]).toEqual(["100.01", "108.01"]);
    expect(["revenue:0", "revenue:1", "revenue:10", "revenue:20"].map((k) => code(out, "sales", k))).toEqual(["600.00", "600.01", "600.10", "600.20"]);
    expect(["vat:1", "vat:10", "vat:20"].map((k) => code(out, "sales", k))).toEqual(["391.01", "391.10", "391.20"]);
  });
});
