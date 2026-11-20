import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import "../../../extension/gib-login.js";

type Row = { lucaId: string; name: string; user: string; pass: string };
const { AccountieGibLogin: g } = globalThis as unknown as { AccountieGibLogin: {
  LUCA_PAGE: string;
  lucaRows(doc: unknown, path: string): Row[] | null;
  plan(rows: Row[], firms: { lucaId: string; taxNumber: string }[], doneToday?: string[]): { todo: (Row & { taxNumber: string })[]; noCredentials: string[]; notInAccountie: string[]; done: number };
  resetSession(doc: unknown, storage: Storage, loc: { pathname: string; assign(p: string): void }): boolean;
  fillLogin(user: string, pass: string, name: string, doc: unknown, storage: Storage): boolean;
  loginState(storage: Storage, loc: { pathname: string }): string;
  sameFirm(ids: string[], tax: string): boolean;
} };

const PASS = "S3cr3t!pw";

function storage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m } as unknown as Storage & { m: Map<string, string> };
}

/** Luca's GİB Şirket screen: one row per firm, KULLANICI_ADI_<id> and SIFRE_<id>. */
function lucaDoc(rows: { id: string; name: string; user: string; pass: string }[]) {
  const inputs = new Map<string, { id: string; value: string; closest(): unknown }>();
  for (const r of rows) {
    const tr = { cells: [{ textContent: "" }, { textContent: ` ${r.name} ` }] };
    inputs.set(`KULLANICI_ADI_${r.id}`, { id: `KULLANICI_ADI_${r.id}`, value: r.user, closest: () => tr });
    inputs.set(`SIFRE_${r.id}`, { id: `SIFRE_${r.id}`, value: r.pass, closest: () => tr });
  }
  return {
    querySelectorAll: (sel: string) => (sel === "input[id^='SIFRE_']" ? [...inputs.values()].filter((i) => i.id.startsWith("SIFRE_")) : []),
    getElementById: (id: string) => inputs.get(id) ?? null,
  };
}

describe("eklenti: Luca GİB Şirket ekranı ve GİB girişi", () => {
  it("Luca satırlarını yalnız GİB Şirket ekranında okur", () => {
    const doc = lucaDoc([{ id: "7", name: "ÖRNEK", user: "12345678", pass: PASS }]);
    expect(g.lucaRows(doc, g.LUCA_PAGE)).toEqual([{ lucaId: "7", name: "ÖRNEK", user: "12345678", pass: PASS }]);
    expect(g.lucaRows(doc, "/Luca/luca.do")).toBeNull();
  });

  it("taranacaklar: şifresi dolu, Accountie'de VKN'si olan, bugün taranmamış firmalar", () => {
    const rows = [
      { lucaId: "1", name: "A", user: "111", pass: "p" },
      { lucaId: "2", name: "B", user: "222", pass: "" },
      { lucaId: "3", name: "C", user: "333", pass: "p" },
      { lucaId: "4", name: "D", user: "444", pass: "p" },
    ];
    const p = g.plan(rows, [{ lucaId: "1", taxNumber: "1234567890" }, { lucaId: "2", taxNumber: "1234567891" }, { lucaId: "4", taxNumber: "1234567892" }], ["4"]);
    expect(p.todo.map((f) => [f.lucaId, f.taxNumber])).toEqual([["1", "1234567890"]]);
    expect(p.noCredentials).toEqual(["B"]);
    expect(p.notInAccountie).toEqual(["C"]);
    expect(p.done).toBe(1);
  });

  it("formu doldurur, doğrulama koduna dokunmaz, imleci ona koyar; notta şifre yok", () => {
    const box = () => ({ value: "", events: [] as string[], dispatchEvent(e: Event) { this.events.push(e.type); }, focus: vi.fn() });
    const userid = box(), sifre = box(), dk = box();
    const appended: { textContent?: string; append(...c: unknown[]): void; children: { textContent?: string }[] }[] = [];
    const el = () => ({ style: {}, textContent: "", children: [] as { textContent?: string }[], setAttribute() {}, addEventListener() {}, append(...c: { textContent?: string }[]) { this.children.push(...c); } });
    const doc = { getElementById: (id: string) => ({ userid, sifre, dk } as Record<string, unknown>)[id] ?? null, createElement: el, body: { append: (n: never) => appended.push(n) } };
    expect(g.fillLogin("12345678", PASS, "ÖRNEK LTD", doc, storage())).toBe(true);
    expect([userid.value, sifre.value, dk.value]).toEqual(["12345678", PASS, ""]);
    expect(userid.events).toEqual(["input", "change"]);
    expect(dk.focus).toHaveBeenCalled();
    const noteText = JSON.stringify(appended);
    expect(noteText).toContain("ÖRNEK LTD");
    expect(noteText).not.toContain(PASS);
    expect(g.fillLogin("x", "y", "z", { getElementById: () => null }, storage())).toBe(false);
  });

  it("yeni firmadan önce eski oturum anahtarı silinir; giriş, atla ve bekleme ayrılır", () => {
    const s = storage({ token: "old", "accountie-skip": "1" });
    const loc = { pathname: "/portal", assign: vi.fn() };
    expect(g.resetSession({ getElementById: () => ({}) }, s, loc)).toBe(false);
    expect(loc.assign).toHaveBeenCalledWith("/portal/login");
    expect(s.getItem("token")).toBeNull();
    expect(g.loginState(storage(), { pathname: "/portal/login" })).toBe("waiting");
    expect(g.loginState(storage({ token: "t" }), { pathname: "/portal" })).toBe("in");
    expect(g.loginState(storage({ "accountie-skip": "1", token: "t" }), { pathname: "/portal" })).toBe("skip");
    expect(g.sameFirm(["1234567890"], "1234567890")).toBe(true);
    expect(g.sameFirm(["9999999999"], "1234567890")).toBe(false);
  });
});

describe("eklenti: e-Tebligat tarama sayfası", () => {
  class Node {
    hidden = true; disabled = false; className = ""; textContent = ""; children: Node[] = [];
    click?: () => Promise<void>;
    addEventListener(ev: string, cb: () => Promise<void>) { if (ev === "click") this.click = cb; }
    prepend(n: Node) { this.children.unshift(n); }
    appendChild(n: Node) { this.children.push(n); return n; }
    replaceChildren(...n: Node[]) { this.children = n; }
  }
  const textOf = (n: Node): string => [n.textContent, ...n.children.map(textOf)].join(" ");

  function setup(login: string, ids = ["1234567890"]) {
    const els = new Map<string, Node>();
    const get = (id: string) => { if (!els.has(id)) els.set(id, new Node()); return els.get(id)!; };
    const stored: unknown[] = [];
    const fillArgs: unknown[][] = [];
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/extension/firms")) return { ok: true, status: 200, json: async () => ({ firms: [{ lucaId: "7", taxNumber: "1234567890" }] }) };
      return { ok: true, status: 200, json: async () => ({ firm: "ÖRNEK LTD", fresh: 2, total: 5, body: init?.body }) };
    });
    const executeScript = vi.fn(async (o: { func?: () => unknown; args?: unknown[] }) => {
      if (!o.func) return [];
      const src = String(o.func);
      if (src.includes("lucaRows")) return [{ frameId: 3, result: [{ lucaId: "7", name: "ÖRNEK", user: "12345678", pass: PASS }] }];
      if (src.includes("fillLogin")) { fillArgs.push(o.args ?? []); return [{ result: true }]; }
      if (src.includes("resetSession")) return [{ result: true }];
      if (src.includes("loginState")) return [{ result: login }];
      if (src.includes("readNotices")) return [{ result: { idNumbers: ids, name: "ÖRNEK LTD", notices: [] } }];
      return [{}];
    });
    const chrome = {
      tabs: { query: async (q: { url: string }) => (q.url.includes("luca") ? [{ id: 1 }] : [{ id: 2 }]), create: vi.fn(), update: vi.fn(async () => ({})), getCurrent: async () => ({ id: 9 }) },
      scripting: { executeScript },
      permissions: { request: async () => true },
      storage: { local: { get: async (k: string) => (k === "token" ? { token: "acx_test" } : {}), set: async (v: unknown) => void stored.push(v) } },
    };
    const sources = ["gib-login.js", "gib-notices.js", "tebligat.js"].map((f) => readFileSync(`extension/${f}`, "utf8")).join("\n");
    const ctx = {
      URL, fetch, chrome, Event, setTimeout, console,
      window: { addEventListener() {} },
      document: { getElementById: get, createElement: () => new Node() },
    };
    runInNewContext(sources, ctx);
    return { get, fetch, stored, fillArgs, textOf };
  }

  it("şifre formu doldurmaya gider; Accountie'ye, depoya ve ekrana hiç gitmez; yeni tebligatlar özetlenir", async () => {
    const t = setup("in");
    await t.get("start").click?.();
    expect(t.fillArgs).toEqual([["12345678", PASS, "ÖRNEK"]]);
    expect(JSON.stringify(t.fetch.mock.calls)).not.toContain(PASS);
    expect(JSON.stringify(t.stored)).not.toContain(PASS);
    for (const id of ["status", "log", "fresh"]) expect(t.textOf(t.get(id))).not.toContain(PASS);
    expect(t.textOf(t.get("fresh"))).toContain("ÖRNEK LTD: 2 yeni tebligat");
    expect(t.stored).toEqual([{ tebligatScan: expect.objectContaining({ ids: ["7"] }) }]);
  });

  it("başka firmanın oturumu açılırsa hiçbir şey gönderilmez", async () => {
    const t = setup("in", ["9999999999"]);
    await t.get("start").click?.();
    expect(t.fetch.mock.calls.map((c) => c[0])).toEqual(["https://accountie.app/api/extension/firms"]);
    expect(t.textOf(t.get("log"))).toContain("bu firmanın vergi numarasına ait değil");
  });

  it("kullanıcı atla derse firma taranmış sayılmaz", async () => {
    const t = setup("skip");
    await t.get("start").click?.();
    expect(t.textOf(t.get("log"))).toContain("Atlandı.");
    expect(t.stored).toEqual([]);
  });
});
