import sharp from "sharp";
import Anthropic from "@anthropic-ai/sdk";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { extractReceipt, type ExtractClient } from "./extract";
import { checkExtraction, ReceiptExtractionSchema, toReceiptData, withholdingGap, type ReceiptExtraction } from "./schema";

const goodOutput: ReceiptExtraction = {
  vendorName: "ÖRNEK BALIK LOKANTASI VE RES.İŞL.LTD.ŞTİ",
  taxOffice: "ANTALYA KURUMLAR",
  taxNumber: "1111111114",
  date: "05.09.2026",
  time: "20:15",
  receiptNo: "0047",
  zNo: null,
  ekuNo: "0001",
  vatLines: [{ rate: 10, gross: "8.725,00", vat: "793,18", net: null }],
  total: "8.725,00",
  paymentMethod: "card",
  category: "meal",
  unreadableFields: ["zNo"],
  documentKind: "receipt",
  currency: "TRY",
  cashTotal: null,
  cardTotal: null,
  invoicedTotal: null, lineItems: [], discounts: [], totalVat: null, withholding: false, noFiscalValue: false, payments: [],
};

// checkExtraction flags dates far from "today"; pin it so the sample receipt stays current.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
});
afterAll(() => vi.useRealTimers());

function response(parsed: ReceiptExtraction | null, stop_reason = "end_turn") {
  return { parsed_output: parsed, stop_reason, usage: { input_tokens: 3000, output_tokens: 300 } };
}

function mockClient(...results: unknown[]) {
  const parse = vi.fn();
  for (const r of results) {
    if (r instanceof Error) parse.mockRejectedValueOnce(r);
    else parse.mockResolvedValueOnce(r);
  }
  return { client: { messages: { parse } } as unknown as ExtractClient, parse };
}

const image = Buffer.from("fake-jpeg");

describe("toReceiptData", () => {
  it("metin tutarları kuruşa ve tarihi ISO'ya çevirir", () => {
    expect(toReceiptData(goodOutput)).toEqual({
      vendorName: goodOutput.vendorName,
      receiptNo: "0047",
      date: "2026-09-05",
      vatLines: [{ rate: 10, grossKurus: 872500, vatKurus: 79318 }],
      totalKurus: 872500,
      paymentMethod: "card",
      category: "meal",
    });
  });
  it("okunamayan tutarı uydurmaz", () => {
    const data = toReceiptData({ ...goodOutput, total: "8.7?5,00", vatLines: [{ rate: 10, gross: "8.725,00", vat: null, net: null }] });
    expect(data.totalKurus).toBeNull();
    expect(data.vatLines[0].vatKurus).toBeNull();
  });
});

// The A101 e-Arşiv bilgi fişi a user sent: no per-rate breakdown, item discounts ("-D") on %20 items, TOPKDV 58,78, TOPLAM 474,00.
const a101: ReceiptExtraction = {
  ...goodOutput, documentKind: "domestic_invoice", vendorName: "A101 YENİ MAĞAZACILIK A.Ş.", taxNumber: null, date: "30.07.2026", receiptNo: "0024",
  category: "food_grocery", vatLines: [], total: "474,00", totalVat: "58,78", unreadableFields: [],
  lineItems: [
    { rate: 20, amount: "65,00" }, { rate: 20, amount: "119,00" }, { rate: 20, amount: "119,00" }, { rate: 1, amount: "59,50" },
    { rate: 1, amount: "69,50" }, { rate: 20, amount: "275,00" }, { rate: 20, amount: "1,00" },
  ],
  discounts: [{ rate: 20, amount: "146,00" }, { rate: 20, amount: "44,00" }, { rate: 20, amount: "44,00" }],
};

describe("indirimli fiş", () => {
  it("kırılımsız fişte kalemlerden indirimleri oranına göre düşer; KDV TOPKDV ile tutar", () => {
    const data = toReceiptData(a101);
    expect(data.vatLines).toEqual([{ rate: 20, grossKurus: 34500, vatKurus: 5750 }, { rate: 1, grossKurus: 12900, vatKurus: 128 }]);
    expect(checkExtraction(a101)).toEqual([]);
  });
  it("indirimden önceki kırılımı yazan fişte indirimi düşer", () => {
    const x = { ...a101, lineItems: [], vatLines: [{ rate: 20, gross: "579,00", vat: "96,50", net: null }, { rate: 1, gross: "129,00", vat: "1,28", net: null }] };
    expect(toReceiptData(x).vatLines).toEqual([{ rate: 20, grossKurus: 34500, vatKurus: 5750 }, { rate: 1, grossKurus: 12900, vatKurus: 128 }]);
  });
  it("sepet indirimini oranlara tutarları oranında dağıtır", () => {
    const x = { ...a101, total: "474,00", totalVat: null, withholding: false, noFiscalValue: false, payments: [], discounts: [{ rate: null, amount: "234,00" }] };
    const lines = toReceiptData(x).vatLines;
    expect(lines.reduce((s, v) => s + v.grossKurus, 0)).toBe(47400);
    expect(lines.map((v) => v.grossKurus)).toEqual([38764, 8636]);
  });
  it("indirim yanlış orandan düşülmüşse TOPKDV tutmaz ve Sonnet denenir", () => {
    const wrong = { ...a101, discounts: [{ rate: 1, amount: "100,00" }, { rate: 20, amount: "134,00" }] };
    expect(checkExtraction(wrong)).toContain("vat_mismatch");
  });
  it("e-faturada oran başına matrah ve KDV'den KDV dahil tutarı kurar", () => {
    const x = { ...a101, lineItems: [], discounts: [], totalVat: "250,00", total: "1.750,00",
      vatLines: [{ rate: 20, gross: null, vat: "200,00", net: "1.000,00" }, { rate: 10, gross: null, vat: "50,00", net: "500,00" }] };
    expect(toReceiptData(x).vatLines).toEqual([{ rate: 20, grossKurus: 120000, vatKurus: 20000 }, { rate: 10, grossKurus: 55000, vatKurus: 5000 }]);
    expect(checkExtraction(x)).toEqual([]);
  });
  it("iptal edilen satırı (eksi tutar) düşer; indirim kalemden büyükse sonucu kabul etmez", () => {
    const x = { ...a101, discounts: [], totalVat: null, total: "50,00", lineItems: [{ rate: 20, amount: "80,00" }, { rate: 20, amount: "-30,00" }] };
    expect(toReceiptData(x).vatLines).toEqual([{ rate: 20, grossKurus: 5000, vatKurus: null }]);
    const neg = { ...a101, totalVat: null, total: "100,00", lineItems: [{ rate: 20, amount: "110,00" }, { rate: 1, amount: "5,00" }], discounts: [{ rate: 1, amount: "15,00" }] };
    expect(checkExtraction(neg)).toContain("total_mismatch");
  });
  it("kalem kalem yuvarlanan TOPKDV'yi kabul eder ve 191'e belgedeki KDV yazılır", () => {
    const items = Array.from({ length: 40 }, () => ({ rate: 1, amount: "1,50" }));
    const x = { ...a101, discounts: [], lineItems: items, total: "60,00", totalVat: "0,40" };
    expect(toReceiptData(x).vatLines).toEqual([{ rate: 1, grossKurus: 6000, vatKurus: 40 }]);
    expect(checkExtraction(x)).toEqual([]);
  });
  it("TL dışı yurt içi faturayı işaretler; Z raporunda TOPKDV denetlenmez", () => {
    expect(checkExtraction({ ...a101, currency: "EUR" })).toContain("domestic_currency");
    expect(checkExtraction({ ...goodOutput, documentKind: "z_report", cashTotal: "8.725,00", totalVat: "45.300,00" })).not.toContain("vat_mismatch");
  });
  it("karma ödemeyi tutarlarıyla okur; toplamı tutmazsa ödeme şeklini kontrol ettirir", () => {
    const x = { ...a101, payments: [{ method: "cash" as const, amount: "200,00" }, { method: "card" as const, amount: "274,00" }] };
    expect(toReceiptData(x).payments).toEqual([{ method: "cash", kurus: 20000 }, { method: "card", kurus: 27400 }]);
    const off = { ...a101, payments: [{ method: "cash" as const, amount: "200,00" }, { method: "card" as const, amount: "200,00" }] };
    expect(toReceiptData(off).payments).toBeUndefined();
    expect(checkExtraction(off)).toContain("payment_unsure");
  });
  it("tevkifat yalnız yurt içi faturada ve fark KDV kadarsa toplam farkını açıklar", () => {
    const inv = { ...a101, lineItems: [], discounts: [], totalVat: null, withholding: true, total: "1.100,00", vatLines: [{ rate: 20, gross: null, vat: "200,00", net: "1.000,00" }] };
    expect(withholdingGap(inv)).toBe(10000);
    // Bigger than its KDV, or on a till receipt: not withholding, the totals do not agree.
    expect(checkExtraction({ ...inv, total: "100,00" })).toContain("total_mismatch");
    expect(checkExtraction({ ...inv, documentKind: "receipt" })).toContain("total_mismatch");
  });
  it("tevkifatlı faturada toplamın düşük olması 'tutmuyor' sayılmaz (Sonnet'e gidilmez)", () => {
    const x = { ...a101, lineItems: [], discounts: [], totalVat: null, withholding: true, total: "1.100,00", vatLines: [{ rate: 20, gross: null, vat: "200,00", net: "1.000,00" }] };
    expect(checkExtraction(x)).toEqual([]);
  });
  it("indirim okunmazsa toplam tutmaz", () => {
    expect(checkExtraction({ ...a101, discounts: [] })).toContain("total_mismatch");
  });
});

describe("checkExtraction", () => {
  it("doğru fişte sorun yok", () => {
    expect(checkExtraction(goodOutput)).toEqual([]);
  });
  it("toplam tutmazsa, VKN veya tarih hatalıysa sorun bildirir", () => {
    expect(checkExtraction({ ...goodOutput, total: "8.752,00" })).toContain("total_mismatch");
    expect(checkExtraction({ ...goodOutput, taxNumber: "0790014527" })).toContain("tax_number_invalid");
    expect(checkExtraction({ ...goodOutput, date: "31.02.2026" })).toContain("date_invalid");
    expect(checkExtraction({ ...goodOutput, vatLines: [{ rate: 10, gross: "8.725,00", vat: "893,18", net: null }] })).toContain("vat_mismatch");
  });
  it("KDV kırılımı boşsa sorun bildirir, böylece Sonnet denenir", () => {
    expect(checkExtraction({ ...goodOutput, vatLines: [] })).toEqual(["total_mismatch"]);
  });
  it("modelin emin olmadığı alanları sorun sayar", () => {
    expect(checkExtraction({ ...goodOutput, unreadableFields: ["total", "date"] })).toEqual(["amount_unreadable", "date_invalid"]);
    expect(checkExtraction({ ...goodOutput, unreadableFields: ["paymentMethod", "receiptNo"] })).toEqual(["payment_unsure", "receipt_no_unsure"]);
    expect(checkExtraction({ ...goodOutput, unreadableFields: ["vatLines[0].vat", "Total"] })).toEqual(["amount_unreadable", "vat_mismatch"]);
  });
  it("'totalVat' ya da bir satırın matrahı belirsizse toplam ve KDV belirsiz sayılmaz", () => {
    expect(checkExtraction({ ...goodOutput, unreadableFields: ["totalVat"] })).toEqual([]);
    expect(checkExtraction({ ...goodOutput, unreadableFields: ["vatLines[0].net"] })).toEqual([]);
  });
  it("bugünden ileri veya bir yıldan eski tarihi işaretler", () => {
    const today = new Date("2026-11-03T12:00:00Z");
    expect(checkExtraction({ ...goodOutput, date: "05.09.2062" }, today)).toEqual(["date_unusual"]);
    expect(checkExtraction({ ...goodOutput, date: "05.09.2025" }, today)).toEqual(["date_unusual"]);
    expect(checkExtraction({ ...goodOutput, date: "04.11.2026" }, today)).toEqual([]);
    expect(checkExtraction({ ...goodOutput, date: "05.11.2025" }, today)).toEqual([]);
  });
});

describe("belge türüne göre kontrol", () => {
  const foreign = { ...goodOutput, documentKind: "foreign_invoice" as const, taxNumber: null, vatLines: [], total: "125,00", currency: "USD" };
  it("yurt dışı faturada KDV satırı olmaması sorun değil; para birimi okunamazsa sorun", () => {
    expect(checkExtraction(foreign)).toEqual([]);
    expect(checkExtraction({ ...foreign, currency: null })).toEqual(["currency_unsure"]);
  });
  it("Z raporunda nakit ve kart toplamı tutmazsa ya da hiç okunamazsa sorun", () => {
    const z = { ...goodOutput, documentKind: "z_report" as const, cashTotal: "725,00", cardTotal: "8.000,00" };
    expect(checkExtraction(z)).toEqual([]);
    expect(checkExtraction({ ...z, cardTotal: "7.000,00" })).toEqual(["z_payment_split"]);
    expect(checkExtraction({ ...z, cashTotal: null, cardTotal: null })).toEqual(["z_payment_split"]);
  });
});

describe("ReceiptExtractionSchema sınırları", () => {
  it("anlamsız KDV oranını, uzun fiş no'yu ve aşırı satırı reddeder", () => {
    expect(ReceiptExtractionSchema.safeParse(goodOutput).success).toBe(true);
    expect(ReceiptExtractionSchema.safeParse({ ...goodOutput, vatLines: [{ rate: -100, gross: "1,00", vat: null }] }).success).toBe(false);
    expect(ReceiptExtractionSchema.safeParse({ ...goodOutput, vatLines: [{ rate: 150, gross: "1,00", vat: null, net: null }] }).success).toBe(false);
    expect(ReceiptExtractionSchema.safeParse({ ...goodOutput, receiptNo: "1".repeat(41) }).success).toBe(false);
    expect(ReceiptExtractionSchema.safeParse({ ...goodOutput, vatLines: Array(11).fill(goodOutput.vatLines[0]) }).success).toBe(false);
  });
});

describe("extractReceipt", () => {
  it("doğru fişte tek Haiku çağrısı yapar", async () => {
    const { client, parse } = mockClient(response(goodOutput));
    const result = await extractReceipt(image, client);
    expect(parse).toHaveBeenCalledTimes(1);
    const request = parse.mock.calls[0][0];
    expect(request.model).toBe("claude-haiku-5-5");
    expect(request).not.toHaveProperty("temperature");
    expect(request.thinking).toEqual({ type: "disabled" });
    expect(request.messages[0].content[0]).toMatchObject({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: image.toString("base64") } });
    expect(result).toMatchObject({ ok: true, model: "claude-haiku-5-5", problems: [], fallback: false, inputTokens: 3000, outputTokens: 300 });
  });

  it("kontrol başarısızsa bir kez Sonnet ile tekrar okur", async () => {
    const { client, parse } = mockClient(response({ ...goodOutput, total: "8.752,00" }), response(goodOutput));
    const result = await extractReceipt(image, client);
    expect(parse).toHaveBeenCalledTimes(2);
    expect(parse.mock.calls[1][0].model).toBe("claude-sonnet-5-5");
    expect(parse.mock.calls[1][0]).not.toHaveProperty("thinking");
    expect(result).toMatchObject({ ok: true, model: "claude-sonnet-5-5", problems: [], fallback: true, inputTokens: 6000, outputTokens: 600 });
  });

  it("çok fişli fotoğrafın kırpıntısını doğrudan Sonnet okur", async () => {
    const { client, parse } = mockClient(response(goodOutput));
    const result = await extractReceipt(image, client, "image/jpeg", true);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(parse.mock.calls[0][0].model).toBe("claude-sonnet-5-5");
    expect(result).toMatchObject({ ok: true, model: "claude-sonnet-5-5", fallback: false });
  });

  it("çok fişli kırpıntıda Sonnet hata verirse Haiku okur", async () => {
    const err = new Anthropic.InternalServerError(500, undefined, "boom", new Headers());
    const { client, parse } = mockClient(err, response(goodOutput));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await extractReceipt(image, client, "image/jpeg", true);
    expect(parse.mock.calls.map((c) => c[0].model)).toEqual(["claude-sonnet-5-5", "claude-haiku-5-5"]);
    expect(result).toMatchObject({ ok: true, model: "claude-haiku-5-5", fallback: true });
    log.mockRestore();
  });

  it("Sonnet de geçemezse sorunlarla döner", async () => {
    const bad = { ...goodOutput, total: "8.752,00" };
    const { client, parse } = mockClient(response(bad), response(bad));
    const result = await extractReceipt(image, client);
    expect(parse).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: true, problems: ["total_mismatch"] });
  });

  it("Sonnet daha kötü okursa ilk okumayı tutar", async () => {
    const { client } = mockClient(response({ ...goodOutput, total: "8.752,00" }), response({ ...goodOutput, total: "8.752,00", date: "31.02.2026" }));
    const result = await extractReceipt(image, client);
    expect(result).toMatchObject({ ok: true, model: "claude-haiku-5-5", problems: ["total_mismatch"], fallback: true });
  });

  it("refusal durumunda Sonnet ile tekrar dener", async () => {
    const { client, parse } = mockClient(response(null, "refusal"), response(goodOutput));
    const result = await extractReceipt(image, client);
    expect(parse).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: true, model: "claude-sonnet-5-5" });
  });

  it("şemaya uymayan çıktıda (ör. oran -100) Sonnet ile tekrar dener", async () => {
    const { client, parse } = mockClient(new Anthropic.AnthropicError("Failed to parse structured output"), response(goodOutput));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await extractReceipt(image, client);
    expect(parse).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: true, model: "claude-sonnet-5-5" });
    log.mockRestore();
  });

  it("Haiku API hatasında Sonnet'e geçer, ikisi de hata verirse ok:false döner", async () => {
    const err = new Anthropic.InternalServerError(500, undefined, "boom", new Headers());
    const { client, parse } = mockClient(err, err);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await extractReceipt(image, client);
    expect(parse).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ok: false, inputTokens: 0, outputTokens: 0 });
    expect(JSON.stringify(log.mock.calls)).not.toContain("fake-jpeg");
    log.mockRestore();
  });
});

describe("locateReceipts", () => {
  const boxes = (...b: { left: number; top: number; right: number; bottom: number }[]) => ({ parsed_output: { receipts: b }, stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } });
  // 2000x1000 photo: pixel edges come back as thousandths of the width and height.
  const photo = () => sharp({ create: { width: 2000, height: 1000, channels: 3, background: "#fff" } }).jpeg().toBuffer();
  it("piksel kutularını binde birlere çevirir; yalnız birden çok fiş varsa döner", async () => {
    const { locateReceipts } = await import("./extract");
    const two = mockClient(boxes({ left: 0, top: 0, right: 800, bottom: 1000 }, { left: 1000, top: 0, right: 1800, bottom: 1000 }));
    expect(await locateReceipts(await photo(), two.client)).toEqual([{ left: 0, top: 0, right: 400, bottom: 1000 }, { left: 500, top: 0, right: 900, bottom: 1000 }]);
    expect(two.parse.mock.calls[0][0].system).toContain("2000x1000");
    const one = mockClient(boxes({ left: 0, top: 0, right: 2000, bottom: 1000 }));
    expect(await locateReceipts(await photo(), one.client)).toEqual([]);
    // A sliver the model marks by mistake does not split the photo.
    const sliver = mockClient(boxes({ left: 0, top: 0, right: 1800, bottom: 1000 }, { left: 1900, top: 0, right: 1920, bottom: 1000 }));
    expect(await locateReceipts(await photo(), sliver.client)).toEqual([]);
  });
  it("bütün kutuları döner (fazlası route'ta sayılır), fotoğrafı tek fiş saymaz", async () => {
    const { locateReceipts } = await import("./extract");
    const many = mockClient(boxes(...Array.from({ length: 12 }, (_, i) => ({ left: i * 160, top: 0, right: i * 160 + 150, bottom: 1000 }))));
    expect(await locateReceipts(await photo(), many.client)).toHaveLength(12);
  });
  it("reads the photo whole when the call fails", async () => {
    const { locateReceipts } = await import("./extract");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const failed = mockClient(new Anthropic.APIConnectionError({ message: "down" }));
    expect(await locateReceipts(await photo(), failed.client)).toEqual([]);
    expect(await locateReceipts(Buffer.from("x"), failed.client)).toEqual([]);
    log.mockRestore();
  });
});
