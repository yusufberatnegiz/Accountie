import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/queries", () => ({ hitRateLimit: vi.fn(), createReceipt: vi.fn(), hasDuplicateReceipt: vi.fn(), getRules: vi.fn(), listReceipts: vi.fn(), getVendorRule: vi.fn(async () => null) }));
const session = vi.hoisted(() => ({ createdAt: new Date(0) }));
vi.mock("@/lib/auth/session", () => ({ getUserId: async () => "user-1", getSessionUser: async () => ({ id: "user-1", createdAt: session.createdAt }) }));
vi.mock("@/lib/firm", () => ({ activeFirm: async () => ({ firms: [{ id: "firm-1", name: "ÖRNEK FİRMA", taxNumber: null }], firm: { id: "firm-1", name: "ÖRNEK FİRMA", taxNumber: null } }) }));
vi.mock("@/lib/extract/extract", () => ({ extractReceipt: vi.fn(), locateReceipts: vi.fn() }));
vi.mock("@/lib/tcmb", () => ({ tcmbRate: vi.fn(async () => ({ rate: 50, bulletinDate: "2026-10-30" })) }));
vi.mock("@/lib/image", async (orig) => ({ ...(await orig<typeof import("@/lib/image")>()), normalizeImage: async (b: Buffer) => b, cropReceipt: vi.fn(async () => Buffer.from("crop")) }));

const { hitRateLimit, createReceipt, getRules, hasDuplicateReceipt } = await import("@/db/queries");
const { DEFAULT_RULES } = await import("@/lib/default-rules");
const { extractReceipt, locateReceipts } = await import("@/lib/extract/extract");
const { POST } = await import("./route");
const { tcmbRate } = await import("@/lib/tcmb");

const read = (over: Record<string, unknown>) => ({
  ok: true as const, model: "m", inputTokens: 1, outputTokens: 1, problems: [],
  extraction: {
    vendorName: "x", taxOffice: null, taxNumber: null, date: "31.10.2026", time: null, receiptNo: null, zNo: null, ekuNo: null, vatLines: [],
    total: "100,00", paymentMethod: "card" as const, category: "other" as const, unreadableFields: [], documentKind: "receipt" as const,
    currency: "TRY", cashTotal: null, cardTotal: null, invoicedTotal: null, ...over,
  },
});
const pdf = () => {
  const form = new FormData();
  form.set("image", new File([new TextEncoder().encode("%PDF-1.7 fatura")], "fatura.pdf", { type: "application/pdf" }));
  return new Request("http://test/api/receipts", { method: "POST", body: form });
};

const jpeg = () => {
  const form = new FormData();
  form.set("image", new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])], "f.jpg", { type: "image/jpeg" }));
  return new Request("http://test/api/receipts", { method: "POST", body: form });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRules).mockResolvedValue({ rules: DEFAULT_RULES, rows: [] });
  vi.mocked(extractReceipt).mockResolvedValue({ ok: false, inputTokens: 0, outputTokens: 0 });
  vi.mocked(locateReceipts).mockResolvedValue([]);
});

describe("POST /api/receipts", () => {
  it("bildirilen gövde 4 MB'ı aşarsa okumadan reddeder", async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(true);
    const res = await POST(new Request("http://test/api/receipts", { method: "POST", headers: { "content-length": String(5 * 1024 * 1024) } }));
    expect(res.status).toBe(413);
    expect(extractReceipt).not.toHaveBeenCalled();
  });

  it("yeni hesap da aynı kullanıcı sınırıyla okur (ilk gün için ayrı sınır yok), fiş okuma IP başına da sınırlanır", async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(true);
    vi.mocked(createReceipt).mockResolvedValue("r-1");
    const kinds = () => vi.mocked(hitRateLimit).mock.calls.map(([k]) => k.split(":")[0]);
    await POST(jpeg());
    expect(kinds()).toEqual(["receipt", "receiptIp", "receiptGlobal"]);
    vi.mocked(hitRateLimit).mockClear();
    session.createdAt = new Date();
    await POST(jpeg());
    expect(kinds()).toEqual(["receipt", "receiptIp", "receiptGlobal"]);
    session.createdAt = new Date(0);
  });

  it("günlük genel tavan dolunca modeli çağırmaz", async () => {
    vi.mocked(hitRateLimit).mockImplementation(async (key) => !key.startsWith("receiptGlobal:"));
    const res = await POST(jpeg());
    expect(res.status).toBe(503);
    expect(extractReceipt).not.toHaveBeenCalled();
  });

  it("aynı VKN, fiş no ve tarihle kayıtlı fiş varsa uyarıyla yine kaydeder", async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(true);
    vi.mocked(createReceipt).mockResolvedValue("r-2");
    vi.mocked(hasDuplicateReceipt).mockResolvedValue(true);
    vi.mocked(extractReceipt).mockResolvedValue({
      ok: true, model: "m", inputTokens: 1, outputTokens: 1, problems: [],
      extraction: {
        vendorName: "ÖRNEK BALIK LOKANTASI", taxOffice: null, taxNumber: "1111111114", date: "05.09.2026", time: null, receiptNo: "0047",
        zNo: null, ekuNo: null, vatLines: [{ rate: 10, gross: "8.725,00", vat: "793,18" }], total: "8.725,00",
        paymentMethod: "card", category: "meal", unreadableFields: [], documentKind: "receipt", currency: "TRY", cashTotal: null, cardTotal: null, invoicedTotal: null,
      },
    });
    const res = await POST(jpeg());
    expect(res.status).toBe(201);
    expect(hasDuplicateReceipt).toHaveBeenCalledWith("user-1", "1111111114", "0047", "2026-09-05");
    expect(vi.mocked(createReceipt).mock.calls[0][2].warnings.map((w) => w.code)).toContain("duplicate");
  });

  it("tek karedeki birden çok fişi ayrı ayrı okuyup her birini ayrı fiş olarak kaydeder", async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(true);
    vi.mocked(createReceipt).mockResolvedValueOnce("r-1").mockResolvedValueOnce("r-2").mockResolvedValueOnce("r-3");
    const box = (left: number) => ({ left, top: 0, right: left + 300, bottom: 1000 });
    vi.mocked(locateReceipts).mockResolvedValue([box(0), box(330), box(660)]);
    const res = await POST(jpeg());
    expect(res.status).toBe(201);
    expect((await res.json()).ids).toEqual(["r-1", "r-2", "r-3"]);
    expect(extractReceipt).toHaveBeenCalledTimes(3);
    expect(vi.mocked(extractReceipt).mock.calls.every(([b]) => b.toString() === "crop")).toBe(true);
    // The photo counts once; each further receipt is one more read on the user's and the global limit.
    const kinds = vi.mocked(hitRateLimit).mock.calls.map(([k]) => k.split(":")[0]);
    expect(kinds).toEqual(["receipt", "receiptIp", "receiptGlobal", "receipt", "receiptGlobal", "receipt", "receiptGlobal"]);
  });

  it("sınır dolunca karedeki kalan fişleri okumaz", async () => {
    vi.mocked(hitRateLimit).mockImplementation(async () => vi.mocked(hitRateLimit).mock.calls.length <= 3);
    vi.mocked(createReceipt).mockResolvedValue("r-1");
    vi.mocked(locateReceipts).mockResolvedValue([{ left: 0, top: 0, right: 400, bottom: 1000 }, { left: 500, top: 0, right: 900, bottom: 1000 }]);
    const res = await POST(jpeg());
    expect((await res.json()).ids).toEqual(["r-1"]);
    expect(extractReceipt).toHaveBeenCalledTimes(1);
  });

  it("PDF faturayı çözmeden, bölmeden okuyucuya PDF olarak verir", async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(true);
    vi.mocked(createReceipt).mockResolvedValue("r-pdf");
    const res = await POST(pdf());
    expect(res.status).toBe(201);
    expect(locateReceipts).not.toHaveBeenCalled();
    expect(vi.mocked(extractReceipt).mock.calls[0][2]).toBe("application/pdf");
  });

  it("5 sayfadan uzun PDF'i okumadan reddeder", async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(true);
    const form = new FormData();
    form.set("image", new File([new TextEncoder().encode("%PDF-1.7 " + "<< /Type /Page >> ".repeat(6))], "uzun.pdf", { type: "application/pdf" }));
    const res = await POST(new Request("http://test/api/receipts", { method: "POST", body: form }));
    expect(res.status).toBe(413);
    expect(extractReceipt).not.toHaveBeenCalled();
  });

  it("PDF uzantılı ama içi PDF olmayan dosyayı reddeder", async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(true);
    const form = new FormData();
    form.set("image", new File([new TextEncoder().encode("<html>")], "x.pdf", { type: "application/pdf" }));
    const res = await POST(new Request("http://test/api/receipts", { method: "POST", body: form }));
    expect(res.status).toBe(415);
    expect(extractReceipt).not.toHaveBeenCalled();
  });

  it("dolarlı yurt dışı faturayı TCMB kuruyla TL'ye çevirir; satıcı öğrenilmez, VKN tutulmaz", async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(true);
    vi.mocked(createReceipt).mockResolvedValue("r-g");
    vi.mocked(extractReceipt).mockResolvedValue(read({ documentKind: "foreign_invoice", vendorName: "Google Ireland Limited", receiptNo: "5234567890", currency: "USD", taxNumber: "1111111114" }));
    const res = await POST(pdf());
    expect(res.status).toBe(201);
    expect(tcmbRate).toHaveBeenCalledWith("USD", "2026-10-31");
    const [, , receipt, lines] = vi.mocked(createReceipt).mock.calls[0];
    expect(receipt).toMatchObject({ category: "foreign", taxNumber: null, totalKurus: 500000, receiptNo: "5234567890" });
    expect(lines.map((l) => [l.accountCode, l.debitKurus, l.creditKurus])).toEqual([["760.01", 500000, 0], ["191.04", 100000, 0], ["360.01", 0, 100000], ["331.01", 0, 500000]]);
  });

  it("Z raporunu gelir fişi olarak kaydeder, aynı Z no ve tarihle kayıtlıysa uyarır", async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(true);
    vi.mocked(createReceipt).mockResolvedValue("r-z");
    vi.mocked(hasDuplicateReceipt).mockResolvedValue(true);
    vi.mocked(extractReceipt).mockResolvedValue(read({ documentKind: "z_report", vendorName: "ÖRNEK KAFE", taxNumber: "1111111114", zNo: "0128", total: "1.200,00", vatLines: [{ rate: 20, gross: "1.200,00", vat: "200,00" }], cashTotal: "200,00", cardTotal: "1.000,00" }));
    const res = await POST(jpeg());
    expect(res.status).toBe(201);
    expect(hasDuplicateReceipt).toHaveBeenCalledWith("user-1", "1111111114", "0128", "2026-10-31");
    const [, , receipt, lines] = vi.mocked(createReceipt).mock.calls[0];
    expect(receipt).toMatchObject({ category: "z_report", receiptNo: "0128", totalKurus: 120000 });
    expect(receipt.warnings.map((w) => w.code)).toContain("duplicate");
    expect(lines.map((l) => [l.accountCode, l.debitKurus, l.creditKurus])).toEqual([["100.01", 20000, 0], ["108.01", 100000, 0], ["600.20", 0, 100000], ["391.20", 0, 20000]]);
  });

  it("kayıt hatasında Türkçe 500 döner", async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(true);
    vi.mocked(createReceipt).mockRejectedValue(new Error("bigint out of range"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(jpeg());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).toContain("kaydedilemedi");
    log.mockRestore();
  });
});
