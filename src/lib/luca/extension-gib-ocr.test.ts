import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

type DecodeOutput = (
  output: number[],
  charset: string[],
  allowed: Set<string>,
) => { ok: boolean; text?: string; reason?: string; confidence?: number | null };

const listeners: ((message: unknown) => unknown)[] = [];
const chrome = {
  runtime: {
    getURL: (path: string) => `chrome-extension://test/${path}`,
    onMessage: { addListener: vi.fn((listener: (message: unknown) => unknown) => listeners.push(listener)) },
  },
  storage: { local: { get: vi.fn(async () => ({ gibCharset: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" })) } },
};
const context = {
  chrome,
  OffscreenCanvas: class {},
  fetch: vi.fn(),
  createImageBitmap: vi.fn(),
  setTimeout,
  clearTimeout,
};
runInNewContext(readFileSync("extension/ocr.js", "utf8"), context);
const { AccountieOcr } = context as unknown as { AccountieOcr: { decodeOutput: DecodeOutput } };

describe("eklenti: cihaz içi GİB CAPTCHA CTC çıkarımı", () => {
  it("CTC tekrarlarını ve blank indeksini kaldırıp 5 karakter döndürür", () => {
    const charset = ["", "A", "B", "C", "2", "3"];
    expect(AccountieOcr.decodeOutput([1, 1, 0, 2, 3, 4, 5], charset, new Set(["A", "B", "C", "2", "3"]))).toEqual({
      ok: true,
      text: "ABC23",
      confidence: null,
      length: 5,
    });
  });

  it("izne uygun olmayan karakteri atlar ve geçersiz sonucu reddeder", () => {
    const charset = ["", "A", "X", "2", "3", "4"];
    expect(AccountieOcr.decodeOutput([1, 2, 3, 4, 5], charset, new Set(["A", "2", "3", "4"]))).toEqual({
      ok: false,
      reason: "invalid-output",
      text: "A234",
    });
  });

  it("çıktı 5 karakteri aşsa ilk 5 geçerli karakteri döndürür", () => {
    const charset = ["", "A", "B", "C", "2", "3"];
    expect(AccountieOcr.decodeOutput([1, 2, 3, 4, 5, 1, 2], charset, new Set(["A", "B", "C", "2", "3"])).text).toBe("ABC23");
  });

  it("offscreen mesajı yalnız ocr türü için yanıt verir", () => {
    const listeners: ((message: unknown) => unknown)[] = [];
    const chrome = {
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
        onMessage: { addListener: vi.fn((listener) => listeners.push(listener)) },
      },
      storage: { local: { get: vi.fn(async () => ({ gibCharset: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" })) } },
    };
    runInNewContext(readFileSync("extension/ocr.js", "utf8"), {
      chrome,
      OffscreenCanvas: class {},
      fetch: vi.fn(),
      createImageBitmap: vi.fn(),
      setTimeout,
      clearTimeout,
    });
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });
});
