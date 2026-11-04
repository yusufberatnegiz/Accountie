import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/queries", () => ({ hitRateLimit: vi.fn(), createReceipt: vi.fn(), hasDuplicateReceipt: vi.fn(), getRules: vi.fn(), listReceipts: vi.fn() }));
const session = vi.hoisted(() => ({ createdAt: new Date(0) }));
vi.mock("@/lib/auth/session", () => ({ getUserId: async () => "user-1", getSessionUser: async () => ({ id: "user-1", createdAt: session.createdAt }) }));
vi.mock("@/lib/extract/extract", () => ({ extractReceipt: vi.fn(), locateReceipts: vi.fn() }));
vi.mock("@/lib/image", async (orig) => ({ ...(await orig<typeof import("@/lib/image")>()), normalizeImage: async (b: Buffer) => b, cropReceipt: vi.fn(async () => Buffer.from("crop")) }));

const { hitRateLimit, createReceipt, getRules, hasDuplicateReceipt } = await import("@/db/queries");
const { DEFAULT_RULES } = await import("@/lib/default-rules");
const { extractReceipt, locateReceipts } = await import("@/lib/extract/extract");
const { POST } = await import("./route");

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

  it("yeni hesap düşük günlük sınırla, fiş okuma IP başına da sınırlanır", async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(true);
    vi.mocked(createReceipt).mockResolvedValue("r-1");
    const kinds = () => vi.mocked(hitRateLimit).mock.calls.map(([k]) => k.split(":")[0]);
    await POST(jpeg());
    expect(kinds()).toEqual(["receipt", "receiptIp", "receiptGlobal"]);
    vi.mocked(hitRateLimit).mockClear();
    session.createdAt = new Date();
    await POST(jpeg());
    expect(kinds()).toEqual(["receiptNew", "receiptIp", "receiptGlobal"]);
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
        vendorName: "ARKADAŞ ALABALIK", taxOffice: null, taxNumber: "0790014526", date: "05.09.2026", time: null, receiptNo: "0047",
        zNo: null, ekuNo: null, vatLines: [{ rate: 10, gross: "8.725,00", vat: "793,18" }], total: "8.725,00",
        paymentMethod: "card", category: "meal", unreadableFields: [],
      },
    });
    const res = await POST(jpeg());
    expect(res.status).toBe(201);
    expect(hasDuplicateReceipt).toHaveBeenCalledWith("user-1", "0790014526", "0047", "2026-09-05");
    expect(vi.mocked(createReceipt).mock.calls[0][1].warnings.map((w) => w.code)).toContain("duplicate");
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
