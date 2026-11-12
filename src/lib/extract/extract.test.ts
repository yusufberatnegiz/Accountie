import Anthropic from "@anthropic-ai/sdk";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { extractReceipt, type ExtractClient } from "./extract";
import { checkExtraction, ReceiptExtractionSchema, toReceiptData, type ReceiptExtraction } from "./schema";

const goodOutput: ReceiptExtraction = {
  vendorName: "ÖRNEK BALIK LOKANTASI VE RES.İŞL.LTD.ŞTİ",
  taxOffice: "ANTALYA KURUMLAR",
  taxNumber: "1111111114",
  date: "05.09.2026",
  time: "20:15",
  receiptNo: "0047",
  zNo: null,
  ekuNo: "0001",
  vatLines: [{ rate: 10, gross: "8.725,00", vat: "793,18" }],
  total: "8.725,00",
  paymentMethod: "card",
  category: "meal",
  unreadableFields: ["zNo"],
  documentKind: "receipt",
  currency: "TRY",
  cashTotal: null,
  cardTotal: null,
  invoicedTotal: null,
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
    const data = toReceiptData({ ...goodOutput, total: "8.7?5,00", vatLines: [{ rate: 10, gross: "8.725,00", vat: null }] });
    expect(data.totalKurus).toBeNull();
    expect(data.vatLines[0].vatKurus).toBeNull();
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
    expect(checkExtraction({ ...goodOutput, vatLines: [{ rate: 10, gross: "8.725,00", vat: "893,18" }] })).toContain("vat_mismatch");
  });
  it("KDV kırılımı boşsa sorun bildirir, böylece Sonnet denenir", () => {
    expect(checkExtraction({ ...goodOutput, vatLines: [] })).toEqual(["total_mismatch"]);
  });
  it("modelin emin olmadığı alanları sorun sayar", () => {
    expect(checkExtraction({ ...goodOutput, unreadableFields: ["total", "date"] })).toEqual(["amount_unreadable", "date_invalid"]);
    expect(checkExtraction({ ...goodOutput, unreadableFields: ["paymentMethod", "receiptNo"] })).toEqual(["payment_unsure", "receipt_no_unsure"]);
    expect(checkExtraction({ ...goodOutput, unreadableFields: ["vatLines[0].vat", "Total"] })).toEqual(["amount_unreadable", "vat_mismatch"]);
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
    expect(ReceiptExtractionSchema.safeParse({ ...goodOutput, vatLines: [{ rate: 150, gross: "1,00", vat: null }] }).success).toBe(false);
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
  it("returns the boxes only when the photo holds more than one receipt", async () => {
    const { locateReceipts } = await import("./extract");
    const two = mockClient(boxes({ left: 0, top: 0, right: 400, bottom: 1000 }, { left: 500, top: 0, right: 900, bottom: 1000 }));
    expect(await locateReceipts(Buffer.from("x"), two.client)).toHaveLength(2);
    const one = mockClient(boxes({ left: 0, top: 0, right: 1000, bottom: 1000 }));
    expect(await locateReceipts(Buffer.from("x"), one.client)).toEqual([]);
    // A sliver the model marks by mistake does not split the photo.
    const sliver = mockClient(boxes({ left: 0, top: 0, right: 900, bottom: 1000 }, { left: 950, top: 0, right: 960, bottom: 1000 }));
    expect(await locateReceipts(Buffer.from("x"), sliver.client)).toEqual([]);
  });
  it("reads the photo whole when the call fails", async () => {
    const { locateReceipts } = await import("./extract");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const failed = mockClient(new Anthropic.APIConnectionError({ message: "down" }));
    expect(await locateReceipts(Buffer.from("x"), failed.client)).toEqual([]);
    log.mockRestore();
  });
});
