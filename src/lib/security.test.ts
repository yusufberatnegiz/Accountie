import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/queries", () => ({ hitRateLimit: vi.fn() }));
// Supabase Auth as the server actions see it (getAuth() resolves to the auth client).
type Reply = (...args: unknown[]) => Promise<{ data?: unknown; error: null | { status: number } }>;
const A = vi.hoisted(() => ({
  signInWithPassword: vi.fn(async () => ({ error: null })),
  signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
  resetPasswordForEmail: vi.fn(async () => ({ error: null })),
  updateUser: vi.fn(async () => ({ error: null })),
  signOut: vi.fn(async () => ({ error: null })),
  exchangeCodeForSession: vi.fn(async () => ({ error: null })),
}));
vi.mock("@/lib/auth/server", () => ({ getAuth: async () => A }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1", origin: "https://accountie.test" }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT ${url}`); } }));

const { hitRateLimit } = await import("@/db/queries");
const { sniffImageType } = await import("./image");
const { clientIp, ipBucket, LIMITS } = await import("./rate-limit");
const actions = await import("@/app/giris/actions");
const callback = await import("@/app/auth/callback/route");

const bytes = (...b: (number | string)[]) => Uint8Array.from(b.flatMap((x) => typeof x === "string" ? [...x].map((c) => c.charCodeAt(0)) : [x]));
const form = (fields: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(fields)) f.set(k, v); return f; };
// A failed attempt returns { error } to the form; success and the signup notice redirect (thrown by the mock).
const redirectOf = (p: Promise<unknown>) => p.then(
  (r) => (r && typeof r === "object" && "error" in r ? `hata=${(r as { error: string }).error}` : "none"),
  (e: Error) => decodeURIComponent(e.message.replaceAll("+", " ")),
);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hitRateLimit).mockResolvedValue(true);
});

describe("dosya imzası", () => {
  it("JPEG, PNG, WebP ve HEIC imzalarını tanır", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe1))).toBe("image/jpeg");
    expect(sniffImageType(bytes(0x89, "PNG\r\n\x1a\n"))).toBe("image/png");
    expect(sniffImageType(bytes("RIFF", 0, 0, 0, 0, "WEBP"))).toBe("image/webp");
    expect(sniffImageType(bytes(0, 0, 0, 24, "ftypheic"))).toBe("image/heic");
  });
  it("SVG, GIF, PDF ve boş dosyayı reddeder", () => {
    for (const b of [bytes("<svg>"), bytes("GIF89a"), bytes("%PDF-1.7"), bytes()]) expect(sniffImageType(b)).toBeNull();
  });
});

describe("oran sınırı", () => {
  it("istemci IP'si ilk x-forwarded-for değeridir, x-real-ip önceliklidir", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe("203.0.113.9");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.1", "x-forwarded-for": "1.1.1.1" }))).toBe("198.51.100.1");
  });

  it("IPv6 adresleri /64 önekiyle sınırlanır, IPv4 olduğu gibi kalır", () => {
    expect(ipBucket("2001:db8:1:2:aaaa::1")).toBe("2001:db8:1:2::/64");
    expect(ipBucket("2001:0db8:0001:0002:ffff:ffff:ffff:ffff")).toBe("2001:db8:1:2::/64");
    expect(ipBucket("2001:db8::5")).toBe("2001:db8:0:0::/64");
    expect(ipBucket("::1")).toBe("0:0:0:0::/64");
    expect(ipBucket("::ffff:203.0.113.9")).toBe("203.0.113.9");
    expect(ipBucket("203.0.113.9")).toBe("203.0.113.9");
  });

  it("anahtar e-posta veya IP'yi açık metin içermez", async () => {
    await expect(redirectOf(actions.login(undefined, form({ email: "muhasebe@ornek.com", password: "12345678" })))).resolves.toBe("REDIRECT /panel");
    const keys = vi.mocked(hitRateLimit).mock.calls.map(([k]) => k);
    expect(keys).toHaveLength(2); // Turnstile yokken de IP ve e-posta sınırı
    for (const k of keys) expect(k).not.toMatch(/muhasebe|ornek|203\.0/);
  });

  it("tek bir IP, e-posta başına giriş sınırını dolduramaz (hesap kilitleme)", () => {
    const [[ipLimit, ipWindow]] = LIMITS.loginIp;
    const [[emailLimit, emailWindow]] = LIMITS.loginEmail;
    const maxFromOneIp = ipLimit * Math.ceil(emailWindow / ipWindow);
    expect(emailLimit).toBeGreaterThan(maxFromOneIp);
  });

  it("sınır aşılınca giriş denenmez", async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(false);
    expect(await redirectOf(actions.login(undefined, form({ email: "a@ornek.com", password: "12345678" })))).toContain("hata=cok-deneme");
    expect(A.signInWithPassword).not.toHaveBeenCalled();
  });

  it("sınır aşılınca kayıt denenmez", async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(false);
    const res = await redirectOf(actions.signup(undefined, form({ name: "Ali Veli", email: "a@ornek.com", password: "12345678" })));
    expect(res).toContain("hata=kayit-cok");
    expect(A.signUp).not.toHaveBeenCalled();
  });

});

describe("giriş ve kayıt formu", () => {
  it("hatalı giriş e-postayı geri verir, şifreyi hiç döndürmez", async () => {
    vi.mocked(A.signInWithPassword as unknown as Reply).mockResolvedValueOnce({ error: { message: "x" } } as never);
    const state = await actions.login(undefined, form({ email: "a@ornek.com", password: "gizli-sifre-123" }));
    expect(state).toEqual({ error: "kimlik", field: "password", email: "a@ornek.com", name: undefined });
    expect(JSON.stringify(state)).not.toContain("gizli-sifre-123");
  });

  it("biçim hatası ilgili alanı adlandırır", async () => {
    expect(await actions.login(undefined, form({ email: "yok", password: "12345678" }))).toMatchObject({ error: "bicim-eposta", field: "email" });
    expect(await actions.signup(undefined, form({ name: "A", email: "a@ornek.com", password: "12345678" }))).toMatchObject({ error: "bicim-ad", field: "name" });
    expect(await actions.signup(undefined, form({ name: "Ali Veli", email: "a@ornek.com", password: "kisa" }))).toMatchObject({ error: "bicim-sifre", field: "password" });
    // Every invalid field comes back at once; focus goes to the first.
    expect(await actions.signup(undefined, form({ name: "", email: "abc", password: "" }))).toMatchObject({ field: "name", fields: ["name", "email", "password"] });
    expect(A.signUp).not.toHaveBeenCalled();
  });
});

describe("giriş sonrası dönüş", () => {
  it("geçerli panel yoluna döner, başka her şeyde /panel'e gider", async () => {
    const go = (sonra: string) => redirectOf(actions.login(undefined, form({ email: "a@ornek.com", password: "12345678", sonra })));
    expect(await go("/panel/fis/abc-1")).toBe("REDIRECT /panel/fis/abc-1");
    for (const bad of ["//evil.example", "https://evil.example/panel", "/panel/../giris", "/"]) expect(await go(bad), bad).toBe("REDIRECT /panel");
  });
  it("e-posta doğrulaması açıkken kayıt, doğrulanmış panel yolunu girişe taşır", async () => {
    const signup = (sonra: string) => redirectOf(actions.signup(undefined, form({ name: "Ali Veli", email: "a@ornek.com", password: "12345678", sonra })));
    expect(await signup("/panel/fis/abc-1")).toBe("REDIRECT /giris?mesaj=kayit-tamam&sonra=/panel/fis/abc-1");
    expect(await signup("//evil.example")).toBe("REDIRECT /giris?mesaj=kayit-tamam");
  });
});

describe("şifre yenileme", () => {
  it("hesap olsun olmasın aynı yanıtı verir ve bağlantıyı bu siteye döndürür", async () => {
    expect(await actions.requestReset(undefined, form({ email: "a@ornek.com" }))).toEqual({ sent: true, email: "a@ornek.com" });
    expect(A.resetPasswordForEmail).toHaveBeenCalledWith("a@ornek.com", { redirectTo: "https://accountie.test/auth/callback?tur=sifre" });
    vi.mocked(A.resetPasswordForEmail as unknown as Reply).mockResolvedValueOnce({ error: { status: 400 } });
    expect(await actions.requestReset(undefined, form({ email: "yok@ornek.com" }))).toEqual({ sent: true, email: "yok@ornek.com" });
  });

  it("biçim, bot ve sınır kontrolleri istekten önce", async () => {
    expect(await actions.requestReset(undefined, form({ email: "yok" }))).toMatchObject({ error: "bicim-eposta", field: "email" });
    vi.mocked(hitRateLimit).mockResolvedValue(false);
    expect(await actions.requestReset(undefined, form({ email: "a@ornek.com" }))).toMatchObject({ error: "sifre-cok" });
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    expect(await actions.requestReset(undefined, form({ email: "a@ornek.com" }))).toMatchObject({ error: "bot" });
    vi.unstubAllEnvs();
    expect(A.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("geçersiz bağlantı ve kısa şifre yeni şifreyi kaydetmez; başarıda kurtarma oturumu kapanır", async () => {
    expect(await actions.resetPassword(undefined, form({ password: "kisa" }))).toEqual({ error: "bicim-sifre", field: "password" });
    expect(A.updateUser).not.toHaveBeenCalled();
    // No recovery session (an expired or foreign link): Supabase refuses the update.
    vi.mocked(A.updateUser as unknown as Reply).mockResolvedValueOnce({ error: { status: 401 } });
    expect(await actions.resetPassword(undefined, form({ password: "12345678" }))).toEqual({ error: "sifre-baglanti" });
    await expect(redirectOf(actions.resetPassword(undefined, form({ password: "12345678" })))).resolves.toBe("REDIRECT /giris?mesaj=sifre-yeni");
    expect(A.updateUser).toHaveBeenLastCalledWith({ password: "12345678" });
    expect(A.signOut).toHaveBeenCalled();
  });
});

describe("bot koruması", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("Turnstile açıkken token olmadan giriş ve kayıt denenmez", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    expect(await redirectOf(actions.login(undefined, form({ email: "a@ornek.com", password: "12345678" })))).toContain("hata=bot");
    expect(A.signInWithPassword).not.toHaveBeenCalled();
    expect(hitRateLimit).not.toHaveBeenCalled(); // Turnstile'sız deneme kurbanın e-posta limitini dolduramaz
    const res = await redirectOf(actions.signup(undefined, form({ name: "Ali Veli", email: "a@ornek.com", password: "12345678" })));
    expect(res).toContain("hata=bot");
    expect(A.signUp).not.toHaveBeenCalled();
  });

  it("e-posta başına sınır Turnstile olsa da olmasa da uygulanır", async () => {
    const kinds = () => vi.mocked(hitRateLimit).mock.calls.map(([k]) => k.split(":")[0]);
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("VERCEL_ENV", "production");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await redirectOf(actions.login(undefined, form({ email: "kurban@ornek.com", password: "yanlis-sifre" })));
    expect(kinds()).toEqual(["loginIp", "loginEmail"]);
    warn.mockRestore();

    vi.clearAllMocks();
    vi.mocked(hitRateLimit).mockResolvedValue(true);
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true })));
    await redirectOf(actions.login(undefined, form({ email: "kurban@ornek.com", password: "yanlis-sifre", "cf-turnstile-response": "tok" })));
    expect(kinds()).toEqual(["loginIp", "loginEmail"]);
    vi.unstubAllGlobals();
  });
});

describe("yapılandırma", () => {
  it("güvenlik başlıkları her yanıtta", async () => {
    const config = (await import("../../next.config")).default;
    const [cspRule, rule] = await config.headers!();
    const h = Object.fromEntries(rule.headers.map((x) => [x.key, x.value]));
    expect(rule.source).toBe("/:path*");
    // Every path but the panel and the auth pages; their nonce CSP comes from proxy.ts (proxy.test.ts).
    const outsidePanel = new RegExp(`^${cspRule.source}$`);
    for (const path of ["/", "/gizlilik", "/api/receipts", "/panelx", "/girisx", "/gorseller/a.jpg"]) expect(outsidePanel.test(path), path).toBe(true);
    for (const path of ["/panel", "/panel/", "/panel/fis/abc", "/giris", "/giris/sifre/yeni", "/kayit"]) expect(outsidePanel.test(path), path).toBe(false);
    expect(cspRule.headers[0].value).toMatch(/default-src 'self'.*frame-ancestors 'none'.*object-src 'none'/);
    expect(h["Strict-Transport-Security"]).toContain("max-age=63072000");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Permissions-Policy"]).toContain("camera=(self)");
    expect(config.poweredByHeader).toBe(false);
  });

  it(".env.example yalnızca yer tutucu içerir ve NEXT_PUBLIC_ sır yok", () => {
    const env = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    expect(env).not.toMatch(/^NEXT_PUBLIC_/m);
    expect(env).not.toMatch(/sk-ant-api|npg_/);
    for (const line of env.split("\n").filter((l) => /^[A-Z_]+=/.test(l))) expect(line).toMatch(/ornek|yer-tutucu|kullanici:sifre|rastgele/);
  });
});

describe("e-posta bağlantısı dönüşü (/auth/callback)", () => {
  const go = async (query: string) => new URL((await callback.GET(new Request(`https://accountie.test/auth/callback${query}`))).headers.get("location")!);

  it("kodu oturuma çevirir, yalnız aynı sitenin panel yoluna ya da şifre sayfasına döner", async () => {
    expect((await go("?code=abc")).pathname).toBe("/panel");
    expect((await go("?code=abc&sonra=/panel/fis/abc-1")).pathname).toBe("/panel/fis/abc-1");
    for (const bad of ["//evil.example", "https://evil.example/panel", "/giris/../panel"]) {
      const to = await go(`?code=abc&sonra=${encodeURIComponent(bad)}`);
      expect(to.origin, bad).toBe("https://accountie.test");
      expect(to.pathname, bad).toBe("/panel");
    }
    expect((await go("?code=abc&tur=sifre")).pathname).toBe("/giris/sifre/yeni");
    expect(A.exchangeCodeForSession).toHaveBeenCalledWith("abc");
  });

  it("kodsuz ya da reddedilen bağlantıda oturum açmaz", async () => {
    expect((await go("")).search).toBe("?mesaj=baglanti");
    vi.mocked(A.exchangeCodeForSession as unknown as Reply).mockResolvedValueOnce({ error: { status: 400 } });
    const reset = await go("?code=eski&tur=sifre");
    expect(reset.pathname + reset.search).toBe("/giris/sifre/yeni?hata=1");
  });
});
