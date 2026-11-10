import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, rulesToRows } from "./default-rules";
import { suggestRules } from "./plan-suggest";

// A plan shaped like a real Luca one: parents with sub-accounts, the firm's own numbering and names.
const PLAN = [
  { code: "100", name: "Kasa" }, { code: "100.01", name: "Merkez Kasa" },
  { code: "191", name: "İndirilecek Kdv" }, { code: "191.03", name: "İndirilecek Kdv" },
  { code: "191.03.01", name: "% 1 Li İndirilecek Kdv" }, { code: "191.03.10", name: "% 10 Li İndirilecek Kdv" }, { code: "191.03.20", name: "% 20 Li İndirilecek Kdv" },
  { code: "191.09.20", name: "% 20 Tevkifatlı Kdv" },
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

  it("KDV oranını ayrı bir sayı olarak arar: %1, %10 ile karışmaz; tevkifat hesabı önerilmez", () => {
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
});
