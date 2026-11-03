import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

const answer = (success: boolean) => vi.fn(async () => Response.json({ success })) as unknown as typeof fetch;

describe("verifyTurnstile", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("gizli anahtar yoksa (yerel geliştirme) geçer", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(await verifyTurnstile(undefined, "1.2.3.4", answer(false))).toBe(true);
  });

  it("canlıda gizli anahtar yoksa doğrulamayı atlar ve uyarı yazar", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("VERCEL_ENV", "production");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await verifyTurnstile(undefined, "1.2.3.4", answer(false))).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("anahtar varken token yoksa, Cloudflare reddederse veya ulaşılamazsa reddeder", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    expect(await verifyTurnstile(null, "1.2.3.4", answer(true))).toBe(false);
    expect(await verifyTurnstile("tok", "1.2.3.4", answer(false))).toBe(false);
    const down = vi.fn(async () => { throw new Error("down"); }) as unknown as typeof fetch;
    expect(await verifyTurnstile("tok", "1.2.3.4", down)).toBe(false);
  });

  it("Cloudflare onaylarsa geçer, sırrı sunucudan gönderir", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    const fetchImpl = answer(true);
    expect(await verifyTurnstile("tok", "1.2.3.4", fetchImpl)).toBe(true);
    const body = (vi.mocked(fetchImpl).mock.calls[0] as unknown as [string, RequestInit])[1].body as URLSearchParams;
    expect(body.get("secret")).toBe("test-secret");
    expect(body.get("response")).toBe("tok");
  });
});
