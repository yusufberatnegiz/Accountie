import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, rulesToRows } from "./default-rules";
import { fitRulesToPlan, planMismatches, suggestRules } from "./plan-suggest";

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
    expect(new Set(got.filter((r) => r.kind === "expense" && r.key !== "kkeg").map((r) => r.accountCode))).toEqual(new Set(["770"]));
    // No 689 in the plan: the KKEG rule keeps its default instead of landing on 770.
    expect(code(got, "expense", "kkeg")).toBe("689.02");
    expect(new Set(got.filter((r) => r.kind === "vat").map((r) => r.accountCode))).toEqual(new Set(["191"]));
    expect(code(got, "payment", "card")).toBe("309");
    expect(code(got, "payment", "cash")).toBe("100");
  });

  it("demirbaş hesabını yalnız büro malzemesine önerir; market ve diğer oraya düşmez", () => {
    const plan = [{ code: "770.05", name: "Diğer Küçük Demirbaşlar" }, { code: "770.12", name: "Mutfak Giderleri" }, { code: "770.99", name: "Diğer Çeşitli Giderler" }];
    const got = suggestRules(rows, plan);
    expect(code(got, "expense", "other")).toBe("770.99");
    expect(code(got, "expense", "food_grocery")).toBe("770.12");
    expect(code(got, "expense", "office_supplies")).toBe("770.05");
  });

  it("binek KKEG kuralını plandaki kanunen kabul edilmeyen gider hesabına önerir", () => {
    const plan = [{ code: "689", name: "Diğer Olağandışı Gider Ve Zararlar" }, { code: "689.01", name: "Kanunen Kabul Edilmeyen Giderler" }, { code: "770.01", name: "Akaryakıt" }];
    expect(code(suggestRules(rows, plan), "expense", "kkeg")).toBe("689.01");
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

// A real Luca plan (codes and names only) where the default codes mean other accounts: 770.12 is fixtures, 770.01 stationery.
const REAL = [
  ["100", "KASA"], ["100.01", "Kasa"], ["108", "DİĞER HAZIR DEĞERLER"], ["108.01", "Kredi Kartı Satışları"],
  ["191", "İNDİRİLECEK KATMA DEĞER VERGİSİ"], ["191.03", "Bu Döneme Ait İndirilecek Kdv"], ["191.03.01", "% 01 Li İndirilecek Kdv"],
  ["191.03.10", "%10 İndirilecek KDV - Yurtiçi Tevkifatsız Alımlar İçin Ödenen"], ["191.03.20", "%20 İndirilecek KDV - Yurtiçi Tevkifatsız Alımlar İçin Ödenen"],
  ["191.04", "Sorumlu Sıfatıyla Ödenen Kdv"], ["191.04.20", "%20 İndirilecek KDV - Sorumlu Sıfatıyla Alımlar İçin Ödenen"],
  ["309", "DİĞER MALİ BORÇLAR"], ["309.01", "Kredi Kartı İle Ödemeler"], ["331", "ORTAKLARA BORÇLAR"], ["331.01", "Ortaklara Borçlar"],
  ["335", "PERSONELE BORÇLAR"], ["335.01", "Personele Borçlar"], ["360", "ÖDENECEK VERGİ VE FONLAR"], ["360.01", "Katma Değer Vergisi Ve Ekleri"],
  ["689", "DİĞER OLAĞANDIŞI GİDER VE ZARARLAR (-)"], ["689.02", "Kanunen Kabul Edilmeyen Giderler"], ["689.03", "Binek Araç Gider Kısıtlaması"],
  ["770", "GENEL YÖNETİM GİDERLERİ"], ["770.00", "Kanunen Kabul Edilmeyen Giderler"], ["770.01", "Kırtasiye-Noter-Pul Giderleri"],
  ["770.02", "Ptt-Elektrik-Su Giderleri"], ["770.04", "Demirbaş Tamir Bakım Giderleri"], ["770.05", "Sigorta-Seyahat-Konaklama Giderleri"],
  ["770.08", "Yeme-İçme Ve Ağırlama Giderleri"], ["770.10", "Taşıt Yakıt Ve Tamir Bakım Giderleri"], ["770.12", "Küçük Demirbaş Alımları"],
  ["770.13", "Temizlik Giderleri"], ["770.14", "Diğer Çeşitli Giderler"], ["770.16", "Kargo Ve Nakliye Giderleri"],
].map(([c, n]) => ({ code: c, name: n }));

describe("fitRulesToPlan (kaydetmeden firmanın Luca planı)", () => {
  const fit = fitRulesToPlan(rows, REAL);
  const get = (kind: string, key: string) => fit.find((r) => r.kind === kind && r.key === key);

  it("market fişi küçük demirbaşa, akaryakıt kırtasiyeye, kırtasiye PTT'ye gitmez", () => {
    expect(get("expense", "food_grocery")?.accountCode).toBe("770.08");
    expect(get("expense", "fuel")?.accountCode).toBe("770.10");
    expect(get("expense", "stationery")?.accountCode).toBe("770.01");
    expect(get("expense", "telecom")?.accountCode).toBe("770.02");
    expect(get("expense", "office_supplies")?.accountCode).toBe("770.12");
    expect(get("expense", "other")?.accountCode).toBe("770.14");
    expect(get("expense", "parking")?.accountCode).toBe("770.10");
    expect(get("expense", "kkeg")?.accountCode).toBe("689.02");
  });

  it("anlamı tutan varsayılan kalır ve adı Luca'daki gibi olur", () => {
    expect(get("vat", "1")).toMatchObject({ accountCode: "191.03.01", accountName: "% 01 Li İndirilecek Kdv" });
    expect(get("vat", "20")?.accountCode).toBe("191.03.20");
    expect(get("payment", "card")).toMatchObject({ accountCode: "331.01", accountName: "Ortaklara Borçlar" });
    expect(get("payment", "cash")?.accountCode).toBe("100.01");
    expect(get("expense", "meal")?.accountName).toBe("Yeme-İçme Ve Ağırlama Giderleri");
  });

  it("oranı başka olan hesabı aynı anlamda saymaz; kart ortaklara borçlarda kalır; yurt dışı KDV %20 sorumlu hesabına gider", () => {
    const plan = [...REAL, { code: "600", name: "YURTİÇİ SATIŞLAR" }, { code: "600.20", name: "% 10 Kdv Li Satışlar" },
      { code: "191.04.10", name: "%10 İndirilecek KDV - Sorumlu Sıfatıyla Alımlar İçin Ödenen" }].filter((a) => a.code !== "331.01");
    const got = fitRulesToPlan(rows, plan);
    const one = (kind: string, key: string) => got.find((r) => r.kind === kind && r.key === key)?.accountCode;
    expect(one("sales", "revenue:20")).toBe("");
    expect(one("payment", "card")).toBe("331");
    expect(one("foreign", "vatIn")).toBe("191.04.20");
  });

  it("alt hesabı olmayan şablon planda Z raporu 600 ve 391 ana hesaplarına yazılır", () => {
    const bare = [{ code: "100", name: "KASA" }, { code: "108", name: "DİĞER HAZIR DEĞERLER" }, { code: "391", name: "HESAPLANAN KDV" }, { code: "600", name: "YURTİÇİ SATIŞLAR" }];
    const got = fitRulesToPlan(rows, bare);
    expect(got.find((r) => r.key === "revenue:20")?.accountCode).toBe("600");
    expect(got.find((r) => r.kind === "sales" && r.key === "vat:20")?.accountCode).toBe("391");
    expect(got.find((r) => r.kind === "sales" && r.key === "card")?.accountCode).toBe("108");
  });

  it("planda uyan hesap yoksa kod boş kalır, yanlış hesaba gitmez", () => {
    // No 600 sales accounts in this plan: a Z report waits for the user.
    expect(get("sales", "revenue:20")?.accountCode).toBe("");
  });

  it("firmaya kaydedilmiş kural olduğu gibi kalır; plan yoksa hiçbir şey değişmez", () => {
    const own = fitRulesToPlan(rows, REAL, (r) => r.kind === "expense" && r.key === "food_grocery");
    expect(own.find((r) => r.key === "food_grocery")?.accountCode).toBe("770.12");
    expect(fitRulesToPlan(rows, [])).toEqual(rows);
  });
});

describe("planMismatches", () => {
  it("Luca'da başka anlama gelen kodu bulur, aynı anlamdakini geçer", () => {
    const lines = [
      { accountCode: "770.12", accountName: "Mutfak Giderleri" },
      { accountCode: "191.03.20", accountName: "%20 İndirilecek KDV" },
      { accountCode: "331.01", accountName: "Ortaklara Borçlar" },
    ];
    expect(planMismatches(lines, REAL)).toEqual([{ code: "770.12", ours: "Mutfak Giderleri", luca: "Küçük Demirbaş Alımları" }]);
    expect(planMismatches(lines, [])).toEqual([]);
  });
});

describe("jüri turu 2: plan eşleme", () => {
  const one = (plan: { code: string; name: string }[], kind: string, key: string) => fitRulesToPlan(rows, plan).find((r) => r.kind === kind && r.key === key);

  it("'Diğer' fişi vergi-harç ya da finansman hesabına gitmez; genel kelimeler aynı anlam sayılmaz", () => {
    const plan = [{ code: "770", name: "GENEL YÖNETİM" }, { code: "770.018", name: "DİĞER VERGİ RESİM VE HARÇLAR" }, { code: "770.020", name: "DİĞER GİDERLER" }, { code: "780.01", name: "Diğer Finansman Giderleri" }];
    expect(one(plan, "expense", "other")?.accountCode).toBe("770.020");
    const c = [{ code: "770", name: "GENEL" }, { code: "770.99", name: "Diğer Vergi Resim Harçlar" }];
    expect(one(c, "expense", "other")?.accountCode).toBe("");
  });

  it("ortak başına 331 alt hesabı varsa kart kodu boş kalır; şirket kartına kaymaz", () => {
    const plan = [{ code: "300", name: "BANKA KREDİLERİ" }, { code: "300.001", name: "KREDİ KARTI BORÇLARI" }, { code: "331", name: "ORTAKLARA BORÇLAR" }, { code: "331.001", name: "AHMET YILMAZ" }, { code: "331.002", name: "MEHMET YILMAZ" }];
    expect(one(plan, "payment", "card")?.accountCode).toBe("");
    expect(one(plan, "payment", "other")?.accountCode).toBe("");
  });

  it("KDV kuralı tevkifatlı ya da sorumlu hesabında kalmaz; nakit dövizli kasaya gitmez", () => {
    const plan = [{ code: "100", name: "KASA" }, { code: "100.01", name: "USD KASA" }, { code: "100.02", name: "TL KASA" },
      { code: "191", name: "KDV" }, { code: "191.03", name: "x" }, { code: "191.03.10", name: "%10 İndirilecek KDV - Tevkifatlı Alımlar" }, { code: "191.03.11", name: "%10 İndirilecek KDV" }];
    expect(one(plan, "vat", "10")?.accountCode).toBe("191.03.11");
    expect(one(plan, "payment", "cash")?.accountCode).toBe("100.02");
  });

  it("araç bakımı taşıt hesabına, işyeri bakımı bina/demirbaş bakımına gider", () => {
    const plan = [{ code: "770", name: "G" }, { code: "770.04", name: "Demirbaş Tamir Bakım Giderleri" }, { code: "770.10", name: "Taşıt Yakıt Ve Tamir Bakım Giderleri" }];
    expect(one(plan, "expense", "maintenance")?.accountCode).toBe("770.04");
    expect(one(plan, "expense", "vehicle_maintenance")?.accountCode).toBe("770.10");
  });

  it("firmaya kaydedilmiş kural adıyla korunur; Luca'da başka anlamdaysa uyuşmazlık görünür", () => {
    const own = fitRulesToPlan(rows, REAL, (r) => r.kind === "expense" && r.key === "food_grocery").find((r) => r.key === "food_grocery")!;
    expect(own).toMatchObject({ accountCode: "770.12", accountName: "Mutfak Giderleri" });
    expect(planMismatches([own], REAL)).toEqual([{ code: "770.12", ours: "Mutfak Giderleri", luca: "Küçük Demirbaş Alımları" }]);
  });
});

describe("jüri turu 3: plan eşleme", () => {
  const one = (plan: { code: string; name: string }[], kind: string, key: string) => fitRulesToPlan(rows, plan).find((r) => r.kind === kind && r.key === key)?.accountCode;

  it("bakım türleri varsayılan kod korunurken de ayrılır", () => {
    const plan = [{ code: "770", name: "G" }, { code: "770.07", name: "Taşıt Bakım Onarım Giderleri" }, { code: "770.15", name: "Bina Bakım Onarım Giderleri" }];
    expect(one(plan, "expense", "vehicle_maintenance")).toBe("770.07");
    expect(one(plan, "expense", "maintenance")).toBe("770.15");
  });

  it("adında 'ortak' geçen kişi hesapları da olsa birden çok 331 alt hesabında kart kodu boş kalır", () => {
    const plan = [{ code: "331", name: "ORTAKLARA BORÇLAR" }, { code: "331.01", name: "ORTAK AHMET YILMAZ" }, { code: "331.02", name: "ORTAK MEHMET YILMAZ" }];
    expect(one(plan, "payment", "card")).toBe("");
    const named = [{ code: "331", name: "x" }, { code: "331.01", name: "Ortaklara Borçlar Ahmet" }, { code: "331.02", name: "Ortaklara Borçlar Mehmet" }];
    expect(one(named, "payment", "card")).toBe("");
  });

  it("tevkifat kısaltmaları elenir; personel yemeği ağırlama sayılmaz", () => {
    const vat = [{ code: "191", name: "KDV" }, { code: "191.01", name: "%20 KDV TEVK. 5/10" }, { code: "191.02", name: "%20 İNDİRİLECEK KDV" }];
    expect(one(vat, "vat", "20")).toBe("191.02");
    const meal = [{ code: "770", name: "G" }, { code: "770.003", name: "PERSONEL YEMEK GİDERLERİ" }, { code: "770.008", name: "TEMSİL VE AĞIRLAMA GİDERLERİ" }, { code: "770.009", name: "MUTFAK GİDERLERİ" }];
    expect(one(meal, "expense", "meal")).toBe("770.008");
    expect(one(meal, "expense", "food_grocery")).toBe("770.009");
  });

  it("noter harcı kırtasiyede, 'Altındağ' kasası TL kasası sayılır; şablon planda yurt dışı fatura ana hesaplara gider", () => {
    expect(one([{ code: "770", name: "G" }, { code: "770.01", name: "Kırtasiye Noter Harç Giderleri" }], "expense", "stationery")).toBe("770.01");
    expect(one([{ code: "100", name: "KASA" }, { code: "100.01", name: "ALTINDAĞ ŞUBE KASA" }, { code: "100.02", name: "EURO KASA" }], "payment", "cash")).toBe("100.01");
    const bare = [{ code: "191", name: "KDV" }, { code: "360", name: "ÖDENECEK VERGİ" }, { code: "770", name: "GENEL YÖNETİM" }];
    expect([one(bare, "foreign", "expense"), one(bare, "foreign", "vatIn"), one(bare, "foreign", "vatOut")]).toEqual(["770", "191", "360"]);
  });
});
