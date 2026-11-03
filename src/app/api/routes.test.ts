import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RULES } from "@/lib/default-rules";
import { buildJournalLines } from "@/lib/journal";

vi.mock("@/lib/auth/session", () => {
  const getUserId = vi.fn();
  return { getUserId, getSessionUser: async () => { const id = await getUserId(); return id ? { id, createdAt: new Date(0) } : null; } };
});
vi.mock("@/db/queries", () => ({
  createReceipt: vi.fn(), hasDuplicateReceipt: vi.fn(async () => false), getRules: vi.fn(), listReceipts: vi.fn(), getReceipt: vi.fn(),
  replaceLines: vi.fn(), deleteDraft: vi.fn(), transitionReceipt: vi.fn(), listForExport: vi.fn(), markExported: vi.fn(), saveRules: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({ allow: vi.fn(), clientIp: () => "203.0.113.9" }));
vi.mock("@/lib/extract/extract", () => ({ extractReceipt: vi.fn() }));
vi.mock("@/lib/image", async (original) => ({ ...(await original<typeof import("@/lib/image")>()), normalizeImage: vi.fn(async () => Buffer.from("jpeg")) }));

const session = await import("@/lib/auth/session");
const q = await import("@/db/queries");
const { extractReceipt } = await import("@/lib/extract/extract");
const { allow } = await import("@/lib/rate-limit");
const receiptsRoute = await import("./receipts/route");
const receiptRoute = await import("./receipts/[id]/route");
const approveRoute = await import("./receipts/[id]/approve/route");
const exportsRoute = await import("./exports/route");
const exportedRoute = await import("./receipts/[id]/exported/route");
const reopenRoute = await import("./receipts/[id]/reopen/route");
const rulesRoute = await import("./account-rules/route");

const USER = "user-a";
const ID = "8b0f6c1e-1b7a-4c1e-9d55-0d6f1d7a2c11";
const params = (id = ID) => ({ params: Promise.resolve({ id }) });
const { lines } = buildJournalLines({
  vendorName: "ÖRNEK ALABALIK ÜRETİM ÇİFTLİĞİ VE RES.İŞL.LTD.ŞTİ", receiptNo: "0047", date: "2026-09-05",
  vatLines: [{ rate: 10, grossKurus: 872500, vatKurus: 79318 }], totalKurus: 872500, paymentMethod: "card", category: "meal",
}, DEFAULT_RULES);
const draft = { id: ID, status: "draft", lines } as unknown as Awaited<ReturnType<typeof q.getReceipt>>;

const JPEG_MAGIC = [0xff, 0xd8, 0xff, 0xe0];
function upload(type = "image/jpeg", size = 100, head: number[] = JPEG_MAGIC) {
  const bytes = new Uint8Array(size);
  bytes.set(head);
  const form = new FormData();
  form.set("image", new File([bytes], "fis.jpg", { type }));
  return new Request("http://test/api/receipts", { method: "POST", body: form });
}
const json = (body: unknown, method = "PATCH") => new Request("http://test", { method, body: JSON.stringify(body), headers: { "content-type": "application/json" } });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(session.getUserId).mockResolvedValue(USER);
  vi.mocked(allow).mockResolvedValue(true);
  vi.mocked(q.getRules).mockResolvedValue({ rules: DEFAULT_RULES, rows: [] });
  vi.mocked(q.createReceipt).mockResolvedValue(ID);
  vi.mocked(q.getReceipt).mockResolvedValue(draft);
});

describe("oturum", () => {
  it("oturumsuz her uç 401 döner", async () => {
    vi.mocked(session.getUserId).mockResolvedValue(null);
    const responses = await Promise.all([
      receiptsRoute.POST(upload()), receiptsRoute.GET(new Request("http://test/api/receipts")),
      receiptRoute.GET(new Request("http://test"), params()), receiptRoute.PATCH(json({ lines }), params()),
      receiptRoute.DELETE(new Request("http://test"), params()), approveRoute.POST(new Request("http://test"), params()),
      exportsRoute.POST(json({}, "POST")), rulesRoute.GET(), rulesRoute.PUT(json({ rows: [] }, "PUT")),
      exportedRoute.POST(new Request("http://test"), params()), reopenRoute.POST(new Request("http://test"), params()),
    ]);
    expect(responses.map((r) => r.status)).toEqual(Array(11).fill(401));
    expect(q.transitionReceipt).not.toHaveBeenCalled();
    expect(q.createReceipt).not.toHaveBeenCalled();
  });
});

describe("POST /api/receipts", () => {
  it("örnek fişi okuyup üç satırla kaydeder", async () => {
    vi.mocked(extractReceipt).mockResolvedValue({
      ok: true, model: "claude-haiku-5-5", problems: [], inputTokens: 3000, outputTokens: 300,
      extraction: {
        vendorName: "ÖRNEK ALABALIK ÜRETİM ÇİFTLİĞİ VE RES.İŞL.LTD.ŞTİ", taxOffice: null, taxNumber: "1111111114", date: "05.09.2026", time: null,
        receiptNo: "0047", zNo: null, ekuNo: null, vatLines: [{ rate: 10, gross: "8.725,00", vat: "793,18" }], total: "8.725,00",
        paymentMethod: "card", category: "meal", unreadableFields: [],
      },
    });
    const res = await receiptsRoute.POST(upload());
    expect(res.status).toBe(201);
    const [userId, receipt, saved] = vi.mocked(q.createReceipt).mock.calls[0];
    expect(userId).toBe(USER);
    expect(receipt).toMatchObject({ receiptNo: "0047", receiptDate: "2026-09-05", totalKurus: 872500, model: "claude-haiku-5-5", inputTokens: 3000 });
    expect(saved.map((l) => [l.accountCode, l.debitKurus, l.creditKurus])).toEqual([["770.08", 793182, 0], ["191.03.10", 79318, 0], ["331.01", 0, 872500]]);
  });

  it("okunamayan fişi elle doldurulmak üzere taslak olarak kaydeder", async () => {
    vi.mocked(extractReceipt).mockResolvedValue({ ok: false, inputTokens: 10, outputTokens: 0 });
    const res = await receiptsRoute.POST(upload());
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ readable: false });
    expect(vi.mocked(q.createReceipt).mock.calls[0][1].warnings.map((w) => w.code)).toContain("extraction_failed");
  });

  it("izin verilmeyen türü 415, 4 MB üstünü 413 ile reddeder", async () => {
    expect((await receiptsRoute.POST(upload("application/pdf"))).status).toBe(415);
    expect((await receiptsRoute.POST(upload("image/jpeg", 4 * 1024 * 1024 + 1))).status).toBe(413);
    expect(extractReceipt).not.toHaveBeenCalled();
  });

  it("image/jpeg diye gönderilen SVG'yi imzadan tanıyıp 415 ile reddeder", async () => {
    const svg = [..."<svg xmlns"].map((c) => c.charCodeAt(0));
    expect((await receiptsRoute.POST(upload("image/jpeg", 100, svg))).status).toBe(415);
    const { normalizeImage } = await import("@/lib/image");
    expect(normalizeImage).not.toHaveBeenCalled();
    expect(extractReceipt).not.toHaveBeenCalled();
  });

  it("oran sınırını aşınca 429 döner", async () => {
    vi.mocked(allow).mockResolvedValue(false);
    expect((await receiptsRoute.POST(upload())).status).toBe(429);
    expect(allow).toHaveBeenCalledWith("receipt", USER);
    expect(extractReceipt).not.toHaveBeenCalled();
  });
});

describe("tek fiş", () => {
  it("başka kullanıcının fişi 404 döner", async () => {
    vi.mocked(q.getReceipt).mockResolvedValue(null);
    expect((await receiptRoute.GET(new Request("http://test"), params())).status).toBe(404);
    expect((await approveRoute.POST(new Request("http://test"), params())).status).toBe(404);
    expect(q.getReceipt).toHaveBeenCalledWith(USER, ID);
  });

  it("geçersiz kimlik 404 döner, veritabanına gitmez", async () => {
    expect((await receiptRoute.GET(new Request("http://test"), params("../x"))).status).toBe(404);
    expect(q.getReceipt).not.toHaveBeenCalled();
  });

  it("PATCH beyaz liste dışındaki alanları yok sayar", async () => {
    const res = await receiptRoute.PATCH(json({ status: "approved", userId: "other", lines: lines.map((l) => ({ ...l, userId: "other", id: "x" })) }), params());
    expect(res.status).toBe(200);
    const [userId, id, saved] = vi.mocked(q.replaceLines).mock.calls[0];
    expect([userId, id]).toEqual([USER, ID]);
    expect(saved[0]).not.toHaveProperty("userId");
    expect(q.transitionReceipt).not.toHaveBeenCalled();
  });

  it("PATCH hatalı hesap kodunu reddeder", async () => {
    const res = await receiptRoute.PATCH(json({ lines: [{ ...lines[0], accountCode: "77O.08" }] }), params());
    expect(res.status).toBe(400);
  });

  it("onaylı fiş düzenlenemez", async () => {
    vi.mocked(q.getReceipt).mockResolvedValue({ ...draft!, status: "approved" });
    expect((await receiptRoute.PATCH(json({ lines }), params())).status).toBe(409);
  });

  it("dengesiz fiş onaylanamaz (422)", async () => {
    vi.mocked(q.getReceipt).mockResolvedValue({ ...draft!, lines: lines.slice(0, 2) });
    const res = await approveRoute.POST(new Request("http://test"), params());
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("8.725,00");
    expect(q.transitionReceipt).not.toHaveBeenCalled();
  });

  it("evrak tarihi boş fiş onaylanamaz (422)", async () => {
    vi.mocked(q.getReceipt).mockResolvedValue({ ...draft!, lines: lines.map((l) => ({ ...l, documentDate: null })) });
    const res = await approveRoute.POST(new Request("http://test"), params());
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("Evrak tarihi eksik");
    expect(q.transitionReceipt).not.toHaveBeenCalled();
  });

  it("dengeli fiş onaylanır", async () => {
    vi.mocked(q.transitionReceipt).mockResolvedValue(true);
    expect((await approveRoute.POST(new Request("http://test"), params())).status).toBe(200);
    expect(q.transitionReceipt).toHaveBeenCalledWith(USER, ID, "draft", "approved");
  });
});

describe("POST /api/exports", () => {
  it("dengeli fişlerden xlsx üretir ve aktarıldı işaretler", async () => {
    vi.mocked(q.listForExport).mockResolvedValue([{ id: ID, lines }, { id: "bad", lines: lines.slice(0, 1) }]);
    const res = await exportsRoute.POST(json({}, "POST"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("spreadsheetml");
    expect(q.markExported).toHaveBeenCalledWith(USER, [ID]);
  });

  it("onaylı fiş yoksa 404", async () => {
    vi.mocked(q.listForExport).mockResolvedValue([]);
    expect((await exportsRoute.POST(json({}, "POST"))).status).toBe(404);
  });
});

describe("POST /api/receipts/[id]/exported", () => {
  it("elle girilen fişi aktarıldı yapar, geçersiz id 404", async () => {
    expect((await exportedRoute.POST(new Request("http://test"), params())).status).toBe(204);
    expect(q.markExported).toHaveBeenCalledWith(USER, [ID]);
    expect((await exportedRoute.POST(new Request("http://test"), params("x"))).status).toBe(404);
  });
});

describe("PUT /api/account-rules", () => {
  it("bilinmeyen anahtarı ve hatalı kodu reddeder", async () => {
    expect((await rulesRoute.PUT(json({ rows: [{ kind: "expense", key: "hack", accountCode: "770.08", accountName: "x" }] }, "PUT"))).status).toBe(400);
    expect((await rulesRoute.PUT(json({ rows: [{ kind: "expense", key: "meal", accountCode: "77008", accountName: "x" }] }, "PUT"))).status).toBe(400);
    expect(q.saveRules).not.toHaveBeenCalled();
  });

  it("geçerli kuralı etiketi sunucuda belirleyerek kaydeder", async () => {
    const res = await rulesRoute.PUT(json({ rows: [{ kind: "payment", key: "card", accountCode: "309.01", accountName: "Diğer Mali Borçlar", label: "x" }] }, "PUT"));
    expect(res.status).toBe(200);
    expect(q.saveRules).toHaveBeenCalledWith(USER, [{ kind: "payment", key: "card", accountCode: "309.01", accountName: "Diğer Mali Borçlar", label: "Kart" }]);
  });
});
