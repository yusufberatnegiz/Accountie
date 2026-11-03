import { describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/server";
import proxy, { config } from "./proxy";

vi.mock("@/lib/auth/server", () => ({ getAuth: vi.fn() }));

const guarded = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("proxy matcher", () => {
  it("sends the panel through the session check", () => {
    for (const url of ["/panel", "/panel/fis/abc", "/panel/kurallar", "/fis/abc", "/kurallar", "/girisx", "/kayit-x", "/kayitlar", "/onizlemex", "/iconlar", "/icon-ayar", "/apple-touch-iconx", "/robots.txtx", "/sw.jsx", "/cevrimdisi", "/gizlilikx"]) {
      expect(guarded(url), url).toBe(true);
    }
  });

  it("leaves the public pages and assets open", () => {
    for (const url of ["/", "/giris", "/giris/sifre", "/giris/sifre/yeni", "/kayit", "/gizlilik", "/gorseller/antalya-liman.jpg", "/manifest.webmanifest", "/robots.txt", "/sw.js", "/cevrimdisi.html", "/icon.svg", "/icon-192.png", "/icon-maskable-512.png", "/apple-touch-icon.png", "/favicon.ico", "/_next/static/x.js"]) {
      expect(guarded(url), url).toBe(false);
    }
  });

  // API routes are skipped here on purpose: each route handler checks the session itself (routes.test.ts).
  it("skips API routes", () => {
    expect(guarded("/api/receipts")).toBe(false);
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
    expect((await run("/fis/abc")).searchParams.has("sonra")).toBe(false);
    expect((await run("/panel/fis/abc", "https://auth.example/giris")).searchParams.has("sonra")).toBe(false);
  });
});
