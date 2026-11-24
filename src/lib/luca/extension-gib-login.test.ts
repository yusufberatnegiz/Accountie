import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import "../../../extension/gib-login.js";

type Row = { lucaId: string; name: string; user: string; pass: string };
const { AccountieGibLogin: g } = globalThis as unknown as { AccountieGibLogin: {
  LUCA_PAGE: string;
  lucaRows(doc: unknown, path: string): Row[] | null;
  plan(firms: { lucaId: string; name: string; taxNumber: string }[], doneToday?: string[], failedToday?: string[]): { todo: { lucaId: string; name: string; taxNumber: string }[]; noTax: string[]; sameTax: string[]; done: number; failed: number };
  goToLogin(storage: Storage, loc: { replace(p: string): void }): void;
  fillLogin(user: string, pass: string, text: string, doc: unknown, storage: Storage, loc?: { origin: string; pathname: string }): boolean;
  loginState(doc: unknown, storage: Storage, loc: { pathname: string }): string;
  captchaSetReactValue(el: unknown, value: string): boolean;
  submitLogin(doc?: unknown, loc?: { origin: string; pathname: string }): { ok: boolean; submitted?: boolean; reason?: string };
  gibCaptchaSolveAndSubmit(): Promise<{ ok: boolean; submitted?: boolean; reason?: string }>;
  sameFirm(ids: string[], tax: string): boolean;
} };

const PASS = "S3cr3t!pw";
const GIB = { origin: "https://dijital.gib.gov.tr", pathname: "/portal/login" };

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

  it("kayıtlı firmaları VKN ve bugünkü tarama durumuna göre tekilleştirir", () => {
    const firms = [["1", "A", "1234567890"], ["1", "A", "1234567890"], ["3", "C", ""], ["4", "D", "1234567892"], ["5", "E", "1234567893"], ["6", "F", "1234567890"]]
      .map(([lucaId, name, taxNumber]) => ({ lucaId, name, taxNumber }));
    const p = g.plan(firms, ["4"], ["5"]);
    expect(p.todo.map((f) => [f.lucaId, f.taxNumber])).toEqual([["1", "1234567890"]]);
    expect(p.noTax).toEqual(["C"]);
    expect(p.sameTax).toEqual(["F"]);
    expect([p.done, p.failed]).toEqual([1, 1]);
  });

  it("formu doldurur, doğrulama koduna dokunmaz, imleci ona koyar; notta şifre yok", () => {
    const { doc, boxes, body } = gibDoc();
    expect(g.fillLogin("12345678", PASS, "Accountie · 1/3 · ÖRNEK LTD", doc, storage(), GIB)).toBe(true);
    expect([boxes.userid.value, boxes.sifre.value, boxes.dk.value]).toEqual(["12345678", PASS, ""]);
    expect(boxes.userid.events).toEqual(["input", "change"]);
    expect(boxes.dk.focus).toHaveBeenCalled();
    const noteText = JSON.stringify(body);
    expect(noteText).toContain("ÖRNEK LTD");
    expect(noteText).toContain("Bu firmayı atla");
    expect(noteText).toContain("Taramayı durdur");
    expect(noteText).not.toContain(PASS);
    // The note is made once and its text replaced on the next firm.
    g.fillLogin("x", "y", "Accountie · 2/3 · BAŞKA", doc, storage(), GIB);
    expect(body).toHaveLength(1);
    expect(JSON.stringify(body)).toContain("BAŞKA");
    expect(g.fillLogin("x", "y", "z", { getElementById: () => null }, storage(), GIB)).toBe(false);
    // A tab that went to another site, or another GİB page, gets no login even with boxes of the same ids.
    const other = gibDoc();
    expect(g.fillLogin("12345678", PASS, "x", other.doc, storage(), { origin: "https://evil.example", pathname: "/portal/login" })).toBe(false);
    expect(g.fillLogin("12345678", PASS, "x", other.doc, storage(), { origin: GIB.origin, pathname: "/portal" })).toBe(false);
    expect(other.boxes.sifre.value).toBe("");
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
    expect(g.loginState(doc("x"), storage({ token: "t" }), { pathname: "/portal/login", origin: "https://evil.example" } as { pathname: string })).toBe("elsewhere");
    expect(g.sameFirm(["1234567890"], "1234567890")).toBe(true);
    expect(g.sameFirm(["9999999999"], "1234567890")).toBe(false);
  });

  it("captcha tahminini React kontrollü alanına native setter ile yazar ve Giriş Yap'a basmaz", () => {
    const prototype = {
      value: "",
    } as { value: string };
    Object.defineProperty(prototype, "value", {
      configurable: true,
      get() { return (this as unknown as { _value: string })._value; },
      set(value: string) { (this as unknown as { _value: string })._value = value; },
    });
    const box = Object.assign(Object.create(prototype), {
      _value: "",
      dispatchEvent: vi.fn(),
    }) as { _value: string; value: string; dispatchEvent: ReturnType<typeof vi.fn> };
    expect(g.captchaSetReactValue(box, "A2B3C")).toBe(true);
    expect(box.value).toBe("A2B3C");
    expect(box.dispatchEvent).toHaveBeenCalledTimes(2);
  });

  it("Giriş Yap düğmesine otomatik basar ve gönderim durumunu döndürür", () => {
    const button = { click: vi.fn() };
    const doc = {
      querySelector: (selector: string) => selector.includes("submit") ? button : null,
    };
    const loc = { origin: "https://dijital.gib.gov.tr", pathname: "/portal/login" };
    expect(g.submitLogin(doc, loc)).toEqual({ ok: true, submitted: true });
    expect(button.click).toHaveBeenCalledTimes(1);
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

  /** The scan page in a sandbox with a fake Chrome and one saved firm. */
  function setup(login: string | Promise<string> | (() => string), ids = ["1234567890"], saved: null | {
    scanUntil: string | null; grantUntil?: string; grantError?: { status: number; error: string }; read?: number; firms?: { lucaId: string; name: string; taxNumber: string }[];
  } = { scanUntil: "2099-01-01T00:00:00.000Z" }, launch?: { until: string; allowed: boolean }, autoCaptcha = true) {
    const els = new Map<string, Node>();
    const get = (id: string) => { if (!els.has(id)) els.set(id, new Node()); return els.get(id)!; };
    const stored: { tebligatScan: unknown }[] = [];
    const fillArgs: unknown[][] = [];
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/extension/gib-logins")) return { ok: true, status: 200, json: async () => (saved ? { enabled: true, firms: saved.firms ?? [{ lucaId: "7", name: "ÖRNEK", taxNumber: "1234567890" }], scanUntil: saved.scanUntil } : { enabled: true, firms: [], scanUntil: null }) };
      if (url.endsWith("/api/extension/gib-scan") && init?.method === "POST") {
        if (saved?.grantError) return { ok: false, status: saved.grantError.status, json: async () => ({ error: saved.grantError?.error }) };
        const until = saved?.grantUntil ?? saved?.scanUntil;
        return { ok: Boolean(until), status: until ? 200 : 401, json: async () => ({ until }) };
      }
      if (url.endsWith("/api/extension/gib-logins/read")) {
        const status = saved?.read ?? 200;
        const { lucaId } = JSON.parse(String(init?.body));
        return { ok: status === 200, status, json: async () => (status === 200 ? { username: lucaId === "7" ? "12345678" : "87654321", password: PASS } : { error: "Tarama onaylı değil." }) };
      }
      if (url.endsWith("/api/extension/firms")) return { ok: true, status: 200, json: async () => ({ firms: [{ lucaId: "7", taxNumber: "1234567890" }] }) };
      return { ok: true, status: 200, json: async () => ({ firm: "ÖRNEK LTD", fresh: 2, total: 5 }) };
    });
    const executeScript = vi.fn(async (o: { func?: () => unknown; args?: unknown[] }) => {
      if (!o.func) return [];
      const src = String(o.func);
      if (src.includes("lucaRows")) return [{ frameId: 3, result: [{ lucaId: "7", name: "ÖRNEK", user: "12345678", pass: PASS }] }];
      if (src.includes("fillLogin")) { fillArgs.push(o.args ?? []); return [{ result: true }]; }
      if (src.includes("gibCaptchaSolveAndFill")) return [{ result: { ok: true, text: "ABCDE" } }];
      if (src.includes("submitLogin")) return [{ result: { ok: true, submitted: true } }];
      if (src.includes("loginReady")) return [{ result: true }];
      if (src.includes("loginState")) return [{ result: typeof login === "function" ? login() : await login }];
      if (src.includes("readNotices")) return [{ result: { idNumbers: ids, name: "ÖRNEK LTD", notices: [] } }];
      return [{}];
    });
    const chrome = {
      tabs: {
        query: async (q: { url: string }) => q.url.includes("luca") ? [{ id: 1 }] : q.url.includes("gib.gov.tr") ? [{ id: 2, autoDiscardable: true }] : [],
        get: async () => ({ id: 2, status: "complete" }),
        create: vi.fn(async () => ({})), update: vi.fn<(id: number, changes: object) => Promise<object>>(async () => ({})),
        getCurrent: async () => ({ id: 9, autoDiscardable: true }),
      },
      scripting: { executeScript },
      permissions: { request: vi.fn(async () => true), contains: async () => launch?.allowed ?? false },
      storage: { local: {
        get: async (k: string) => (k === "token" ? { token: "acx_test" } : k === "gibAutoCaptcha" ? { gibAutoCaptcha: autoCaptcha } : { tebligatScan: stored.filter((v) => v.tebligatScan).at(-1)?.tebligatScan }),
        set: async (v: { tebligatScan: unknown }) => void stored.push(v),
      } },
    };
    const sources = ["gib-login.js", "gib-notices.js", "tebligat.js"].map((f) => readFileSync(`extension/${f}`, "utf8")).join("\n");
    runInNewContext(sources, {
      URL, fetch, chrome, Event, setTimeout, console, Date,
      window: { addEventListener() {}, location: launch ? { hash: `#${encodeURIComponent(launch.until)}`, pathname: "/tebligat.html" } : undefined, history: { replaceState() {} } },
      document: { getElementById: get, createElement: () => new Node(), title: "" },
    });
    return { get, fetch, stored, fillArgs, executeScript, permissions: chrome.permissions, tabs: chrome.tabs };
  }

  it("siteden başlatılan tarama, verilmiş Chrome izniyle ikinci tıklama olmadan çalışır", async () => {
    const t = setup("in", undefined, undefined, { until: "2099-01-01T00:00:00.000Z", allowed: true });
    await vi.waitFor(() => expect(textOf(t.get("status"))).toContain("Tarama tamamlandı"), { timeout: 10_000 });
    expect(t.permissions.request).not.toHaveBeenCalled();
    expect(t.fillArgs).toHaveLength(1);
    expect(t.fetch.mock.calls.some(([url, init]) => url.endsWith("/gib-scan") && init?.method === "POST")).toBe(false);
  });

  it("sitede ayrı onay olmadan mevcut Accountie oturumuyla eklentiden taramayı başlatır", async () => {
    const until = "2099-01-01T00:00:00.000Z";
    const t = setup("in", undefined, { scanUntil: null, grantUntil: until });
    await t.get("start").click?.();
    expect(t.fetch).toHaveBeenCalledWith("https://accountie.app/api/extension/gib-scan", expect.objectContaining({
      method: "POST", credentials: "include", headers: { authorization: "Bearer acx_test" },
    }));
    expect(t.fetch).toHaveBeenCalledWith(`https://accountie.app/api/extension/gib-scan?until=${encodeURIComponent(until)}`, expect.objectContaining({ method: "DELETE", credentials: "omit" }));
    expect(t.fillArgs).toHaveLength(1);
  });

  it("ilk taramada Chrome izni için tıklamayı bekler", async () => {
    const t = setup("in", undefined, undefined, { until: "2099-01-01T00:00:00.000Z", allowed: false });
    await vi.waitFor(() => expect(t.get("start").textContent).toBe("GİB erişimine izin ver ve başlat"));
    expect(t.fetch).not.toHaveBeenCalled();
    expect(t.permissions.request).not.toHaveBeenCalled();
    await t.get("start").click?.();
    expect(t.permissions.request).toHaveBeenCalledOnce();
    expect(textOf(t.get("status"))).toContain("Tarama tamamlandı");
  });

  it.each([401, 403, 405])("doğrudan erişim %s dönerse Accountie'de elle onay bekler", async (status) => {
    const saved: { scanUntil: string | null; grantError: { status: number; error: string } } = {
      scanUntil: null, grantError: { status, error: "Tarama isteği reddedildi." },
    };
    const t = setup("in", undefined, saved);
    await t.get("start").click?.();
    expect(t.get("scan-approval").hidden).toBe(false);
    expect(t.fillArgs).toHaveLength(0);
    expect(t.tabs.create).not.toHaveBeenCalled();

    await t.get("scan-approval").click?.();
    expect(t.fetch.mock.calls.filter(([url]) => url.endsWith("/gib-logins/read"))).toHaveLength(0);
    saved.scanUntil = "2099-01-01T00:00:00.000Z";
    await t.get("start").click?.();
    expect(t.fetch.mock.calls.filter(([url, init]) => url.endsWith("/gib-scan") && init?.method === "POST")).toHaveLength(1);
    expect(t.fillArgs).toHaveLength(1);
    expect(t.get("scan-approval").hidden).toBe(true);
  });

  it("siteden gelen tarama isteği güncel erişimle eşleşmezse giriş bilgilerine ulaşmaz", async () => {
    const t = setup("in", undefined, undefined, { until: "2099-02-01T00:00:00.000Z", allowed: true });
    await vi.waitFor(() => expect(textOf(t.get("status"))).toContain("Tarama erişimi değişti"));
    expect(t.fetch.mock.calls.map(([url]) => url)).toEqual(["https://accountie.app/api/extension/gib-logins"]);
    expect(t.fillArgs).toHaveLength(0);
  });

  it("site onayı değiştiğinde kullanıcı güncel onayla taramayı yeniden başlatabilir", async () => {
    const current = "2099-01-01T00:00:00.000Z";
    const t = setup("in", undefined, { scanUntil: current }, { until: "2099-02-01T00:00:00.000Z", allowed: false }, false);
    await vi.waitFor(() => expect(t.get("start").textContent).toBe("GİB erişimine izin ver ve başlat"));
    await t.get("start").click?.();
    expect(textOf(t.get("status"))).toContain("Tarama erişimi değişti");
    expect(t.fillArgs).toHaveLength(0);

    await t.get("start").click?.();
    expect(textOf(t.get("status"))).toContain("Tarama tamamlandı");
    expect(t.fillArgs).toHaveLength(1);
    expect(t.fetch).toHaveBeenCalledWith(`https://accountie.app/api/extension/gib-scan?until=${encodeURIComponent(current)}`, expect.objectContaining({ method: "DELETE" }));
  });

  it("GİB sekmesini öne almadan tarar ve tamamlanınca Accountie e-Tebligat sayfasını açar", async () => {
    const t = setup("in");
    await t.get("start").click?.();
    expect(t.tabs.update).not.toHaveBeenCalledWith(2, expect.objectContaining({ active: true }));
    for (const id of [2, 9]) {
      expect(t.tabs.update).toHaveBeenCalledWith(id, { autoDiscardable: false });
      expect(t.tabs.update).toHaveBeenCalledWith(id, { autoDiscardable: true });
    }
    expect(t.tabs.create).toHaveBeenCalledExactlyOnceWith({ url: "https://accountie.app/panel/tebligatlar?tarama=tamamlandi", active: true });
    expect(textOf(t.get("status"))).toContain("Tarama tamamlandı");
  });

  it("OCR başarısız olursa firma atlanır ve taranamayanlarda gösterilir", async () => {
    const t = setup(vi.fn().mockReturnValueOnce("waiting").mockReturnValue("in"));
    const orig = t.executeScript.getMockImplementation()!;
    t.executeScript.mockImplementation(async (o: { func?: () => unknown; args?: unknown[] }) => {
      if (o.func && String(o.func).includes("gibCaptchaSolveAndFill")) return [{ result: { ok: false, reason: "error" } }];
      return orig(o);
    });
    await t.get("start").click?.();
    expect(t.executeScript.mock.calls.some(([script]) => String(script.func).includes("gibCaptchaSolveAndFill"))).toBe(true);
    expect(textOf(t.get("log"))).toContain("Doğrulama kodu çözülemedi");
    expect(textOf(t.get("failed"))).toContain("ÖRNEK");
  });

  it("OCR başarılı olursa giriş yapar ve tebligatları okur", async () => {
    const t = setup("in");
    const orig = t.executeScript.getMockImplementation()!;
    t.executeScript.mockImplementation(async (o: { func?: () => unknown; args?: unknown[] }) => {
      if (o.func && String(o.func).includes("gibCaptchaSolveAndFill")) return [{ result: { ok: true, text: "ABCDE" } }];
      return orig(o);
    });
    await t.get("start").click?.();
    expect(t.executeScript.mock.calls.some(([script]) => String(script.func).includes("gibCaptchaSolveAndFill"))).toBe(true);
    expect(textOf(t.get("status"))).toContain("Tarama tamamlandı");
  });

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
    expect(t.fetch.mock.calls.map((c) => c[0])).not.toContain("https://accountie.app/api/extension/notices");
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
    expect(t.tabs.create).not.toHaveBeenCalled();
  });

  it("kayıtlı girişler: Luca açık olmadan firma firma Accountie'den alınır; şifre depoya ve ekrana gitmez", async () => {
    const t = setup("in", ["1234567890"], { scanUntil: new Date(Date.now() + 3600_000).toISOString() });
    await t.get("start").click?.();
    expect(t.fetch.mock.calls.map((c) => c[0])).toContain("https://accountie.app/api/extension/gib-logins/read");
    expect(t.fetch.mock.calls.map((c) => c[0])).not.toContain("https://accountie.app/api/extension/firms");
    expect(t.fillArgs.map((a) => a.slice(0, 2))).toEqual([["12345678", PASS]]);
    expect(JSON.stringify(t.stored)).not.toContain(PASS);
    for (const id of ["status", "log", "fresh", "failed"]) expect(textOf(t.get(id))).not.toContain(PASS);
    // The notices POST carries the list only.
    const posted = t.fetch.mock.calls.find((c) => String(c[0]).endsWith("/api/extension/notices"));
    expect(JSON.stringify(posted)).not.toContain(PASS);
  });

  it("ikinci firmanın girişini ancak ilk firmanın listesi gönderildikten sonra ister", { timeout: 15_000 }, async () => {
    const firms = [
      { lucaId: "7", name: "BİRİNCİ", taxNumber: "1234567890" },
      { lucaId: "8", name: "İKİNCİ", taxNumber: "1234567891" },
    ];
    const t = setup("in", firms.map((firm) => firm.taxNumber), { scanUntil: "2099-01-01T00:00:00.000Z", firms });
    await t.get("start").click?.();
    const steps = t.fetch.mock.calls.flatMap(([url, init]) => {
      if (url.endsWith("/gib-logins/read")) return [JSON.parse(String(init?.body)).lucaId];
      return url.endsWith("/notices") ? ["liste gönderildi"] : [];
    });
    expect(steps).toEqual(["7", "liste gönderildi", "8", "liste gönderildi"]);
    expect(t.fillArgs.map(([user]) => user)).toEqual(["12345678", "87654321"]);
  });

  it("onay yoksa tarama başlamaz; onay biterse tarama durur", async () => {
    const none = setup("in", ["1234567890"], { scanUntil: null });
    await none.get("start").click?.();
    expect(textOf(none.get("status"))).toContain("Accountie'ye giriş yapıp");
    expect(none.fillArgs).toEqual([]);
    const ended = setup("in", ["1234567890"], { scanUntil: new Date(Date.now() + 3600_000).toISOString(), read: 403 });
    await ended.get("start").click?.();
    expect(textOf(ended.get("status"))).toContain("Tarama onaylı değil");
    expect(ended.fillArgs).toEqual([]);
    expect(ended.tabs.create).not.toHaveBeenCalled();
  });

  it("kayıtlı giriş yoksa Luca açık olsa bile giriş bilgilerini yeniden okumaz", async () => {
    const t = setup("in", ["1234567890"], null);
    await t.get("start").click?.();
    expect(t.fetch.mock.calls.map((c) => c[0])).toEqual(["https://accountie.app/api/extension/gib-logins"]);
    expect(t.fillArgs).toEqual([]);
    expect(textOf(t.get("status"))).toContain("Firmaları Luca'dan çekin");
  });

  it("liste kaydedilir; zarf açılmaz, belge indirilmez", async () => {
    const t = setup("in");
    await t.get("start").click?.();
    expect(t.executeScript.mock.calls.some(([o]) => /downloadNotice|zarf/.test(String((o as { func?: unknown }).func)))).toBe(false);
    expect(textOf(t.get("log"))).toContain("2 yeni tebligat");
    expect(textOf(t.get("log"))).not.toContain("belge");
  });
});
