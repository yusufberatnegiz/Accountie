import { describe, expect, it, vi } from "vitest";
import manifest from "../../../extension/manifest.json";
import "../../../extension/background.js";
import { DEV_EXTENSION_ID, EXTENSION_IDS, STORE_EXTENSION_ID } from "../extension-id";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const { acceptToken, importStatus } = (globalThis as unknown as { AccountieBackground: {
  acceptToken(m: unknown, s: unknown): string | null;
  importStatus(m: unknown, s: unknown, at: unknown, now: number): { ok: boolean; importing: boolean } | null;
} }).AccountieBackground;
const TOKEN = `acx_${"a".repeat(43)}`;
const SITE = { origin: "https://accountie.app" };

describe("eklentiye bağla (anahtarsız kurulum)", () => {
  it("firma okumasının sürüp sürmediğini yalnız siteye söyler; eski nabız bitmiş sayılır", () => {
    const Q = { type: "accountie-import-status" };
    expect(importStatus(Q, SITE, 1000, 5000)).toEqual({ ok: true, importing: true });
    expect(importStatus(Q, SITE, 1000, 1000 + 181_000)).toEqual({ ok: true, importing: false });
    expect(importStatus(Q, SITE, undefined, 5000)).toEqual({ ok: true, importing: false });
    expect(importStatus(Q, { origin: "https://kotu.example" }, 1000, 5000)).toBeNull();
    expect(importStatus({ type: "baska" }, SITE, 1000, 5000)).toBeNull();
  });

  it("yalnız Accountie sitesinden gelen, anahtar biçimindeki mesajı kabul eder", () => {
    expect(acceptToken({ type: "accountie-token", token: TOKEN }, SITE)).toBe(TOKEN);
    expect(acceptToken({ type: "accountie-token", token: TOKEN }, { origin: "https://kotu.example" })).toBeNull();
    expect(acceptToken({ type: "accountie-token", token: TOKEN }, { origin: "https://accountie.app.kotu.example" })).toBeNull();
    expect(acceptToken({ type: "accountie-token", token: TOKEN }, { origin: "https://www.accountie.app" })).toBe(TOKEN);
    // The old address is no longer a sender the extension trusts.
    expect(acceptToken({ type: "accountie-token", token: TOKEN }, { origin: "https://accountie.vercel.app" })).toBeNull();
    expect(acceptToken({ type: "accountie-token", token: "acx_kisa" }, SITE)).toBeNull();
    expect(acceptToken({ type: "baska", token: TOKEN }, SITE)).toBeNull();
    expect(acceptToken(null, SITE)).toBeNull();
  });

  it("sitenin bildiği eklenti kimliği, manifest'teki anahtardan çıkan kimlikle aynı", () => {
    const der = Buffer.from(manifest.key, "base64");
    const id = [...createHash("sha256").update(der).digest("hex").slice(0, 32)].map((h) => String.fromCharCode(97 + parseInt(h, 16))).join("");
    expect(id).toBe(DEV_EXTENSION_ID);
    // The store release is offered the key first; the repo copy after it.
    expect(EXTENSION_IDS).toEqual([STORE_EXTENSION_ID, DEV_EXTENSION_ID]);
    expect(STORE_EXTENSION_ID).toMatch(/^[a-p]{32}$/);
    expect(manifest.externally_connectable.matches).toEqual(["https://accountie.app/*", "https://www.accountie.app/*"]);
  });
});

it("yalnız e-Tebligat ekranından gelen, bağlı hesap ve güncel onayla eşleşen tarama isteğini açar", async () => {
  type Sender = { origin: string; url: string };
  type Handler = (message: unknown, sender: Sender, reply: (result: { ok: boolean }) => void) => void;
  let handle!: Handler;
  const until = "2099-01-01T00:00:00.000Z";
  const account = "test@example.com";
  const create = vi.fn(async () => ({}));
  const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ enabled: true, account, scanUntil: until, firms: [{ lucaId: "7" }] }) }));
  runInNewContext(readFileSync("extension/background.js", "utf8"), {
    URL, fetch, chrome: {
      runtime: { getURL: (path: string) => `chrome-extension://test/${path}`, onMessageExternal: { addListener: (listener: Handler) => { handle = listener; } } },
      storage: { local: { get: async () => ({ token: TOKEN }) } }, tabs: { create },
    },
  });
  const sender = { ...SITE, url: "https://accountie.app/panel/tebligatlar" };
  const send = (changes: object, from = sender) => new Promise((resolve) => handle({ type: "accountie-gib-scan", account, until, ...changes }, from, resolve));
  expect(await send({}, { ...sender, url: "https://accountie.app/panel" })).toEqual({ ok: false });
  expect(await send({ account: "other@example.com" })).toEqual({ ok: false });
  expect(await send({ until: "2099-02-01T00:00:00.000Z" })).toEqual({ ok: false });
  expect(await send({})).toEqual({ ok: true });
  expect(create).toHaveBeenCalledExactlyOnceWith({ url: `chrome-extension://test/tebligat.html#${encodeURIComponent(until)}`, active: true });
});
