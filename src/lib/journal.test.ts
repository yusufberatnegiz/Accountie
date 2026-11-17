import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "./default-rules";
import { approvalProblem, buildJournalLines, isBalanced, linesProblem, NO_PLAN, type ReceiptData } from "./journal";
import { planIndex } from "./plan-suggest";

const sample: ReceiptData = {
  vendorName: "ÖRNEK BALIK LOKANTASI VE RES.İŞL.LTD.ŞTİ",
  receiptNo: "0047",
  date: "2026-09-05",
  vatLines: [{ rate: 10, grossKurus: 872500, vatKurus: 79318 }],
  totalKurus: 872500,
  paymentMethod: "card",
  category: "meal",
};

const codes = (r: ReturnType<typeof buildJournalLines>) => r.lines.map((l) => [l.accountCode, l.debitKurus, l.creditKurus]);
const warningCodes = (r: ReturnType<typeof buildJournalLines>) => r.warnings.map((w) => w.code);

describe("buildJournalLines", () => {
  it("örnek fişten Luca'daki üç satırı üretir", () => {
    const result = buildJournalLines(sample, DEFAULT_RULES);
    expect(result.lines).toEqual([
      { accountCode: "770.08", accountName: "Yeme-İçme ve Ağırlama Giderleri", debitKurus: 793182, creditKurus: 0, description: "ÖRNEK BALIK LOKANTASI VE RES.İŞL.LTD.ŞTİ", documentNo: "0047", documentDate: "2026-09-05", documentType: "ÖK", quantity: 0, babs: false },
      { accountCode: "191.03.10", accountName: "%10 İndirilecek KDV", debitKurus: 79318, creditKurus: 0, description: "ÖRNEK BALIK LOKANTASI VE RES.İŞL.LTD.ŞTİ", documentNo: "0047", documentDate: "2026-09-05", documentType: "ÖK", quantity: 0, babs: false },
      { accountCode: "331.01", accountName: "Ortaklara Borçlar", debitKurus: 0, creditKurus: 872500, description: "ÖRNEK BALIK LOKANTASI VE RES.İŞL.LTD.ŞTİ", documentNo: "0047", documentDate: "2026-09-05", documentType: "ÖK", quantity: 0, babs: false },
    ]);
    expect(result.balanced).toBe(true);
    // Ağırlama is no longer warned about.
    expect(warningCodes(result)).toEqual([]);
  });

  it("çok oranlı fişte her oran için gider ve 191 satırı açar", () => {
    const result = buildJournalLines({
      ...sample, category: "food_grocery", paymentMethod: "cash",
      vatLines: [{ rate: 1, grossKurus: 10100, vatKurus: 100 }, { rate: 20, grossKurus: 12000, vatKurus: 2000 }],
      totalKurus: 22100,
    }, DEFAULT_RULES);
    expect(codes(result)).toEqual([
      ["770.12", 10000, 0], ["191.03.01", 100, 0],
      ["770.12", 10000, 0], ["191.03.20", 2000, 0],
      ["100.01", 0, 22100],
    ]);
    expect(result.balanced).toBe(true);
  });

  it("%0 oranında 191 satırı açmaz", () => {
    const result = buildJournalLines({ ...sample, vatLines: [{ rate: 0, grossKurus: 5000, vatKurus: 0 }], totalKurus: 5000 }, DEFAULT_RULES);
    expect(codes(result)).toEqual([["770.08", 5000, 0], ["331.01", 0, 5000]]);
  });

  it("eski %8 oranında uyarı verir ve 191 hesabını boş bırakır", () => {
    const result = buildJournalLines({ ...sample, vatLines: [{ rate: 8, grossKurus: 10800, vatKurus: 800 }], totalKurus: 10800 }, DEFAULT_RULES);
    expect(codes(result)).toEqual([["770.08", 10000, 0], ["", 800, 0], ["331.01", 0, 10800]]);
    expect(warningCodes(result)).toContain("legacy_rate");
    expect(result.balanced).toBe(false);
  });

  it("aynı uyarıyı bir kez verir (%8 ve %18 birlikte)", () => {
    const result = buildJournalLines({ ...sample, vatLines: [{ rate: 8, grossKurus: 10800, vatKurus: 800 }, { rate: 18, grossKurus: 11800, vatKurus: 1800 }], totalKurus: 22600 }, DEFAULT_RULES);
    expect(warningCodes(result).filter((c) => c === "legacy_rate")).toHaveLength(1);
  });

  it("KDV okunamadıysa orandan hesaplar", () => {
    const result = buildJournalLines({ ...sample, vatLines: [{ rate: 10, grossKurus: 872500, vatKurus: null }] }, DEFAULT_RULES);
    expect(codes(result)).toEqual([["770.08", 793182, 0], ["191.03.10", 79318, 0], ["331.01", 0, 872500]]);
    expect(warningCodes(result)).toContain("vat_computed");
  });

  it("oran başına 1 kuruş farkı en büyük matrah satırına ekler", () => {
    const result = buildJournalLines({ ...sample, totalKurus: 872501 }, DEFAULT_RULES);
    expect(codes(result)).toEqual([["770.08", 793183, 0], ["191.03.10", 79318, 0], ["331.01", 0, 872501]]);
    expect(result.balanced).toBe(true);
    expect(warningCodes(result)).toContain("rounding_adjusted");
  });

  it("2 kuruş ve üstü farkı dengelemez, uyarı verir", () => {
    const result = buildJournalLines({ ...sample, totalKurus: 872502 }, DEFAULT_RULES);
    expect(codes(result)).toEqual([["770.08", 793182, 0], ["191.03.10", 79318, 0], ["331.01", 0, 872502]]);
    expect(result.balanced).toBe(false);
    expect(warningCodes(result)).toContain("total_mismatch");
  });

  it("fişteki KDV orandan saparsa fişteki değeri yazar; uyumsuzluğu okuma denetimi söyler", () => {
    const result = buildJournalLines({ ...sample, vatLines: [{ rate: 10, grossKurus: 872500, vatKurus: 80000 }] }, DEFAULT_RULES);
    expect(codes(result)[1]).toEqual(["191.03.10", 80000, 0]);
    expect(warningCodes(result)).not.toContain("vat_mismatch");
    expect(result.balanced).toBe(true);
  });

  it("KDV satırı yoksa toplamı tek gider satırına yazar", () => {
    const result = buildJournalLines({ ...sample, vatLines: [] }, DEFAULT_RULES);
    expect(codes(result)).toEqual([["770.08", 872500, 0], ["331.01", 0, 872500]]);
    expect(warningCodes(result)).toContain("vat_missing");
  });

  it("okunamayan fiş için elle doldurulacak boş satırlar üretir", () => {
    const result = buildJournalLines({ vendorName: null, receiptNo: null, date: null, vatLines: [], totalKurus: null, paymentMethod: "other", category: "other" }, DEFAULT_RULES);
    expect(codes(result)).toEqual([["770.99", 0, 0], ["331.01", 0, 0]]);
    expect(result.balanced).toBe(false);
  });

  it("araç kategorisinde uyarı vermez; binek mi ticari mi fiş ekranında seçilir", () => {
    const result = buildJournalLines({ ...sample, category: "fuel", vatLines: [{ rate: 20, grossKurus: 120000, vatKurus: 20000 }], totalKurus: 120000 }, DEFAULT_RULES);
    expect(warningCodes(result)).toEqual([]);
  });

  it("kullanıcının kural tablosunu kullanır", () => {
    const rules = { ...DEFAULT_RULES, payment: { ...DEFAULT_RULES.payment, card: { code: "309.01", name: "Diğer Mali Borçlar" } }, documentType: "FŞ" };
    const result = buildJournalLines(sample, rules);
    expect(result.lines[2].accountCode).toBe("309.01");
    expect(result.lines.every((l) => l.documentType === "FŞ")).toBe(true);
  });
});

describe("isBalanced", () => {
  const line = { accountCode: "770.08", debitKurus: 100, creditKurus: 0 };
  it("borç ve alacak eşit ve sıfırdan büyükse dengeli", () => {
    expect(isBalanced([line, { ...line, accountCode: "100.01", debitKurus: 0, creditKurus: 100 }])).toBe(true);
  });
  it("eşit değilse veya boşsa dengesiz", () => {
    expect(isBalanced([line])).toBe(false);
    expect(isBalanced([])).toBe(false);
  });
  it("hem borç hem alacak dolu satır veya hesapsız satır dengesiz sayılır", () => {
    expect(isBalanced([{ ...line, creditKurus: 100 }])).toBe(false);
    expect(isBalanced([{ ...line, accountCode: "" }, { ...line, accountCode: "100.01", debitKurus: 0, creditKurus: 100 }])).toBe(false);
  });
});

describe("approvalProblem", () => {
  const head = { documentNo: "0047", documentDate: "2026-09-05" };
  const debit = { ...head, accountCode: "770.08", accountName: "Yeme İçme Giderleri", debitKurus: 100, creditKurus: 0 };
  const credit = { ...head, accountCode: "331.01", accountName: "Ortaklara Borçlar", debitKurus: 0, creditKurus: 100 };
  const plan = planIndex([{ code: "770", name: "Genel Yönetim Giderleri" }, { code: "770.08", name: "Yeme İçme Giderleri" }, { code: "331.01", name: "Ortaklara Borçlar" }]);
  it("tam kayıtta sorun yok", () => expect(approvalProblem([debit, credit], plan)).toBeNull());
  it("sebebi satır numarasıyla söyler", () => {
    expect(approvalProblem([debit, { ...credit, accountCode: "" }], plan)).toBe("2. satırda hesap kodu yok.");
    expect(linesProblem([debit, credit, { ...credit, creditKurus: 0 }])).toBe("3. satırda tutar yok.");
    expect(linesProblem([{ ...debit, creditKurus: 100 }, credit])).toBe("1. satırda hem borç hem alacak var.");
    expect(linesProblem([debit, { ...credit, creditKurus: 50 }])).toBe("Borç ile alacak farkı 0,50 TL.");
  });
  it("evrak tarihi ve evrak no olmadan onaylanmaz", () => {
    expect(linesProblem([{ ...debit, documentDate: null }, { ...credit, documentDate: null }])).toBe("Evrak tarihi eksik.");
    expect(linesProblem([{ ...debit, documentNo: " " }, credit])).toBe("Evrak no eksik.");
    expect(linesProblem([debit, { ...credit, documentDate: "2026-09-06" }])).toBe("Satırlarda evrak tarihi farklı.");
  });
  it("Luca planı olmayan firmanın fişi onaylanmaz", () => {
    expect(approvalProblem([debit, credit], planIndex([]))).toBe(NO_PLAN);
  });
  it("planda olmayan, alt hesabı olan ya da planda başka anlamdaki kod onaylanmaz", () => {
    expect(approvalProblem([debit, { ...credit, accountCode: "309.01" }], plan)).toBe("2. satırdaki 309.01 hesabı firmanın Luca planında yok.");
    expect(approvalProblem([{ ...debit, accountCode: "770" }, credit], plan)).toBe("1. satırdaki 770 hesabının alt hesapları var; alt hesaplardan birini seçin.");
    expect(approvalProblem([{ ...debit, accountName: "Kırtasiye Giderleri" }, credit], plan)).toMatch(/770.08 Luca planında “Yeme İçme Giderleri”, satırda “Kırtasiye Giderleri”.*plandan yeniden seçin/);
  });
});

describe("karma ödeme", () => {
  it("nakit ve kartla ödenen fişte her ödeme kendi alacak satırına yazılır", () => {
    const r = buildJournalLines({ ...sample, payments: [{ method: "cash", kurus: 300000 }, { method: "card", kurus: 572500 }] }, DEFAULT_RULES);
    expect(r.lines.filter((l) => l.creditKurus > 0).map((l) => [l.accountCode, l.creditKurus])).toEqual([["100.01", 300000], ["331.01", 572500]]);
    expect(r.balanced).toBe(true);
  });
  it("toplamı tutmayan ödeme kırılımında tek alacak satırı kalır", () => {
    const r = buildJournalLines({ ...sample, payments: [{ method: "cash", kurus: 100 }, { method: "card", kurus: 200 }] }, DEFAULT_RULES);
    expect(r.lines.filter((l) => l.creditKurus > 0)).toHaveLength(1);
  });
});

describe("jüri turu 2: yevmiye", () => {
  it("puan, hediye çeki ya da yemek kartıyla ödenen kısım uyarı verir", () => {
    const r = buildJournalLines({ ...sample, payments: [{ method: "card", kurus: 800000 }, { method: "other", kurus: 72500 }] }, DEFAULT_RULES);
    expect(warningCodes(r)).toContain("payment_other");
  });
  it("%0 satırda KDV okunmadı uyarısı vermez", () => {
    const r = buildJournalLines({ ...sample, vatLines: [{ rate: 10, grossKurus: 800000, vatKurus: 72727 }, { rate: 0, grossKurus: 72500, vatKurus: null }] }, DEFAULT_RULES);
    expect(warningCodes(r)).not.toContain("vat_computed");
  });
});

describe("jüri turu 3: yevmiye", () => {
  it("tamamı yemek kartı ya da puanla ödenen fiş de uyarı verir", () => {
    expect(warningCodes(buildJournalLines({ ...sample, paymentMethod: "other" }, DEFAULT_RULES))).toContain("payment_other");
  });
});

