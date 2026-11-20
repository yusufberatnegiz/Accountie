import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashToken } from "@/lib/auth/extension-token";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ getUserId: vi.fn(), signedInWithin: vi.fn(), FRESH_SIGN_IN_MS: 1800000, SIGN_IN_AGAIN: "yeniden giriş" }));
vi.mock("@/lib/rate-limit", () => ({ allow: vi.fn(async () => true), clientIp: () => "203.0.113.7", ipBucket: (ip: string) => ip }));
vi.mock("@/db/queries", () => ({
  userIdForTokenHash: vi.fn(), firmsByLucaId: vi.fn(), saveGibLogins: vi.fn(), listGibLoginFirms: vi.fn(), gibScanUntil: vi.fn(),
  takeGibLogin: vi.fn(), setGibScanUntil: vi.fn(), deleteGibLogins: vi.fn(),
}));

const q = await import("@/db/queries");
const session = await import("@/lib/auth/session");
const limits = await import("@/lib/rate-limit");
const { open, seal, secretContext } = await import("@/lib/gib/secret");
const store = await import("./extension/gib-logins/route");
const read = await import("./extension/gib-logins/read/route");
const grant = await import("./gib-scan/route");
const wipe = await import("./gib-logins/route");

const USER = "user-a";
const TOKEN = `acx_${"a".repeat(43)}`;
const KEY = randomBytes(32);
const PASS = "Gizli-Şifre1";
const req = (method: string, body?: unknown, token = TOKEN) => new Request("http://test", { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const later = () => new Date(Date.now() + 60 * 60_000);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GIB_SECRET_KEY = KEY.toString("base64");
  vi.mocked(q.userIdForTokenHash).mockImplementation(async (h) => (h === hashToken(TOKEN) ? USER : null));
  vi.mocked(limits.allow).mockResolvedValue(true);
});

describe("PUT /api/extension/gib-logins (firma çekmede Luca'dan okunan girişler)", () => {
  it("yalnız kullanıcının firmalarına, kullanıcıya ve firmaya bağlı mühürle kaydeder; yanıt girişi geri vermez", async () => {
    vi.mocked(q.firmsByLucaId).mockResolvedValue(new Map([["7", "firm-7"]]));
    const res = await store.PUT(req("PUT", { logins: [{ lucaId: "7", username: "12345678", password: PASS }, { lucaId: "8", username: "999", password: "x" }, { lucaId: "bad", username: "1", password: "y" }] }));
    expect(await res.json()).toEqual({ saved: 1, skipped: 2 });
    expect(q.firmsByLucaId).toHaveBeenCalledWith(USER, ["7", "8"]);
    const [[userId, rows]] = vi.mocked(q.saveGibLogins).mock.calls;
    expect(userId).toBe(USER);
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(PASS);
    expect(JSON.stringify(rows)).not.toContain("12345678");
    expect(open(KEY, rows[0].passwordSealed, secretContext(USER, "firm-7", "sifre"))).toBe(PASS);
    expect(() => open(KEY, rows[0].passwordSealed, secretContext("user-b", "firm-7", "sifre"))).toThrow();
  });

  it("anahtarsız, geçersiz anahtarla, hız sınırında ya da sunucu anahtarı yokken kaydetmez", async () => {
    expect((await store.PUT(req("PUT", { logins: [] }, `acx_${"b".repeat(43)}`))).status).toBe(401);
    delete process.env.GIB_SECRET_KEY;
    expect((await store.PUT(req("PUT", { logins: [{ lucaId: "7", username: "1", password: "p" }] }))).status).toBe(503);
    process.env.GIB_SECRET_KEY = KEY.toString("base64");
    vi.mocked(limits.allow).mockResolvedValueOnce(false);
    expect((await store.PUT(req("PUT", { logins: [{ lucaId: "7", username: "1", password: "p" }] }))).status).toBe(429);
    expect(q.saveGibLogins).not.toHaveBeenCalled();
  });

  it("liste girişi değil, yalnız firma, VKN ve onay süresini verir", async () => {
    vi.mocked(q.listGibLoginFirms).mockResolvedValue([{ lucaId: "7", name: "ÖRNEK", taxNumber: "1234567890", updatedAt: new Date() }]);
    vi.mocked(q.gibScanUntil).mockResolvedValue(new Date(Date.now() - 1000));
    const body = await (await store.GET(req("GET"))).json();
    expect(body).toEqual({ firms: [{ lucaId: "7", name: "ÖRNEK", taxNumber: "1234567890" }], scanUntil: null, enabled: true });
  });
});

describe("POST /api/extension/gib-logins/read (taramada tek firmanın girişi)", () => {
  const stored = () => ({ firmId: "firm-7", usernameSealed: seal(KEY, "12345678", secretContext(USER, "firm-7", "kullanici")), passwordSealed: seal(KEY, PASS, secretContext(USER, "firm-7", "sifre")) });

  it("kullanıcının onayı yoksa ya da bitmişse hiçbir giriş açılmaz", async () => {
    vi.mocked(q.gibScanUntil).mockResolvedValue(null);
    expect((await read.POST(req("POST", { lucaId: "7" }))).status).toBe(403);
    vi.mocked(q.gibScanUntil).mockResolvedValue(new Date(Date.now() - 1));
    expect((await read.POST(req("POST", { lucaId: "7" }))).status).toBe(403);
    expect(q.takeGibLogin).not.toHaveBeenCalled();
  });

  it("onay içinde tek firmanın girişini açar, okumayı kaydettirir, önbelleğe aldırmaz", async () => {
    vi.mocked(q.gibScanUntil).mockResolvedValue(later());
    vi.mocked(q.takeGibLogin).mockResolvedValue(stored());
    const res = await read.POST(req("POST", { lucaId: "7" }));
    expect(await res.json()).toEqual({ username: "12345678", password: PASS });
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(q.takeGibLogin).toHaveBeenCalledWith(USER, "7", expect.stringMatching(/^[0-9a-f]{16}$/));
  });

  it("hız sınırı, başka kullanıcının mührü ve olmayan firma", async () => {
    vi.mocked(q.gibScanUntil).mockResolvedValue(later());
    vi.mocked(limits.allow).mockResolvedValueOnce(false);
    expect((await read.POST(req("POST", { lucaId: "7" }))).status).toBe(429);
    expect(q.takeGibLogin).not.toHaveBeenCalled();
    // A row sealed for another user does not open here.
    const other = { firmId: "firm-7", usernameSealed: seal(KEY, "1", secretContext("user-b", "firm-7", "kullanici")), passwordSealed: seal(KEY, PASS, secretContext("user-b", "firm-7", "sifre")) };
    vi.mocked(q.takeGibLogin).mockResolvedValueOnce(other);
    const res = await read.POST(req("POST", { lucaId: "7" }));
    expect(res.status).toBe(409);
    expect(JSON.stringify(await res.json())).not.toContain(PASS);
    vi.mocked(q.takeGibLogin).mockResolvedValueOnce(null);
    expect((await read.POST(req("POST", { lucaId: "7" }))).status).toBe(404);
    expect((await read.POST(req("POST", { lucaId: "x;drop" }))).status).toBe(400);
  });
});

describe("Accountie'den tarama onayı ve girişleri silme", () => {
  it("onay yeni girişle (30 dk) ve en çok 8 saat; silme ve onayı bitirme yeni giriş istemez", async () => {
    vi.mocked(session.getUserId).mockResolvedValue(USER);
    vi.mocked(session.signedInWithin).mockResolvedValue(false);
    expect((await grant.POST()).status).toBe(403);
    expect(q.setGibScanUntil).not.toHaveBeenCalled();
    vi.mocked(session.signedInWithin).mockResolvedValue(true);
    const before = Date.now();
    expect((await grant.POST()).status).toBe(200);
    const until = vi.mocked(q.setGibScanUntil).mock.calls[0][1] as Date;
    expect(until.getTime() - before).toBeLessThanOrEqual(8 * 60 * 60_000 + 1000);
    expect((await grant.DELETE()).status).toBe(204);
    expect((vi.mocked(q.setGibScanUntil).mock.calls[1][1] as Date).getTime()).toBe(0);
    vi.mocked(q.deleteGibLogins).mockResolvedValue(3);
    expect(await (await wipe.DELETE()).json()).toEqual({ deleted: 3 });
    vi.mocked(session.getUserId).mockResolvedValue(null);
    expect((await grant.POST()).status).toBe(401);
    expect((await wipe.DELETE()).status).toBe(401);
  });
});
