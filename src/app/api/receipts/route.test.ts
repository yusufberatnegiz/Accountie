import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/queries", () => ({ hitRateLimit: vi.fn(), createReceipt: vi.fn(), getRules: vi.fn(), listReceipts: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getUserId: async () => "user-1" }));
vi.mock("@/lib/extract/extract", () => ({ extractReceipt: vi.fn() }));
vi.mock("@/lib/image", async (orig) => ({ ...(await orig<typeof import("@/lib/image")>()), normalizeImage: async (b: Buffer) => b }));

const { hitRateLimit, createReceipt, getRules } = await import("@/db/queries");
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

  it("günlük genel tavan dolunca modeli çağırmaz", async () => {
    vi.mocked(hitRateLimit).mockImplementation(async (key) => !key.startsWith("receiptGlobal:"));
    const res = await POST(jpeg());
    expect(res.status).toBe(503);
    expect(extractReceipt).not.toHaveBeenCalled();
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
