import { describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "./proxy";

vi.mock("@/lib/auth/server", () => ({ getAuth: vi.fn() }));

const guarded = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("proxy matcher", () => {
  it("sends the panel through the session check", () => {
    for (const url of ["/panel", "/panel/fis/abc", "/panel/kurallar", "/fis/abc", "/kurallar"]) {
      expect(guarded(url), url).toBe(true);
    }
  });

  it("leaves the public pages and assets open", () => {
    for (const url of ["/", "/giris", "/kayit", "/gorseller/antalya-liman.jpg", "/manifest.webmanifest", "/icon.svg", "/_next/static/x.js"]) {
      expect(guarded(url), url).toBe(false);
    }
  });

  // API routes are skipped here on purpose: each route handler checks the session itself (routes.test.ts).
  it("skips API routes", () => {
    expect(guarded("/api/receipts")).toBe(false);
  });
});
