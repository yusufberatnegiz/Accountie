import { randomBytes } from "node:crypto";
import { deflateRawSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RULES } from "@/lib/default-rules";
import { invoiceXml } from "@/lib/efatura.test";
import { open, seal, secretContext } from "@/lib/gib/secret";

vi.mock("@/lib/auth/session", () => ({
  getUserId: vi.fn(), getSessionUser: vi.fn(), signedInWithin: vi.fn(), RECENT_SIGN_IN_MS: 1, SIGN_IN_AGAIN: "yeniden giriş",
}));
vi.mock("@/db/queries", () => ({
  createReceipt: vi.fn(), getRules: vi.fn(), getVendorRule: vi.fn(), hasDuplicateReceipt: vi.fn(),
  getGibCredential: vi.fn(), saveGibCredential: vi.fn(), deleteGibCredential: vi.fn(), touchGibCredential: vi.fn(),
}));
vi.mock("@/lib/firm", () => ({ activeFirm: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ allow: vi.fn(), under: vi.fn() }));

const session = await import("@/lib/auth/session");
const q = await import("@/db/queries");
const { activeFirm } = await import("@/lib/firm");
const { allow, under } = await import("@/lib/rate-limit");
const credentials = await import("./credentials/route");
const earsiv = await import("./earsiv/route");

const KEY = randomBytes(32);
const FIRM = { id: "00000000-0000-4000-8000-000000000001", name: "ÖRNEK FİRMA", taxNumber: "1111111114" };
const ETTN = "6115993e-3e77-473c-8ea5-c24036b4106c";
const json = (body: unknown, method = "POST") => new Request("http://test", { method, body: JSON.stringify(body), headers: { "content-type": "application/json" } });

function zipOf(name: string, data: Buffer): Buffer {
  const body = deflateRawSync(data), n = Buffer.from(name);
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(n.length, 26);
  const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(8, 10); cd.writeUInt32LE(body.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(n.length, 28);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(46 + n.length, 12); end.writeUInt32LE(30 + n.length + body.length, 16);
  return Buffer.concat([local, n, body, cd, n, end]);
}

/** A fake GİB portal: records every call, answers by command. */
function portal({ loginOk = true } = {}) {
  const calls: { url: string; form: URLSearchParams | null }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    const form = init.body instanceof URLSearchParams ? init.body : null;
    calls.push({ url, form });
    const ok = (body: unknown) => new Response(typeof body === "string" || body instanceof Uint8Array ? body as BodyInit : JSON.stringify(body), { status: 200 });
    if (url.endsWith("/assos-login") && form?.get("assoscmd") === "logout") return ok({ data: "ok" });
    if (url.endsWith("/assos-login")) return ok(loginOk ? { token: "tok_1234567890abcdef" } : { error: "1", messages: [{ text: "Kullanıcı adı veya şifre hatalı" }] });
    if (url.endsWith("/dispatch")) return ok({ data: [{ ettn: ETTN, belgeNumarasi: "ABC2026000000412" }, { ettn: "not-a-uuid" }] });
    if (url.includes("/download?")) return ok(new Uint8Array(zipOf("f.xml", Buffer.from(invoiceXml()))));
    return new Response("", { status: 404 });
  }));
  return calls;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GIB_SECRET_KEY = KEY.toString("base64");
  vi.mocked(session.getUserId).mockResolvedValue("user-a");
  vi.mocked(session.getSessionUser).mockResolvedValue({ id: "user-a", email: "a@ornek.com", createdAt: new Date("2026-01-01") });
  vi.mocked(session.signedInWithin).mockResolvedValue(true);
  vi.mocked(allow).mockResolvedValue(true);
  vi.mocked(under).mockResolvedValue(true);
  vi.mocked(activeFirm).mockResolvedValue({ firms: [FIRM], firm: FIRM });
  vi.mocked(q.getRules).mockResolvedValue({ rules: DEFAULT_RULES, rows: [] });
  vi.mocked(q.getVendorRule).mockResolvedValue(null);
  vi.mocked(q.hasDuplicateReceipt).mockResolvedValue(false);
  vi.mocked(q.createReceipt).mockResolvedValue("r1");
  vi.mocked(q.getGibCredential).mockResolvedValue({
    usernameSealed: seal(KEY, "12345678", secretContext("user-a", FIRM.id, "kullanici")),
    passwordSealed: seal(KEY, "Gizli-Şifre1", secretContext("user-a", FIRM.id, "sifre")), lastUsedAt: null,
  });
});
afterEach(() => { vi.unstubAllGlobals(); delete process.env.GIB_SECRET_KEY; });

describe("PUT /api/gib/credentials", () => {
  it("oturumsuz 401, anahtar yoksa 503, bozuk girdi 400; GİB'e hiç gidilmez", async () => {
    const calls = portal();
    vi.mocked(session.getSessionUser).mockResolvedValueOnce(null);
    expect((await credentials.PUT(json({ kullaniciKodu: "12345678", sifre: "x" }, "PUT"))).status).toBe(401);
    vi.mocked(session.signedInWithin).mockResolvedValueOnce(false); // an old session cookie is not enough
    expect((await credentials.PUT(json({ kullaniciKodu: "12345678", sifre: "x" }, "PUT"))).status).toBe(403);
    delete process.env.GIB_SECRET_KEY;
    expect((await credentials.PUT(json({ kullaniciKodu: "12345678", sifre: "x" }, "PUT"))).status).toBe(503);
    process.env.GIB_SECRET_KEY = KEY.toString("base64");
    expect((await credentials.PUT(json({ kullaniciKodu: "12/34", sifre: "x" }, "PUT"))).status).toBe(400);
    expect((await credentials.PUT(json({ kullaniciKodu: "12345678", sifre: "a\nb" }, "PUT"))).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("GİB kabul etmezse saklamaz (422) ve yalnız başarısızlık ortak koda yazılır", async () => {
    portal({ loginOk: false });
    expect((await credentials.PUT(json({ kullaniciKodu: "12345678", sifre: "yanlis" }, "PUT"))).status).toBe(422);
    expect(q.saveGibCredential).not.toHaveBeenCalled();
    expect(vi.mocked(allow).mock.calls).toContainEqual(["gibCodeFail", "12345678"]);
  });

  it("GİB kabul edince mühürlü saklar, oturumu kapatır, şifreyi geri göndermez", async () => {
    const calls = portal();
    const res = await credentials.PUT(json({ kullaniciKodu: "12345678", sifre: "Gizli-Şifre1" }, "PUT"));
    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).not.toContain("Gizli");
    const [user, firm, u, p] = vi.mocked(q.saveGibCredential).mock.calls[0];
    expect([user, firm]).toEqual(["user-a", FIRM.id]);
    expect(p).not.toContain("Gizli");
    expect(open(KEY, p, secretContext("user-a", FIRM.id, "sifre"))).toBe("Gizli-Şifre1");
    expect(open(KEY, u, secretContext("user-a", FIRM.id, "kullanici"))).toBe("12345678");
    expect(calls.map((c) => c.form?.get("assoscmd"))).toEqual(["anologin", "logout"]);
    expect(vi.mocked(allow).mock.calls.map(([kind]) => kind)).not.toContain("gibCodeFail");
    expect(vi.mocked(allow).mock.calls).toContainEqual(["gibCodeTry", "12345678"]); // counted atomically before GİB is called
    expect(calls.every((c) => c.url.startsWith("https://earsivportal.efatura.gov.tr/earsiv-services/"))).toBe(true);
  });

  it("bir kod için ortak başarısızlık kovası doluysa kimse GİB'e gidemez; başarılı kayıt kovayı doldurmaz; firması VKN'siz ya da başkasınınsa GİB'e gitmez", async () => {
    const calls = portal();
    vi.mocked(under).mockResolvedValueOnce(false);
    expect((await credentials.PUT(json({ kullaniciKodu: "12345678", sifre: "x" }, "PUT"))).status).toBe(429);
    expect(vi.mocked(under).mock.calls).toContainEqual(["gibCodeFail", "12345678"]);
    vi.mocked(activeFirm).mockResolvedValueOnce({ firms: [FIRM], firm: { ...FIRM, taxNumber: null } });
    expect((await credentials.PUT(json({ kullaniciKodu: "12345678", sifre: "x" }, "PUT"))).status).toBe(422);
    expect((await credentials.PUT(json({ firma: "00000000-0000-4000-8000-000000000009", kullaniciKodu: "12345678", sifre: "x" }, "PUT"))).status).toBe(404);
    expect(calls).toHaveLength(0);
  });

  it("deneme sınırında GİB'e gitmez (kilitlenme olmasın)", async () => {
    const calls = portal();
    vi.mocked(allow).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await credentials.PUT(json({ kullaniciKodu: "12345678", sifre: "x" }, "PUT"))).status).toBe(429);
    expect(calls).toHaveLength(0);
  });
});

describe("GİB giriş reddinin sınıflandırılması", () => {
  it("yalnız şifre/kullanıcı hatası 'auth', kilit 'locked'; bakım, doğrulama kodu ve bilinmeyen ret 'refused' (kayıt korunur)", async () => {
    const { loginRefusal } = await import("@/lib/gib/earsiv");
    const kind = (text: string) => loginRefusal({ error: "1", messages: [{ type: "4", text }] }).kind;
    expect(kind("Kullanıcı adı veya şifre hatalı")).toBe("auth");
    expect(kind("Hesabınız kilitlenmiştir")).toBe("locked");
    expect(kind("Şifre hatalı")).toBe("auth");
    expect(kind("Hatalı kullanıcı adı veya şifre")).toBe("auth");
    expect(kind("Kullanıcı kodu veya şifre hatalı. Doğrulama kodunu giriniz")).toBe("auth");
    expect(kind("Sistem bakımda, lütfen daha sonra deneyiniz")).toBe("refused");
    expect(kind("Güvenlik kodu hatalı")).toBe("refused");
    expect(kind("Geçersiz oturum")).toBe("refused"); // not a password message: the stored login is kept
    expect(loginRefusal({}).kind).toBe("refused");
  });
});

describe("POST /api/gib/earsiv", () => {
  it("ayın adıma düzenlenen faturalarını çeker, taslak yapar, oturumu kapatır", async () => {
    const calls = portal();
    const res = await earsiv.POST(json({ ay: "2026-09", firma: FIRM.id }));
    expect(res.status).toBe(201);
    expect((await res.json()).created).toBe(1);
    expect(q.createReceipt).toHaveBeenCalledTimes(1);
    const list = calls.find((c) => c.url.endsWith("/dispatch"))!;
    expect(list.form?.get("cmd")).toBe("EARSIV_PORTAL_ADIMA_KESILEN_BELGELERI_GETIR");
    expect(JSON.parse(list.form!.get("jp")!)).toMatchObject({ baslangic: "01/09/2026", bitis: "30/09/2026" });
    expect(calls.filter((c) => c.url.includes("/download?"))).toHaveLength(1); // the malformed ETTN is never requested
    expect(calls.at(-1)?.form?.get("assoscmd")).toBe("logout");
    expect(q.touchGibCredential).toHaveBeenCalledWith("user-a", FIRM.id);
  });

  it("eski oturumla çekilmez (403); ağ hatası sayılmaz, GİB'in her reddi sayılır ve günün ikinci reddi bağlantıyı siler", async () => {
    const calls = portal();
    vi.mocked(session.signedInWithin).mockResolvedValueOnce(false);
    expect((await earsiv.POST(json({ ay: "2026-09" }))).status).toBe(403);
    expect(calls).toHaveLength(0);
    // No readable answer (an HTML page): nothing counted, nothing deleted.
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>bakım</html>", { status: 200 })));
    expect((await earsiv.POST(json({ ay: "2026-09" }))).status).toBe(502);
    expect(q.deleteGibCredential).not.toHaveBeenCalled();
    // A refusal GİB worded otherwise (maintenance) counts; the second one in a day removes the login.
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "1", messages: [{ text: "Sistem bakımda" }] }), { status: 200 })));
    vi.mocked(allow).mockImplementation(async (kind) => kind !== "gibPullFail");
    expect((await earsiv.POST(json({ ay: "2026-09" }))).status).toBe(422);
    expect(q.deleteGibCredential).toHaveBeenCalledWith("user-a", FIRM.id);
  });

  it("GİB kayıtlı şifreyi reddederse bağlantıyı siler ve tekrar denemez", async () => {
    const calls = portal({ loginOk: false });
    expect((await earsiv.POST(json({ ay: "2026-09" }))).status).toBe(422);
    expect(q.deleteGibCredential).toHaveBeenCalledWith("user-a", FIRM.id);
    expect(calls).toHaveLength(1);
  });

  it("bağlantı yoksa 404, firmanın VKN'si yoksa 422, gelecek ay 400; başka anahtarla açılmazsa korur (503), bozuksa siler (409)", async () => {
    const calls = portal();
    vi.mocked(q.getGibCredential).mockResolvedValueOnce(null);
    expect((await earsiv.POST(json({ ay: "2026-09" }))).status).toBe(404);
    vi.mocked(activeFirm).mockResolvedValueOnce({ firms: [FIRM], firm: { ...FIRM, taxNumber: null } });
    expect((await earsiv.POST(json({ ay: "2026-09" }))).status).toBe(422);
    expect((await earsiv.POST(json({ ay: "2099-01" }))).status).toBe(400);
    process.env.GIB_SECRET_KEY = randomBytes(32).toString("base64");
    expect((await earsiv.POST(json({ ay: "2026-09" }))).status).toBe(503);
    expect(q.deleteGibCredential).not.toHaveBeenCalled();
    process.env.GIB_SECRET_KEY = KEY.toString("base64");
    vi.mocked(q.getGibCredential).mockResolvedValueOnce({ usernameSealed: "v2.bozuk", passwordSealed: "v2.bozuk", lastUsedAt: null });
    expect((await earsiv.POST(json({ ay: "2026-09" }))).status).toBe(409);
    expect(q.deleteGibCredential).toHaveBeenCalledWith("user-a", FIRM.id);
    expect(calls.filter((c) => c.form?.get("assoscmd") === "anologin")).toHaveLength(0);
  });
});
