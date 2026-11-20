import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import "../../../extension/gib-login.js";

type Row = { lucaId: string; name: string; user: string; pass: string };
const { AccountieGibLogin: g } = globalThis as unknown as { AccountieGibLogin: {
  LUCA_PAGE: string;
  lucaRows(doc: unknown, path: string): Row[] | null;
  plan(rows: Row[], firms: { lucaId: string; taxNumber: string }[], doneToday?: string[], failedToday?: string[]): { todo: (Row & { taxNumber: string })[]; noCredentials: string[]; notInAccountie: string[]; done: number; failed: number };
  goToLogin(storage: Storage, loc: { replace(p: string): void }): void;
  fillLogin(user: string, pass: string, text: string, doc: unknown, storage: Storage): boolean;
  loginState(doc: unknown, storage: Storage, loc: { pathname: string }): string;
  sameFirm(ids: string[], tax: string): boolean;
} };

const PASS = "S3cr3t!pw";

function storage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as unknown as Storage;
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

/** A minimal page for fillLogin/showNote: the three login boxes, and elements made by createElement found again by id. */
function gibDoc() {
  type El = { id?: string; textContent: string; children: El[]; style: object; setAttribute(): void; addEventListener(): void; append(...c: El[]): void };
  const box = () => ({ value: "", events: [] as string[], dispatchEvent(e: Event) { this.events.push(e.type); }, focus: vi.fn() });
  const boxes = { userid: box(), sifre: box(), dk: box() };
  const made: El[] = [];
  const body: El[] = [];
  const el = (): El => ({ textContent: "", children: [], style: {}, setAttribute() {}, addEventListener() {}, append(...c) { this.children.push(...c); } });
  const doc = {
    getElementById: (id: string) => (boxes as Record<string, unknown>)[id] ?? made.find((m) => m.id === id) ?? null,
    createElement: () => { const n = el(); made.push(n); return n; },
    body: { append: (n: El) => body.push(n) },
  };
  return { doc, boxes, body };
}

describe("eklenti: Luca GİB Şirket ekranı ve GİB girişi", () => {
  it("Luca satırlarını yalnız GİB Şirket ekranında okur", () => {
    const doc = lucaDoc([{ id: "7", name: "ÖRNEK", user: "12345678", pass: PASS }]);
    expect(g.lucaRows(doc, g.LUCA_PAGE)).toEqual([{ lucaId: "7", name: "ÖRNEK", user: "12345678", pass: PASS }]);
    expect(g.lucaRows(doc, `${g.LUCA_PAGE};jsessionid=x`)).toHaveLength(1);
    expect(g.lucaRows(doc, "/Luca/luca.do")).toBeNull();
  });

  it("taranacaklar: şifresi dolu, VKN'si bilinen, bugün taranmamış ve girişi olmamış olmayan; aynı firma ya da VKN bir kez", () => {
    const rows = [
      { lucaId: "1", name: "A", user: "111", pass: "p" },
      { lucaId: "1", name: "A", user: "111", pass: "p" },
      { lucaId: "2", name: "B", user: "222", pass: "" },
      { lucaId: "3", name: "C", user: "333", pass: "p" },
      { lucaId: "4", name: "D", user: "444", pass: "p" },
      { lucaId: "5", name: "E", user: "555", pass: "p" },
      { lucaId: "6", name: "F", user: "666", pass: "p" },
    ];
    const firms = [["1", "1234567890"], ["2", "1234567891"], ["4", "1234567892"], ["5", "1234567893"], ["6", "1234567890"]].map(([lucaId, taxNumber]) => ({ lucaId, taxNumber }));
    const p = g.plan(rows, firms, ["4"], ["5"]);
    expect(p.todo.map((f) => [f.lucaId, f.taxNumber])).toEqual([["1", "1234567890"]]);
    expect(p.noCredentials).toEqual(["B"]);
    expect(p.notInAccountie).toEqual(["C"]);
    expect((p as unknown as { sameTax: string[] }).sameTax).toEqual(["F"]);
    expect([p.done, p.failed]).toEqual([1, 1]);
  });

  it("formu doldurur, doğrulama koduna dokunmaz, imleci ona koyar; notta şifre yok", () => {
    const { doc, boxes, body } = gibDoc();
    expect(g.fillLogin("12345678", PASS, "Accountie · 1/3 · ÖRNEK LTD", doc, storage())).toBe(true);
    expect([boxes.userid.value, boxes.sifre.value, boxes.dk.value]).toEqual(["12345678", PASS, ""]);
    expect(boxes.userid.events).toEqual(["input", "change"]);
    expect(boxes.dk.focus).toHaveBeenCalled();
    const noteText = JSON.stringify(body);
    expect(noteText).toContain("ÖRNEK LTD");
    expect(noteText).toContain("Bu firmayı atla");
    expect(noteText).toContain("Taramayı durdur");
    expect(noteText).not.toContain(PASS);
    // The note is made once and its text replaced on the next firm.
    g.fillLogin("x", "y", "Accountie · 2/3 · BAŞKA", doc, storage());
    expect(body).toHaveLength(1);
    expect(JSON.stringify(body)).toContain("BAŞKA");
    expect(g.fillLogin("x", "y", "z", { getElementById: () => null }, storage())).toBe(false);
  });

  it("yeni firmadan önce eski oturum anahtarı silinir ve giriş sayfası baştan yüklenir; durumlar ayrılır", () => {
    const s = storage({ token: "old", "accountie-skip": "1", "accountie-stop": "1" });
    const loc = { replace: vi.fn() };
    g.goToLogin(s, loc);
    expect(loc.replace).toHaveBeenCalledWith("/portal/login");
    expect([s.getItem("token"), s.getItem("accountie-skip"), s.getItem("accountie-stop")]).toEqual([null, null, null]);
    const login = { pathname: "/portal/login" };
    const doc = (pass: string, note = true) => ({ getElementById: (id: string) => (id === "sifre" ? { value: pass } : id === "accountie-note" && note ? {} : null) });
    expect(g.loginState(doc("x"), storage(), login)).toBe("waiting");
    expect(g.loginState(doc(""), storage(), login)).toBe("refill");
    expect(g.loginState(doc("x", false), storage(), login)).toBe("refill");
    expect(g.loginState(doc("x"), storage({ token: "t" }), { pathname: "/portal" })).toBe("in");
    expect(g.loginState(doc("x"), storage({ "accountie-skip": "1", token: "t" }), login)).toBe("skip");
    expect(g.loginState(doc("x"), storage({ "accountie-stop": "1" }), login)).toBe("stop");
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

  /** The scan page in a sandbox with a fake Chrome: Luca gives one firm, GİB answers `login` while waiting for the user. */
  function setup(login: string, ids = ["1234567890"]) {
    const els = new Map<string, Node>();
    const get = (id: string) => { if (!els.has(id)) els.set(id, new Node()); return els.get(id)!; };
    const stored: { tebligatScan: unknown }[] = [];
    const fillArgs: unknown[][] = [];
    const fetch = vi.fn(async (url: string) => {
      if (url.endsWith("/api/extension/firms")) return { ok: true, status: 200, json: async () => ({ firms: [{ lucaId: "7", taxNumber: "1234567890" }] }) };
      return { ok: true, status: 200, json: async () => ({ firm: "ÖRNEK LTD", fresh: 2, total: 5 }) };
    });
    const executeScript = vi.fn(async (o: { func?: () => unknown; args?: unknown[] }) => {
      if (!o.func) return [];
      const src = String(o.func);
      if (src.includes("lucaRows")) return [{ frameId: 3, result: [{ lucaId: "7", name: "ÖRNEK", user: "12345678", pass: PASS }] }];
      if (src.includes("fillLogin")) { fillArgs.push(o.args ?? []); return [{ result: true }]; }
      if (src.includes("loginReady")) return [{ result: true }];
      if (src.includes("loginState")) return [{ result: login }];
      if (src.includes("readNotices")) return [{ result: { idNumbers: ids, name: "ÖRNEK LTD", notices: [] } }];
      return [{}];
    });
    const chrome = {
      tabs: { query: async (q: { url: string }) => (q.url.includes("luca") ? [{ id: 1 }] : [{ id: 2 }]), get: async () => ({ id: 2, status: "complete" }), create: vi.fn(), update: vi.fn(async () => ({})), getCurrent: async () => ({ id: 9 }) },
      scripting: { executeScript },
      permissions: { request: async () => true },
      storage: { local: { get: async (k: string) => (k === "token" ? { token: "acx_test" } : { tebligatScan: stored.at(-1)?.tebligatScan }), set: async (v: { tebligatScan: unknown }) => void stored.push(v) } },
    };
    const sources = ["gib-login.js", "gib-notices.js", "tebligat.js"].map((f) => readFileSync(`extension/${f}`, "utf8")).join("\n");
    runInNewContext(sources, {
      URL, fetch, chrome, Event, setTimeout, console, Date,
      window: { addEventListener() {} },
      document: { getElementById: get, createElement: () => new Node(), title: "" },
    });
    return { get, fetch, stored, fillArgs };
  }

  it("şifre formu doldurmaya gider; Accountie'ye, depoya ve ekrana hiç gitmez; yeni tebligatlar özetlenir", async () => {
    const t = setup("in");
    await t.get("start").click?.();
    expect(t.fillArgs.map((a) => a.slice(0, 2))).toEqual([["12345678", PASS]]);
    expect(String(t.fillArgs[0][2])).toContain("1/1 · ÖRNEK");
    expect(JSON.stringify(t.fetch.mock.calls)).not.toContain(PASS);
    expect(JSON.stringify(t.stored)).not.toContain(PASS);
    for (const id of ["status", "log", "fresh", "failed"]) expect(textOf(t.get(id))).not.toContain(PASS);
    expect(textOf(t.get("fresh"))).toContain("ÖRNEK LTD: 2 yeni tebligat");
    expect(t.stored.at(-1)?.tebligatScan).toEqual(expect.objectContaining({ ids: ["7"], failed: [], fresh: ["ÖRNEK LTD: 2 yeni tebligat"] }));
    expect(textOf(t.get("status"))).toContain("1 firma tarandı");
  });

  it("başka firmanın oturumu açılırsa hiçbir şey gönderilmez", async () => {
    const t = setup("in", ["9999999999"]);
    await t.get("start").click?.();
    expect(t.fetch.mock.calls.map((c) => c[0])).toEqual(["https://accountie.app/api/extension/firms"]);
    expect(textOf(t.get("log"))).toContain("Girilen hesap bu firmanın değil");
  });

  it("kullanıcı atla derse firma taranmış sayılmaz, bugün yeniden sorulmaz ve özette taranamayanlarda görünür", async () => {
    const t = setup("skip");
    await t.get("start").click?.();
    expect(textOf(t.get("log"))).toContain("Atlandı");
    expect(t.stored.at(-1)?.tebligatScan).toEqual(expect.objectContaining({ ids: [], failed: [{ id: "7", name: "ÖRNEK", line: expect.stringContaining("Atlandı") }] }));
    expect(textOf(t.get("failed"))).toContain("ÖRNEK");
  });

  it("GİB sekmesindeki Taramayı durdur taramayı durdurur", async () => {
    const t = setup("stop");
    await t.get("start").click?.();
    expect(textOf(t.get("status"))).toContain("Tarama durduruldu");
    expect(t.get("start").textContent).toBe("Taramayı sürdür");
  });
});
