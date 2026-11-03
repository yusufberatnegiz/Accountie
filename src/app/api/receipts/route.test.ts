import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/queries", () => ({ hitRateLimit: vi.fn(), createReceipt: vi.fn(), hasDuplicateReceipt: vi.fn(), getRules: vi.fn(), listReceipts: vi.fn() }));
const session = vi.hoisted(() => ({ createdAt: new Date(0) }));
vi.mock("@/lib/auth/session", () => ({ getUserId: async () => "user-1", getSessionUser: async () => ({ id: "user-1", createdAt: session.createdAt }) }));
vi.mock("@/lib/extract/extract", () => ({ extractReceipt: vi.fn() }));
vi.mock("@/lib/image", async (orig) => ({ ...(await orig<typeof import("@/lib/image")>()), normalizeImage: async (b: Buffer) => b }));

const { hitRateLimit, createReceipt, getRules, hasDuplicateReceipt } = await import("@/db/queries");
const { DEFAULT_RULES } = await import("@/lib/default-rules");
const { extractReceipt } = await import("@/lib/extract/extract");
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
        vendorName: "ÖRNEK ALABALIK", taxOffice: null, taxNumber: "1111111114", date: "05.09.2026", time: null, receiptNo: "0047",
        zNo: null, ekuNo: null, vatLines: [{ rate: 10, gross: "8.725,00", vat: "793,18" }], total: "8.725,00",
        paymentMethod: "card", category: "meal", unreadableFields: [],
      },
    });
    const res = await POST(jpeg());
    expect(res.status).toBe(201);
    expect(hasDuplicateReceipt).toHaveBeenCalledWith("user-1", "1111111114", "0047", "2026-09-05");
    expect(vi.mocked(createReceipt).mock.calls[0][1].warnings.map((w) => w.code)).toContain("duplicate");
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
