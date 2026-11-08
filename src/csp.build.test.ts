import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Renders a real page of the production build, so a Next upgrade that stops reading the nonce (scripts blocked, page dead)
// fails here. /giris goes through the same proxy nonce as the panel, without needing a session. Skipped without `npm run build`.
const built = existsSync(".next/BUILD_ID");
const PORT = 3317;
const base = `http://localhost:${PORT}`;
let server: ChildProcess;

describe.skipIf(!built)("production build CSP", () => {
  beforeAll(async () => {
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
      stdio: "ignore",
      // Placeholders: with no session cookie the auth client never calls out; the page only needs them to exist.
      env: { ...process.env, NODE_ENV: "production", SUPABASE_URL: "http://127.0.0.1:9", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_csp_build_test_placeholder" },
    });
    for (let i = 0; i < 100; i++) {
      if (await fetch(`${base}/gizlilik`).then((r) => r.ok, () => false)) return;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error("next start did not come up");
  }, 30_000);
  afterAll(() => { server?.kill(); });

  it("puts the request's nonce on every Next script of /giris, and the layout's constants match their hashes", async () => {
    const res = await fetch(`${base}/giris`);
    expect(res.status).toBe(200);
    const csp = res.headers.get("content-security-policy")!;
    const nonce = csp.match(/'nonce-([^']+)'/)![1];
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain("worker-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    const scripts = [...(await res.text()).matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
    expect(scripts.length).toBeGreaterThan(3);
    for (const [, attrs, body] of scripts) {
      const hash = `'sha256-${createHash("sha256").update(body).digest("base64")}'`;
      const allowed = attrs.includes(`nonce="${nonce}"`) || (!attrs.includes("src=") && csp.includes(hash));
      expect(allowed, attrs + body.slice(0, 60)).toBe(true);
    }
  });

  it("sends a panel deep link without a session to /giris with the way back, under the nonce policy", async () => {
    const res = await fetch(`${base}/panel/fis/abc`, { redirect: "manual" });
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const to = new URL(res.headers.get("location")!, base);
    expect(to.pathname).toBe("/giris");
    expect(to.searchParams.get("sonra")).toBe("/panel/fis/abc");
    expect(res.headers.get("content-security-policy")).toContain("'strict-dynamic'");
    expect((await fetch(`${base}/api/receipts`)).status).toBe(401);
  });

  it("keeps the security headers on the fail-closed 503 of the panel, auth pages and API when the auth config is missing", async () => {
    // Malformed counts as missing (src/lib/auth/server.ts); empty would be refilled from .env.local by next start.
    const bare = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT + 1)], {
      stdio: "ignore",
      env: { ...process.env, NODE_ENV: "production", SUPABASE_URL: "eksik", SUPABASE_PUBLISHABLE_KEY: "eksik" },
    });
    try {
      let res: Response | undefined;
      for (let i = 0; i < 100 && !res; i++) {
        res = await fetch(`http://localhost:${PORT + 1}/panel/fis/abc`, { redirect: "manual" }).catch(() => undefined);
        if (!res) await new Promise((r) => setTimeout(r, 200));
      }
      expect(res!.status).toBe(503);
      expect(res!.headers.get("strict-transport-security")).toContain("max-age=");
      expect(res!.headers.get("x-frame-options")).toBe("DENY");
      expect(res!.headers.get("content-security-policy")).toContain("'strict-dynamic'");
      for (const path of ["/giris", "/kayit", "/api/receipts"]) {
        const other = await fetch(`http://localhost:${PORT + 1}${path}`, { redirect: "manual" });
        expect(other.status, path).toBe(503);
        expect(other.headers.get("retry-after"), path).toBe("60");
        expect(other.headers.get("x-frame-options"), path).toBe("DENY");
      }
    } finally {
      bare.kill();
    }
  }, 30_000);

  it("keeps the static homepage on the public policy", async () => {
    const csp = (await fetch(base)).headers.get("content-security-policy")!;
    expect(csp).toMatch(/script-src 'self' 'unsafe-inline';/);
    expect(csp).not.toContain("nonce-");
    expect(csp).not.toContain("cloudflare");
  });
});
