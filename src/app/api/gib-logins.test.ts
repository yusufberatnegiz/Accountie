import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashToken, legacyHash } from "@/lib/auth/extension-token";
import { DEV_EXTENSION_ID, STORE_EXTENSION_ID } from "@/lib/extension-id";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/session", () => ({ getUserId: vi.fn(), signedInWithin: vi.fn(), FRESH_SIGN_IN_MS: 1800000, SIGN_IN_AGAIN: "yeniden giriş" }));
vi.mock("@/lib/rate-limit", () => ({ allow: vi.fn(async () => true), clientIp: () => "203.0.113.7", ipBucket: (ip: string) => ip }));
vi.mock("@/db/queries", () => ({
  userIdForTokenHash: vi.fn(), firmsByLucaId: vi.fn(), saveGibLogins: vi.fn(), listGibLoginFirms: vi.fn(), gibScanUntil: vi.fn(),
  takeGibLogin: vi.fn(), deleteGibLoginsFor: vi.fn(async () => 2), gibScanGrant: vi.fn(), setGibScanGrant: vi.fn(), endGibScan: vi.fn(), liveTokenHashes: vi.fn(async () => [hashToken(`acx_${"a".repeat(43)}`)]), deleteGibLogins: vi.fn(), accountEmail: vi.fn(async () => "a@example.com"),
}));

const q = await import("@/db/queries");
const session = await import("@/lib/auth/session");
const limits = await import("@/lib/rate-limit");
const { grantText, mac, open, seal, secretContext } = await import("@/lib/gib/secret");
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
/** The approval as the site would store it: this network (the test's 203.0.113.7), sealed with the server's key. */
const grantFor = (until = later(), ip = "203.0.113.7", tokenHash = hashToken(TOKEN)) => {
  const network = mac(KEY, "network", ip);
  const grantedAt = new Date(Date.now() - 60_000);
  return { until, grantedAt, network, tokenHash, mac: mac(KEY, "grant", grantText({ userId: USER, grantedAt, until, network, tokenHash })) };
};

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
    expect(body).toEqual({ account: "a@example.com", firms: [{ lucaId: "7", name: "ÖRNEK", taxNumber: "1234567890" }], scanUntil: null, enabled: true });
  });
});

describe("POST /api/extension/gib-logins/read (taramada tek firmanın girişi)", () => {
  const stored = () => ({ firmId: "firm-7", usernameSealed: seal(KEY, "12345678", secretContext(USER, "firm-7", "kullanici")), passwordSealed: seal(KEY, PASS, secretContext(USER, "firm-7", "sifre")) });

  it("onay yoksa, bitmişse, veritabanına elle yazılmışsa ya da başka ağdan verilmişse hiçbir giriş açılmaz", async () => {
    vi.mocked(q.gibScanGrant).mockResolvedValue(null);
    expect((await read.POST(req("POST", { lucaId: "7" }))).status).toBe(403);
    vi.mocked(q.gibScanGrant).mockResolvedValue(grantFor(new Date(Date.now() - 1)));
    expect((await read.POST(req("POST", { lucaId: "7" }))).status).toBe(403);
    // A row written straight into the database: no valid MAC without the server's key.
    vi.mocked(q.gibScanGrant).mockResolvedValue({ ...grantFor(), mac: "forged" });
    expect((await read.POST(req("POST", { lucaId: "7" }))).status).toBe(403);
    // Its end time moved later in the database: the MAC no longer fits.
    vi.mocked(q.gibScanGrant).mockResolvedValue({ ...grantFor(), until: new Date(Date.now() + 99 * 24 * 3600_000) });
    expect((await read.POST(req("POST", { lucaId: "7" }))).status).toBe(403);
    // Given from another network: the stolen key used elsewhere opens nothing.
    vi.mocked(q.gibScanGrant).mockResolvedValue(grantFor(later(), "198.51.100.9"));
    expect((await read.POST(req("POST", { lucaId: "7" }))).status).toBe(403);
    // Given for another key: a second key of this user (one added to the database) opens nothing with the user's approval.
    vi.mocked(q.gibScanGrant).mockResolvedValue(grantFor(later(), "203.0.113.7", hashToken(`acx_${"z".repeat(43)}`)));
    expect((await read.POST(req("POST", { lucaId: "7" }))).status).toBe(403);
    // Its start moved later in the database (to reset the per-firm count): the MAC no longer fits.
    vi.mocked(q.gibScanGrant).mockResolvedValue({ ...grantFor(), grantedAt: new Date() });
    expect((await read.POST(req("POST", { lucaId: "7" }))).status).toBe(403);
    expect(q.takeGibLogin).not.toHaveBeenCalled();
  });

  it("onay içinde tek firmanın girişini açar, okumayı kaydettirir, önbelleğe aldırmaz", async () => {
    const g = grantFor();
    vi.mocked(q.gibScanGrant).mockResolvedValue(g);
    vi.mocked(q.takeGibLogin).mockResolvedValue(stored());
    const res = await read.POST(req("POST", { lucaId: "7" }));
    expect(await res.json()).toEqual({ username: "12345678", password: PASS });
    expect(res.headers.get("cache-control")).toContain("no-store");
    // Logged with the keyed network hash (not a plain hash an IPv4 sweep reverses), counted per firm since the approval.
    expect(q.takeGibLogin).toHaveBeenCalledWith(USER, "7", g.network, g.grantedAt, 3);
    vi.mocked(q.takeGibLogin).mockResolvedValueOnce("spent");
    expect((await read.POST(req("POST", { lucaId: "7" }))).status).toBe(409);
  });

  it("hız sınırı, başka kullanıcının mührü ve olmayan firma", async () => {
    vi.mocked(q.gibScanGrant).mockResolvedValue(grantFor());
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
  const web = () => new Request("http://test", { method: "POST", headers: { "x-real-ip": "203.0.113.7" } });
  it("onay yeni girişle (30 dk), en çok 4 saat, bu ağa bağlı ve sunucu anahtarıyla mühürlü; bitirme ve silme yeni giriş istemez", async () => {
    vi.mocked(session.getUserId).mockResolvedValue(USER);
    vi.mocked(session.signedInWithin).mockResolvedValue(false);
    expect((await grant.POST(web())).status).toBe(403);
    expect(q.setGibScanGrant).not.toHaveBeenCalled();
    vi.mocked(session.signedInWithin).mockResolvedValue(true);
    const before = Date.now();
    expect((await grant.POST(web())).status).toBe(200);
    const [[userId, g]] = vi.mocked(q.setGibScanGrant).mock.calls;
    expect(userId).toBe(USER);
    expect(g.until.getTime() - before).toBeLessThanOrEqual(4 * 60 * 60_000 + 1000);
    expect(g.network).toBe(mac(KEY, "network", "203.0.113.7"));
    expect(g.tokenHash).toBe(hashToken(TOKEN));
    expect(g.mac).toBe(mac(KEY, "grant", grantText({ userId: USER, ...g })));
    // No paired key, or a second one added outside Accountie: nothing is approved.
    vi.mocked(q.liveTokenHashes).mockResolvedValueOnce([]);
    expect((await grant.POST(web())).status).toBe(409);
    vi.mocked(q.liveTokenHashes).mockResolvedValueOnce(["a", "b"]);
    expect((await grant.POST(web())).status).toBe(409);
    // A key still stored by its plain hash (or written into the database by hand) is never bound to an approval.
    vi.mocked(q.liveTokenHashes).mockResolvedValueOnce([legacyHash(TOKEN)]);
    expect((await grant.POST(web())).status).toBe(409);
    expect((await grant.DELETE(new Request("http://test/api/gib-scan", { method: "DELETE" }))).status).toBe(204);
    expect(q.endGibScan).toHaveBeenCalledWith(USER);
    vi.mocked(q.deleteGibLogins).mockResolvedValue(3);
    expect(await (await wipe.DELETE()).json()).toEqual({ deleted: 3 });
    vi.mocked(session.getUserId).mockResolvedValue(null);
    expect((await grant.POST(web())).status).toBe(401);
    expect((await wipe.DELETE()).status).toBe(401);
  });

  it("eklenti taramanın sonunda onayı kapatabilir", async () => {
    const end = await import("./extension/gib-scan/route");
    expect((await end.DELETE(req("DELETE"))).status).toBe(204);
    expect(q.endGibScan).toHaveBeenCalledWith(USER);
  });

  it.each([STORE_EXTENSION_ID, DEV_EXTENSION_ID])("%s ile başlatma için yeni web oturumu ve aynı hesabın anahtarı gerekir", async (extensionId) => {
    const endpoint = await import("./extension/gib-scan/route");
    const origin = `chrome-extension://${extensionId}`;
    const start = (source: string, token = TOKEN) => endpoint.POST(new Request("https://accountie.app/api/extension/gib-scan", {
      method: "POST", headers: { origin: source, authorization: `Bearer ${token}` },
    }));
    vi.mocked(session.getUserId).mockResolvedValue(null);
    expect((await start(origin)).status).toBe(401);
    vi.mocked(session.getUserId).mockResolvedValue(USER);
    vi.mocked(session.signedInWithin).mockResolvedValue(false);
    expect((await start(origin)).status).toBe(403);
    vi.mocked(session.signedInWithin).mockResolvedValue(true);
    expect((await start("https://other.example")).status).toBe(403);
    expect((await start("chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).status).toBe(403);
    expect((await start(origin, `acx_${"b".repeat(43)}`)).status).toBe(403);
    expect(q.setGibScanGrant).not.toHaveBeenCalled();
    expect((await start(origin)).status).toBe(200);
    expect(q.setGibScanGrant).toHaveBeenCalledOnce();
    expect(q.setGibScanGrant).toHaveBeenCalledWith(USER, expect.objectContaining({ tokenHash: hashToken(TOKEN) }));
  });

  it("sekme açılamazsa yalnız o isteğin oluşturduğu tarama erişimi kapatılır", async () => {
    vi.mocked(session.getUserId).mockResolvedValue(USER);
    const until = "2099-01-01T00:00:00.000Z";
    const req = new Request(`http://test/api/gib-scan?until=${encodeURIComponent(until)}`, { method: "DELETE" });
    expect((await grant.DELETE(req)).status).toBe(204);
    expect(q.endGibScan).toHaveBeenCalledWith(USER, new Date(until));
  });
});

describe("eklenti anahtarının özeti sunucu anahtarıyla", () => {
  it("anahtar h1: biçiminde saklanır; eski düz özetli anahtar yine giriş yapar ama hiç yeniden yazılmaz (onay alamaz)", async () => {
    const { extensionUserId } = await import("@/lib/auth/extension-token");
    expect(hashToken(TOKEN)).toMatch(/^h1:/);
    expect(hashToken(TOKEN)).not.toBe(legacyHash(TOKEN));
    vi.mocked(q.userIdForTokenHash).mockImplementation(async (h) => (h === legacyHash(TOKEN) ? USER : null));
    expect(await extensionUserId(req("GET"))).toBe(USER);
    expect(vi.mocked(q.userIdForTokenHash).mock.calls.map((c) => c[0])).toEqual([hashToken(TOKEN), legacyHash(TOKEN)]);
    expect(Object.keys(q)).not.toContain("upgradeTokenHash");
  });
});

describe("DELETE /api/extension/gib-logins (bu yıl dönemi olmayan firmalar)", () => {
  it("yalnız bu kullanıcının verilen Luca firmalarının girişlerini siler; kötü listeyi almaz", async () => {
    expect(await (await store.DELETE(req("DELETE", { lucaIds: ["7", "8"] }))).json()).toEqual({ deleted: 2 });
    expect(q.deleteGibLoginsFor).toHaveBeenCalledWith(USER, ["7", "8"]);
    expect((await store.DELETE(req("DELETE", { lucaIds: ["x;drop"] }))).status).toBe(400);
    expect((await store.DELETE(req("DELETE", { lucaIds: [] }, `acx_${"b".repeat(43)}`))).status).toBe(401);
  });
});

