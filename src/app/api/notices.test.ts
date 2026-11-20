import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashToken } from "@/lib/auth/extension-token";

vi.mock("@/lib/auth/session", () => ({ getUserId: vi.fn() }));
vi.mock("@/db/queries", () => ({ userIdForTokenHash: vi.fn(), saveNotices: vi.fn(), markNoticesSeen: vi.fn() }));

const session = await import("@/lib/auth/session");
const q = await import("@/db/queries");
const noticesRoute = await import("./extension/notices/route");
const seenRoute = await import("./notices/seen/route");

const USER = "user-a";
const TOKEN = `acx_${"a".repeat(43)}`;
const NOTICE = { gibId: "123456", institution: "Gelir İdaresi Başkanlığı", subUnit: "Kadıköy VD", docType: "Vergi/Ceza İhbarnamesi", docNo: "2026-1", sentAt: "15/11/2026", servedAt: "20/11/2026", readOnGib: false };
const BODY = { idNumbers: ["1234567890"], notices: [NOTICE] };
const post = (body: unknown, token: string | null = TOKEN) => new Request("http://test", {
  method: "POST", headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" }, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(q.userIdForTokenHash).mockImplementation(async (h) => (h === hashToken(TOKEN) ? USER : null));
  vi.mocked(session.getUserId).mockResolvedValue(USER);
});

describe("POST /api/extension/notices", () => {
  it("anahtarsız ya da bilinmeyen anahtar 401", async () => {
    expect((await noticesRoute.POST(post(BODY, null))).status).toBe(401);
    expect((await noticesRoute.POST(post(BODY, `acx_${"b".repeat(43)}`))).status).toBe(401);
    expect(q.saveNotices).not.toHaveBeenCalled();
  });

  it("bozuk liste 400: VKN biçimi, kimliksiz tebligat, sınır üstü liste, kurumsuz satır", async () => {
    for (const bad of [
      { ...BODY, idNumbers: ["12345"] }, { ...BODY, idNumbers: [] }, { ...BODY, idNumbers: ["1234567890", "12345678901", "1111111111"] },
      { ...BODY, notices: [{ ...NOTICE, gibId: "x'; drop" }] }, { ...BODY, notices: [{ ...NOTICE, institution: " " }] },
      { ...BODY, notices: Array.from({ length: 2001 }, (_, i) => ({ ...NOTICE, gibId: String(i) })) }, "x",
    ]) expect((await noticesRoute.POST(post(bad))).status).toBe(400);
    expect(q.saveNotices).not.toHaveBeenCalled();
  });

  it("uzun metinler kısaltılır, boş alanlar null olur; anahtar sahibinin adına kaydedilir", async () => {
    vi.mocked(q.saveNotices).mockResolvedValueOnce({ firm: { id: "f1", name: "ÖRNEK LTD" }, fresh: 1, total: 1 });
    const res = await noticesRoute.POST(post({ ...BODY, notices: [{ ...NOTICE, docNo: "  ", subUnit: "A".repeat(300) }] }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ firm: "ÖRNEK LTD", fresh: 1, total: 1 });
    const [user, ids, saved] = vi.mocked(q.saveNotices).mock.calls[0];
    expect(user).toBe(USER);
    expect(ids).toEqual(["1234567890"]);
    expect(saved[0].docNo).toBeNull();
    expect(saved[0].subUnit).toHaveLength(160);
  });

  it("firması olmayan VKN 404 ve numarayı söyler", async () => {
    vi.mocked(q.saveNotices).mockResolvedValueOnce(null);
    const res = await noticesRoute.POST(post(BODY));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toContain("1234567890");
  });

  it("boş liste de kaydedilir (son tarama yazılır)", async () => {
    vi.mocked(q.saveNotices).mockResolvedValueOnce({ firm: { id: "f1", name: "ÖRNEK LTD" }, fresh: 0, total: 0 });
    expect((await noticesRoute.POST(post({ ...BODY, notices: [] }))).status).toBe(200);
  });
});

describe("POST /api/notices/seen", () => {
  const seen = (body: unknown) => new Request("http://test", { method: "POST", body: JSON.stringify(body) });
  it("oturumsuz 401", async () => {
    vi.mocked(session.getUserId).mockResolvedValueOnce(null);
    expect((await seenRoute.POST(seen({ ids: null }))).status).toBe(401);
    expect(q.markNoticesSeen).not.toHaveBeenCalled();
  });
  it("hepsi (null) ya da seçilenler; uuid olmayan id 400", async () => {
    vi.mocked(q.markNoticesSeen).mockResolvedValue(2);
    expect(await (await seenRoute.POST(seen({ ids: null }))).json()).toEqual({ seen: 2 });
    expect(q.markNoticesSeen).toHaveBeenCalledWith(USER, null);
    expect((await seenRoute.POST(seen({ ids: ["1"] }))).status).toBe(400);
    expect((await seenRoute.POST(seen({}))).status).toBe(400);
  });
});
