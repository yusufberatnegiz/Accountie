import { describe, expect, it } from "vitest";
import manifest from "../../../extension/manifest.json";
import "../../../extension/background.js";
import { DEV_EXTENSION_ID, EXTENSION_IDS, STORE_EXTENSION_ID } from "../extension-id";
import { createHash } from "node:crypto";

const { acceptToken } = (globalThis as unknown as { AccountieBackground: { acceptToken(m: unknown, s: unknown): string | null } }).AccountieBackground;
const TOKEN = `acx_${"a".repeat(43)}`;
const SITE = { origin: "https://accountie.app" };

describe("eklentiye bağla (anahtarsız kurulum)", () => {
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
