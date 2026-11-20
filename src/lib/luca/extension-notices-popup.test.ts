import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

const popup = readFileSync("extension/popup.js", "utf8");

class PopupElement {
  hidden = true;
  textContent = "";
  click?: () => Promise<void>;
  after() {}
  focus() {}
  setAttribute() {}
  removeAttribute() {}
  addEventListener(event: string, callback: () => Promise<void>) {
    if (event === "click") this.click = callback;
  }
}

it("GİB sekmesinde Luca fişlerini istemeden tebligat taramasını açar ve taramanın yeni sayısını gösterir", async () => {
  const elements = new Map<string, PopupElement>();
  const getElementById = (id: string) => {
    if (!elements.has(id)) elements.set(id, new PopupElement());
    return elements.get(id)!;
  };
  const notice = { idNumbers: ["1234567890"], notices: [] };
  const executeScript = vi.fn().mockResolvedValue([{ result: notice }]);
  const fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ firm: "Örnek Ltd.", total: 5, fresh: 2 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ firm: "Örnek Ltd.", total: 5, fresh: 0 }) });
  runInNewContext(popup, {
    URL, fetch,
    AccountieGib: { GIB_HOST: "dijital.gib.gov.tr" },
    document: { getElementById, querySelectorAll: () => [], querySelector: () => null },
    chrome: {
      tabs: { query: async () => [{ id: 1, url: "https://dijital.gib.gov.tr/" }] },
      scripting: { executeScript },
      storage: { local: { get: async () => ({ token: "accountie-test-key" }) } },
    },
  });

  await vi.waitFor(() => expect(getElementById("notices-view").hidden).toBe(false));
  expect(getElementById("list-view").hidden).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
  await getElementById("notices").click?.();
  expect(fetch).toHaveBeenCalledExactlyOnceWith("https://accountie.app/api/extension/notices", expect.objectContaining({ body: JSON.stringify(notice) }));
  expect(getElementById("status").textContent).toContain("2 yeni tebligat");
  await getElementById("notices").click?.();
  expect(getElementById("status").textContent).toContain("Bu taramada yeni tebligat bulunmadı.");
});
