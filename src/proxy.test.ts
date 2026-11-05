import { describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/server";
import proxy, { config } from "./proxy";

vi.mock("@/lib/auth/server", () => ({ getAuth: vi.fn() }));

const guarded = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("proxy matcher", () => {
  it("sends the panel through the session check", () => {
    for (const url of ["/panel", "/panel/", "/panel/fis/abc", "/panel/kurallar"]) {
      expect(guarded(url), url).toBe(true);
    }
  });

  // Matched for the nonce CSP only; the session check skips them ("proxy auth pages" below).
  it("sends the dynamic auth pages through for their nonce CSP", () => {
    for (const url of ["/giris", "/giris/sifre", "/giris/sifre/yeni", "/kayit"]) {
      expect(guarded(url), url).toBe(true);
    }
  });

  it("leaves the static public pages and assets open", () => {
    for (const url of ["/", "/gizlilik", "/gorseller/antalya-liman.jpg", "/manifest.webmanifest", "/robots.txt", "/sw.js", "/cevrimdisi.html", "/icon.svg", "/icon-192.png", "/icon-maskable-512.png", "/apple-touch-icon.png", "/favicon.ico", "/_next/static/x.js", "/onizleme/panel", "/auth/callback"]) {
      expect(guarded(url), url).toBe(false);
    }
  });

  // An unknown public address must reach not-found, not bounce to /giris; /fis/:id and /kurallar 308 to /panel first (next.config.ts).
  it("leaves unknown public addresses to the 404 page", () => {
    for (const url of ["/yok-boyle", "/panelx", "/panel-x", "/fis/abc", "/kurallar", "/girisx"]) {
      expect(guarded(url), url).toBe(false);
    }
  });

  // API routes come through only for the auth config check: each route handler checks the session itself (routes.test.ts).
  it("sends API routes through for the auth config check", () => {
    for (const url of ["/api/receipts", "/api/auth/get-session", "/api/extension/receipts"]) {
      expect(guarded(url), url).toBe(true);
    }
  });
});

describe("proxy login redirect", () => {
  const run = async (path: string, location = "http://localhost/giris") => {
    vi.mocked(getAuth).mockReturnValue({ middleware: () => async () => NextResponse.redirect(location) } as unknown as ReturnType<typeof getAuth>);
    const res = await proxy(new NextRequest(`http://localhost${path}`));
    return new URL(res.headers.get("location")!);
  };

  it("carries a panel deep link to /giris as ?sonra=", async () => {
    expect((await run("/panel/fis/abc-1")).searchParams.get("sonra")).toBe("/panel/fis/abc-1");
    expect((await run("/panel/kurallar")).searchParams.get("sonra")).toBe("/panel/kurallar");
  });

  it("adds nothing for the panel root, for other paths or for a login on another origin", async () => {
    expect((await run("/panel")).searchParams.has("sonra")).toBe(false);
    expect((await proxy(new NextRequest("http://localhost/fis/abc"))).headers.get("location")).toBeNull();
    expect((await run("/panel/fis/abc", "https://auth.example/giris")).searchParams.has("sonra")).toBe(false);
  });
});

describe("proxy auth pages", () => {
  it("give a nonce CSP without the session check", async () => {
    const middleware = vi.fn();
    vi.mocked(getAuth).mockReturnValue({ middleware } as unknown as ReturnType<typeof getAuth>);
    for (const path of ["/giris", "/giris/sifre/yeni?token=x", "/kayit"]) {
      const res = await proxy(new NextRequest(`http://localhost${path}`));
      expect(res.headers.get("location"), path).toBeNull();
      expect(res.headers.get("content-security-policy"), path).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
      // NextResponse.next({ request }) marks the forwarded CSP header, which is where Next reads the nonce from.
      expect(res.headers.get("x-middleware-request-content-security-policy"), path).toBe(res.headers.get("content-security-policy"));
    }
    expect(middleware).not.toHaveBeenCalled();
  });
});

describe("proxy panel CSP", () => {
  it("gives every panel request its own nonce, on the response and on the request Next renders", async () => {
    let seen: string | null = null;
    vi.mocked(getAuth).mockReturnValue({ middleware: () => async (req: NextRequest) => { seen = req.headers.get("content-security-policy"); return NextResponse.next(); } } as unknown as ReturnType<typeof getAuth>);
    const a = (await proxy(new NextRequest("http://localhost/panel"))).headers.get("content-security-policy")!;
    expect(seen).toBe(a);
    const b = (await proxy(new NextRequest("http://localhost/panel"))).headers.get("content-security-policy")!;
    const nonce = (csp: string) => csp.match(/'nonce-([^']+)'/)![1];
    expect(nonce(a)).not.toBe(nonce(b));
    expect(a).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(a).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic' 'sha256-[^']+' 'sha256-[^']+'/);
    expect(a).toMatch(/frame-ancestors 'none'.*object-src 'none'/);
  });

  it("fails closed with a 503 under the nonce policy when the auth config is missing", async () => {
    vi.mocked(getAuth).mockImplementation(() => { throw new Error("NEON_AUTH_BASE_URL ortam değişkeni eksik."); });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await proxy(new NextRequest("http://localhost/panel/fis/abc"));
    expect(res.status).toBe(503);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBeNull();
    expect(res.headers.get("content-security-policy")).toMatch(/'strict-dynamic'.*frame-ancestors 'none'/);
    expect(await res.text()).not.toContain("NEON");
    error.mockRestore();
    vi.mocked(getAuth).mockReset();
  });

  it("fails closed with a 503 on the auth pages and the API too, without a body that names the config", async () => {
    vi.mocked(getAuth).mockImplementation(() => { throw new Error("NEON_AUTH_BASE_URL ortam değişkeni eksik."); });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const path of ["/giris", "/kayit", "/api/receipts"]) {
      const res = await proxy(new NextRequest(`http://localhost${path}`));
      expect(res.status, path).toBe(503);
      expect(res.headers.get("retry-after"), path).toBe("60");
      expect(res.headers.get("x-middleware-next"), path).toBeNull();
      expect(await res.text(), path).not.toContain("NEON");
    }
    expect((await proxy(new NextRequest("http://localhost/giris"))).headers.get("content-security-policy")).toMatch(/'strict-dynamic'/);
    expect(await (await proxy(new NextRequest("http://localhost/api/receipts"))).json()).toEqual({ error: "Hizmet geçici olarak kullanılamıyor. Bir dakika sonra yeniden deneyin." });
    error.mockRestore();
    vi.mocked(getAuth).mockReset();
  });

  it("passes API requests through untouched when the auth config is there", async () => {
    vi.mocked(getAuth).mockReturnValue({} as unknown as ReturnType<typeof getAuth>);
    const res = await proxy(new NextRequest("http://localhost/api/receipts", { method: "POST", body: "{}" }));
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.headers.get("content-security-policy")).toBeNull();
  });

  it("keeps the request body for POSTs to the panel", async () => {
    let body = "";
    vi.mocked(getAuth).mockReturnValue({ middleware: () => async (req: NextRequest) => { body = await req.text(); return NextResponse.next(); } } as unknown as ReturnType<typeof getAuth>);
    await proxy(new NextRequest("http://localhost/panel", { method: "POST", body: "a=1" }));
    expect(body).toBe("a=1");
  });
});
