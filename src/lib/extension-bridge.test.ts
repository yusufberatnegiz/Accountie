import { afterEach, describe, expect, it, vi } from "vitest";
import { extensionInstalled, offerToken } from "./extension-bridge";
import { DEV_EXTENSION_ID, STORE_EXTENSION_ID } from "./extension-id";

type Reply = { ok?: boolean } | undefined;
/** A fake chrome.runtime: `answers` maps an extension id to its reply; an id missing from it behaves as not installed. */
function fakeChrome(answers: Record<string, (message: { type: string }) => Reply>) {
  const runtime: { lastError?: unknown; sendMessage: ReturnType<typeof vi.fn> } = { sendMessage: vi.fn() };
  runtime.sendMessage.mockImplementation((id: string, message: { type: string }, cb: (r?: Reply) => void) => {
    const answer = answers[id];
    runtime.lastError = answer ? undefined : { message: "Could not establish connection. Receiving end does not exist." };
    cb(answer ? answer(message) : undefined);
  });
  (globalThis as { chrome?: unknown }).chrome = { runtime };
  return runtime;
}

afterEach(() => { delete (globalThis as { chrome?: unknown }).chrome; });

describe("eklenti köprüsü", () => {
  it("Chrome yoksa (başka tarayıcı) kurulu sayılmaz", async () => {
    expect(await extensionInstalled()).toBe(false);
    expect(await offerToken("acx_x")).toBe(false);
  });

  it("tanımadığı mesaja {ok:false} dönen eklenti kurulu sayılır; anahtar gönderilmez", async () => {
    const rt = fakeChrome({ [STORE_EXTENSION_ID]: () => ({ ok: false }) });
    expect(await extensionInstalled()).toBe(true);
    expect(rt.sendMessage.mock.calls[0][1]).toEqual({ type: "accountie-ping" });
  });

  it("mağaza sürümü yoksa paketsiz kopyayı dener; ikisi de yoksa kurulu değil", async () => {
    fakeChrome({ [DEV_EXTENSION_ID]: () => ({ ok: false }) });
    expect(await extensionInstalled()).toBe(true);
    fakeChrome({});
    expect(await extensionInstalled()).toBe(false);
  });

  it("anahtarı ilk kabul edene verir", async () => {
    const rt = fakeChrome({ [STORE_EXTENSION_ID]: (m) => ({ ok: m.type === "accountie-token" }) });
    expect(await offerToken("acx_anahtar")).toBe(true);
    expect(rt.sendMessage).toHaveBeenCalledTimes(1);
    fakeChrome({ [STORE_EXTENSION_ID]: () => ({ ok: false }) });
    expect(await offerToken("acx_anahtar")).toBe(false);
  });
});
