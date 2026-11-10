import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RULES } from "@/lib/default-rules";
import { buildJournalLines } from "@/lib/journal";
import { hashToken } from "@/lib/auth/extension-token";

vi.mock("@/lib/auth/session", () => ({ getUserId: vi.fn() }));
vi.mock("@/db/queries", () => ({
  createExtensionToken: vi.fn(), revokeExtensionTokens: vi.fn(), userIdForTokenHash: vi.fn(), listForExport: vi.fn(), markExported: vi.fn(), importLucaFirm: vi.fn(),
}));

const session = await import("@/lib/auth/session");
const q = await import("@/db/queries");
const tokensRoute = await import("./extension-tokens/route");
const listRoute = await import("./extension/receipts/route");
const transferredRoute = await import("./extension/receipts/[id]/transferred/route");
const firmsRoute = await import("./extension/firms/route");

const USER = "user-a";
const ID = "8b0f6c1e-1b7a-4c1e-9d55-0d6f1d7a2c11";
const TOKEN = `acx_${"a".repeat(43)}`;
const params = (id = ID) => ({ params: Promise.resolve({ id }) });
const bearer = (token = TOKEN, method = "GET") => new Request("http://test", { method, headers: { authorization: `Bearer ${token}` } });
const { lines } = buildJournalLines({
  vendorName: "ÖRNEK BALIK LOKANTASI VE RES.İŞL.LTD.ŞTİ", receiptNo: "0047", date: "2026-09-05",
  vatLines: [{ rate: 10, grossKurus: 872500, vatKurus: 79318 }], totalKurus: 872500, paymentMethod: "card", category: "meal",
}, DEFAULT_RULES);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(session.getUserId).mockResolvedValue(USER);
  vi.mocked(q.userIdForTokenHash).mockImplementation(async (h) => (h === hashToken(TOKEN) ? USER : null));
  vi.mocked(q.listForExport).mockResolvedValue([{ id: ID, firmName: "ÖRNEK FİRMA", taxNumber: null, lines }]);
});

describe("POST/DELETE /api/extension-tokens", () => {
  it("oturumsuz 401", async () => {
    vi.mocked(session.getUserId).mockResolvedValue(null);
    expect((await tokensRoute.POST()).status).toBe(401);
    expect((await tokensRoute.DELETE()).status).toBe(401);
    expect(q.createExtensionToken).not.toHaveBeenCalled();
  });

  it("anahtarı bir kez döndürür, veritabanına yalnızca özetini yazar", async () => {
    const res = await tokensRoute.POST();
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.token).toMatch(/^acx_[A-Za-z0-9_-]{43}$/);
    const [userId, hash, expiresAt] = vi.mocked(q.createExtensionToken).mock.calls[0];
    expect(userId).toBe(USER);
    expect(hash).toBe(hashToken(body.token));
    expect(hash).not.toContain(body.token.slice(4));
    const hours = (expiresAt.getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(11.9);
    expect(hours).toBeLessThanOrEqual(12);
  });

  it("DELETE kullanıcının anahtarlarını iptal eder", async () => {
    expect((await tokensRoute.DELETE()).status).toBe(204);
    expect(q.revokeExtensionTokens).toHaveBeenCalledWith(USER);
  });
});

describe("GET /api/extension/receipts", () => {
  it("anahtarsız, bozuk veya bilinmeyen anahtar 401", async () => {
    for (const req of [new Request("http://test"), bearer("acx_kisa"), bearer(`acx_${"b".repeat(43)}`)]) {
      expect((await listRoute.GET(req)).status).toBe(401);
    }
    expect(q.listForExport).not.toHaveBeenCalled();
  });

  it("çerez oturumunu kabul etmez, sadece anahtar", async () => {
    expect((await listRoute.GET(new Request("http://test"))).status).toBe(401);
    expect(session.getUserId).not.toHaveBeenCalled();
  });

  it("anahtarın sahibinin onaylı fişlerini Luca satırlarıyla döndürür, CORS başlığı yok", async () => {
    const res = await listRoute.GET(bearer());
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
    expect(q.listForExport).toHaveBeenCalledWith(USER, null);
    const { receipts } = await res.json();
    expect(receipts).toEqual([{
      id: ID, firm: "ÖRNEK FİRMA", title: "ÖRNEK BALIK LOKANTASI VE RES.İŞL.LTD.ŞTİ", documentNo: "0047", documentDate: "05/09/2026", total: "8.725,00",
      rows: expect.arrayContaining([expect.objectContaining({ accountCode: "331.01", credit: "8.725,00", debit: "" })]),
    }]);
    expect(receipts[0].rows).toHaveLength(3);
  });

  it("dengesiz fişi göndermez", async () => {
    vi.mocked(q.listForExport).mockResolvedValue([{ id: ID, firmName: "ÖRNEK FİRMA", taxNumber: null, lines: lines.slice(0, 2) }]);
    expect((await (await listRoute.GET(bearer())).json()).receipts).toEqual([]);
  });
});

describe("POST /api/extension/receipts/[id]/transferred", () => {
  it("anahtarsız 401, geçersiz id 404", async () => {
    expect((await transferredRoute.POST(new Request("http://test", { method: "POST" }), params())).status).toBe(401);
    expect((await transferredRoute.POST(bearer(TOKEN, "POST"), params("x"))).status).toBe(404);
    expect(q.markExported).not.toHaveBeenCalled();
  });

  it("fişi anahtar sahibinin adına aktarıldı yapar", async () => {
    expect((await transferredRoute.POST(bearer(TOKEN, "POST"), params())).status).toBe(204);
    expect(q.markExported).toHaveBeenCalledWith(USER, [ID]);
  });
});

describe("POST /api/extension/firms", () => {
  const FIRM = { lucaId: "11", name: "ÖRNEK GIDA LTD. ŞTİ.", taxNumber: "1234567890", accounts: [{ code: "770.08", name: "Yeme-İçme Ve Ağırlama" }, { code: "320.M07", name: "ÖRNEK SATICI" }] };
  const post = (body: unknown, token = TOKEN) => new Request("http://test", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });

  it("anahtarsız ya da bilinmeyen anahtar 401, çerez oturumu yetmez", async () => {
    expect((await firmsRoute.POST(new Request("http://test", { method: "POST", body: JSON.stringify(FIRM) }))).status).toBe(401);
    expect((await firmsRoute.POST(post(FIRM, `acx_${"b".repeat(43)}`))).status).toBe(401);
    expect(q.importLucaFirm).not.toHaveBeenCalled();
  });

  it("bozuk firma 400: hesapsız plan, kod biçimi dışı hesap, sayı olmayan Luca no", async () => {
    for (const bad of [{ ...FIRM, accounts: [] }, { ...FIRM, accounts: [{ code: "77", name: "x" }] }, { ...FIRM, lucaId: "11; drop" }, "x"]) {
      expect((await firmsRoute.POST(post(bad))).status).toBe(400);
    }
    expect(q.importLucaFirm).not.toHaveBeenCalled();
  });

  it("yeni firma 201, yeniden gelen firma 200; anahtar sahibinin adına kaydedilir", async () => {
    vi.mocked(q.importLucaFirm).mockResolvedValueOnce({ id: "firm-1", created: true });
    const res = await firmsRoute.POST(post(FIRM));
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ created: true, accounts: 2 });
    expect(q.importLucaFirm).toHaveBeenCalledWith(USER, FIRM, 2000);
    vi.mocked(q.importLucaFirm).mockResolvedValueOnce({ id: "firm-1", created: false });
    expect((await firmsRoute.POST(post(FIRM))).status).toBe(200);
  });

  it("firma sınırında 409", async () => {
    vi.mocked(q.importLucaFirm).mockResolvedValueOnce(null);
    expect((await firmsRoute.POST(post(FIRM))).status).toBe(409);
  });
});
