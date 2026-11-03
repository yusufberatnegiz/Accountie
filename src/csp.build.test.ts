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
      env: { ...process.env, NODE_ENV: "production", NEON_AUTH_BASE_URL: "http://127.0.0.1:9/auth", NEON_AUTH_COOKIE_SECRET: "csp-build-test-placeholder-secret-0123456789" },
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

  it("keeps the static homepage on the public policy", async () => {
    const csp = (await fetch(base)).headers.get("content-security-policy")!;
    expect(csp).toMatch(/script-src 'self' 'unsafe-inline'/);
    expect(csp).not.toContain("nonce-");
  });
});
