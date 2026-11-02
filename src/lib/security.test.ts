import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/queries", () => ({ hitRateLimit: vi.fn() }));
vi.mock("@/lib/auth/server", () => {
  const signIn = { email: vi.fn(async () => ({ error: null })) };
  const POST = vi.fn(async () => new Response("ok"));
  return { getAuth: () => ({ signIn, signUp: { email: vi.fn(async () => ({ error: null })) }, handler: () => ({ GET: vi.fn(), POST }) }) };
});
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT ${url}`); } }));

const { hitRateLimit } = await import("@/db/queries");
const { getAuth } = await import("@/lib/auth/server");
const { sniffImageType } = await import("./image");
const { clientIp } = await import("./rate-limit");
const actions = await import("@/app/giris/actions");
const authRoute = await import("@/app/api/auth/[...path]/route");

const bytes = (...b: (number | string)[]) => Uint8Array.from(b.flatMap((x) => typeof x === "string" ? [...x].map((c) => c.charCodeAt(0)) : [x]));
const form = (fields: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(fields)) f.set(k, v); return f; };
const redirectOf = (p: Promise<unknown>) => p.then(() => "none", (e: Error) => decodeURIComponent(e.message.replaceAll("+", " ")));

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

  it("anahtar e-posta veya IP'yi açık metin içermez", async () => {
    await expect(redirectOf(actions.login(form({ email: "muhasebe@ornek.com", password: "12345678" })))).resolves.toBe("REDIRECT /");
    const keys = vi.mocked(hitRateLimit).mock.calls.map(([k]) => k);
    expect(keys).toHaveLength(2);
    for (const k of keys) expect(k).not.toMatch(/muhasebe|ornek|203\.0/);
  });

  it("sınır aşılınca giriş denenmez", async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(false);
    expect(await redirectOf(actions.login(form({ email: "a@ornek.com", password: "12345678" })))).toContain("hata=cok-deneme");
    expect(getAuth().signIn.email).not.toHaveBeenCalled();
  });

  it("sınır aşılınca kayıt denenmez", async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(false);
    const res = await redirectOf(actions.signup(form({ name: "Ali Veli", email: "a@ornek.com", password: "12345678", passwordAgain: "12345678" })));
    expect(res).toContain("hata=kayit-cok");
    expect(getAuth().signUp.email).not.toHaveBeenCalled();
  });

  it("/api/auth giriş ve kayıt uçları da sınırlıdır, diğerleri değil", async () => {
    vi.mocked(hitRateLimit).mockResolvedValue(false);
    const post = (path: string) => authRoute.POST(new Request(`http://test/api/auth/${path}`, { method: "POST" }) as never, { params: Promise.resolve({ path: path.split("/") }) } as never);
    expect((await post("sign-in/email")).status).toBe(429);
    expect((await post("sign-up/email")).status).toBe(429);
    expect((await post("sign-out")).status).toBe(200);
  });
});

describe("yapılandırma", () => {
  it("güvenlik başlıkları her yanıtta", async () => {
    const config = (await import("../../next.config")).default;
    const [rule] = await config.headers!();
    const h = Object.fromEntries(rule.headers.map((x) => [x.key, x.value]));
    expect(rule.source).toBe("/:path*");
    expect(h["Content-Security-Policy"]).toMatch(/default-src 'self'.*frame-ancestors 'none'.*object-src 'none'/);
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
