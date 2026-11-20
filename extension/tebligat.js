/* global chrome, AccountieGibLogin, AccountieGib */
// Bütün firmaların e-Tebligat taraması: her firmanın GİB girişi Accountie'den (firma çekilirken saklanan, kullanıcının onayıyla
// firma firma açılan) ya da kayıtlı giriş yoksa Luca'nın açık GİB Şirket ekranından alınır (gib-login.js), Dijital Vergi Dairesi
// giriş formu doldurulur, doğrulama kodunu kullanıcı yazar, giriş olunca liste okunur (gib-notices.js) ve Accountie'ye gönderilir.
// Bir giriş yalnız o firmanın formu için bellekte durur: chrome.storage'a, durum metnine ve tebligat isteğine hiç girmez.
const APP_ORIGIN = "https://accountie.app"; // popup.js ile aynı
const GIB_ORIGIN = `https://${AccountieGib.GIB_HOST}`;
const LOGIN_URL = `${GIB_ORIGIN}${AccountieGibLogin.LOGIN_PATH}`;
// Kullanıcının doğrulama kodunu yazması için firma başına süre; dolarsa kimse başında yok demektir, tarama durur.
const WAIT_MS = 5 * 60_000;
const POLL_MS = 1500;
// GİB hatalı kodda formu sildiğinde şifre en çok bu kadar yeniden yazılır: her deneme GİB'de başarısız giriş sayılabilir.
const MAX_REFILLS = 2;

const $ = (id) => document.getElementById(id);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toLocaleDateString("sv-SE");
let running = false;
let stopped = false;
let usedStored = false;

function status(text, isError = false) {
  $("status").textContent = text;
  $("status").className = isError ? "error" : "";
}

function log(name, result) {
  const tr = document.createElement("tr");
  for (const v of [name, result]) tr.appendChild(Object.assign(document.createElement("td"), { textContent: v }));
  $("log").prepend(tr);
  $("log-table").hidden = false;
}

/** Chrome's own (English) failures in words the user can act on; never anything that could carry a password. */
function turkish(message) {
  if (/Failed to fetch|NetworkError|network/i.test(message)) return "Bağlantı kurulamadı.";
  if (/Cannot access|permission/i.test(message)) return "Sayfaya erişilemedi; sekmeyi yenileyip yeniden başlatın.";
  return "Beklenmeyen bir hata oldu.";
}

/** A failed list read in a scan's log: short, and what the next run does about it. */
function scanProblem(r) {
  if (r.error === "login") return "Giriş yapıldı ama oturum okunamadı; yeniden başlatınca tekrar denenir.";
  if (r.error === "http" && (r.status === 401 || r.status === 403)) return "Bu hesabın e-Tebligat yetkisi yok.";
  if (r.error === "http" && r.status >= 500) return "GİB yanıt vermedi; yeniden başlatınca tekrar denenir.";
  if (r.error === "network") return "GİB'e ulaşılamadı; yeniden başlatınca tekrar denenir.";
  return AccountieGib.problem(r);
}

/** Luca'nın GİB Şirket ekranındaki satırlar; ekran hiçbir Luca sekmesinde açık değilse null. */
async function lucaRows() {
  for (const tab of await chrome.tabs.query({ url: "https://*.luca.com.tr/*" })) {
    const target = { tabId: tab.id, allFrames: true };
    const frames = await chrome.scripting.executeScript({ target, files: ["gib-login.js"] })
      .then(() => chrome.scripting.executeScript({ target, func: () => globalThis.AccountieGibLogin.lucaRows() }))
      .catch(() => []);
    const hit = frames.find((f) => Array.isArray(f.result));
    if (hit) return hit.result;
  }
  return null;
}

async function accountie(path, token, init = {}) {
  const res = await fetch(APP_ORIGIN + path, { ...init, credentials: "omit", headers: { authorization: `Bearer ${token}`, ...(init.body ? { "content-type": "application/json" } : {}) } });
  if (res.status === 401) throw Object.assign(new Error("Anahtar geçersiz veya süresi dolmuş. Accountie'den yeni anahtar alıp eklenti penceresine girin."), { fatal: true, said: true });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(body?.error || "Accountie'ye ulaşılamadı."), { said: true });
  return body;
}

const tabClosed = () => Object.assign(new Error("Dijital Vergi Dairesi sekmesi kapandı; tarama durduruldu. Taramayı sürdür'e basın."), { fatal: true, said: true });

/** The GİB tab, or a fatal error when it was closed (no firm waits on a tab that is gone). */
async function gibTab(tabId) {
  return chrome.tabs.get(tabId).catch(() => { throw tabClosed(); });
}

/** Runs one of gib-login.js's or gib-notices.js's functions in the GİB tab, the file injected first (a page load drops it). */
async function inGib(tabId, file, func, args = []) {
  await gibTab(tabId);
  const target = { tabId };
  await chrome.scripting.executeScript({ target, files: [file] });
  const [r] = await chrome.scripting.executeScript({ target, func, args });
  return r?.result;
}

/** The same call, but a page in the middle of loading answers `fallback`; a closed tab still stops the run. */
const tryGib = (tabId, file, func, fallback, args) => inGib(tabId, file, func, args).catch((e) => { if (e.fatal) throw e; return fallback; });

/** Waits until the GİB tab has finished loading. */
async function loaded(tabId, ms = 30_000) {
  const until = Date.now() + ms;
  while (Date.now() < until && !stopped) {
    if ((await gibTab(tabId)).status === "complete") return true;
    await pause(300);
  }
  return false;
}

/** The GİB tab on an empty login form: the previous firm's session key removed and the login page loaded once, from scratch. */
async function loginForm(tabId) {
  const left = await tryGib(tabId, "gib-login.js", () => globalThis.AccountieGibLogin.goToLogin(), null);
  // "Taramayı durdur" pressed on the note while the last firm's list was read.
  if (left?.stop) { stopped = true; return false; }
  const until = Date.now() + 30_000;
  while (Date.now() < until && !stopped) {
    await pause(500);
    if (!(await loaded(tabId))) return false;
    if (await tryGib(tabId, "gib-login.js", () => globalThis.AccountieGibLogin.loginReady(), false)) return true;
  }
  return false;
}

const fill = (tabId, login, text) => tryGib(tabId, "gib-login.js", (u, p, t) => globalThis.AccountieGibLogin.fillLogin(u, p, t), false, [login.user, login.pass, text]);

/**
 * One firm's stored login, unsealed by Accountie for this firm only (it needs the user's approval from the site and is logged
 * there). Kept by the caller for this firm's form and dropped after. A refusal that stops every firm (no approval, too fast,
 * switched off) ends the run.
 */
async function storedLogin(token, lucaId) {
  const res = await fetch(`${APP_ORIGIN}/api/extension/gib-logins/read`, {
    method: "POST", credentials: "omit", cache: "no-store",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ lucaId }),
  });
  const body = await res.json().catch(() => null);
  if (res.ok && typeof body?.username === "string" && typeof body?.password === "string") return { user: body.username, pass: body.password };
  const said = typeof body?.error === "string" ? body.error : "Accountie'den GİB girişi alınamadı.";
  if (res.status === 404 || res.status === 409) return { problem: said };
  throw Object.assign(new Error(said), { fatal: true, said: true });
}

/** Waits for the user to log in ("in"), skip ("skip") or stop; GİB clearing the form is filled again, a few times at most. */
async function waitForLogin(tabId, login, text, head) {
  const until = Date.now() + WAIT_MS;
  let refills = 0;
  while (Date.now() < until) {
    if (stopped) return "stopped";
    const state = await tryGib(tabId, "gib-login.js", () => globalThis.AccountieGibLogin.loginState(), "waiting");
    if (state === "stop") { stopped = true; return "stopped"; }
    if (state === "in" || state === "skip") return state;
    if (state === "refill") {
      if (refills >= MAX_REFILLS) return "refused";
      refills++;
      await fill(tabId, login, `Accountie · ${head}: Kod ya da şifre hatalı, form yeniden dolduruldu (kalan deneme ${MAX_REFILLS - refills + 1}). Yeni kodu yazıp Giriş Yap'a basın.`);
    }
    await pause(POLL_MS);
  }
  return "timeout";
}

/**
 * Today's scan as kept on this computer: firms read, firms skipped or not logged in (with the reason, said in the summary), and
 * the new notices found. Firm names and counts only; never a password.
 */
async function scanned() {
  const { tebligatScan: s } = await chrome.storage.local.get("tebligatScan");
  if (s?.day !== today()) return { ids: [], failed: [], fresh: [] };
  return { ids: s.ids ?? [], failed: (s.failed ?? []).filter((x) => x && typeof x === "object"), fresh: s.fresh ?? [] };
}
async function remember(change) {
  const s = await scanned();
  const failed = change.failed ? [...s.failed.filter((x) => x.id !== change.failed.id), change.failed] : s.failed;
  await chrome.storage.local.set({ tebligatScan: { day: today(), ids: [...new Set([...s.ids, ...(change.id ? [change.id] : [])])], failed, fresh: [...s.fresh, ...(change.fresh ? [change.fresh] : [])] } });
}

/** One firm: fill, wait for the user's login, read the list, check it is that firm's, send. */
async function scanFirm(tabId, f, token, head) {
  if (stopped) return { line: "Durduruldu.", stopped: true };
  if (!(await loginForm(tabId))) return stopped ? { line: "Durduruldu.", stopped: true } : { line: "Dijital Vergi Dairesi giriş sayfası açılmadı; yeniden başlatınca tekrar denenir." };
  const text = `Accountie · ${head}: Doğrulama kodunu yazıp Giriş Yap'a basın. GİB şifre hatalı derse "Bu firmayı atla"ya basın. Chrome şifreyi kaydetmeyi sorarsa "Hiçbir zaman" deyin.`;
  // Stored logins come from Accountie one firm at a time, just before the form; Luca's own screen gives them otherwise.
  const login = f.stored ? await storedLogin(token, f.lucaId) : { user: f.user, pass: f.pass };
  if (login.problem) return { line: login.problem, failed: true };
  if (!(await fill(tabId, login, text))) return { line: "Giriş formu bulunamadı; GİB sayfası değişmiş olabilir." };
  await chrome.tabs.update(tabId, { active: true });
  status(`${head}: GİB sekmesinde doğrulama kodunu yazıp Giriş Yap'a basın.`);
  const state = await waitForLogin(tabId, login, text, head);
  login.user = login.pass = f.pass = "";
  if (state === "stopped") return { line: "Durduruldu.", stopped: true };
  if (state === "skip") return { line: "Atlandı; bugün yeniden sorulmaz.", failed: true };
  if (state === "refused") return { line: `${MAX_REFILLS + 1} denemede giriş olmadı; bugün yeniden sorulmaz. Kod doğruysa Luca'da şifreyi kontrol edin.`, failed: true };
  if (state === "timeout") { stopped = true; return { line: "5 dakika giriş yapılmadı; tarama durduruldu.", stopped: true }; }
  await tryGib(tabId, "gib-login.js", (t) => globalThis.AccountieGibLogin.showNote(t), null, [`Accountie · ${head}: okunuyor, birazdan sıradaki firma gelecek.`]);
  status(`${head}: tebligat listesi okunuyor.`);
  // Right after the login the portal may load its own page: the read waits for it and is tried once more if it was cut off.
  let r;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await pause(1500);
    await loaded(tabId);
    r = await tryGib(tabId, "gib-notices.js", () => globalThis.AccountieGib.readNotices().catch(() => ({ error: "shape", step: "betik" })), { error: "shape", step: "betik" });
    if (!(r?.error === "shape" && r.step === "betik")) break;
  }
  if (!r || r.error) return { line: scanProblem(r ?? { error: "network" }) };
  // The session must be this firm's: a login with another firm's code must never be saved as this one.
  if (!AccountieGibLogin.sameFirm(r.idNumbers, f.taxNumber)) return { line: "Girilen hesap bu firmanın değil; hiçbir şey kaydedilmedi. Luca GİB Şirket ekranında bu firmanın kullanıcı kodunu kontrol edin.", failed: true };
  const saved = await accountie("/api/extension/notices", token, { method: "POST", body: JSON.stringify({ idNumbers: r.idNumbers, notices: r.notices }) });
  const fresh = saved.fresh ? `${saved.firm ?? f.name}: ${saved.fresh} yeni tebligat` : null;
  await remember({ id: f.lucaId, fresh });
  return { line: saved.fresh ? `${saved.fresh} yeni tebligat` : "Yeni tebligat yok", ok: true, fresh: saved.fresh ?? 0 };
}

/** The day's result: three counts, the new notices and the firms not read, with why. All of today, not only this run. */
function summary(day, scannedToday) {
  const list = (items, empty) => (items.length ? items : [empty]).map((t) => Object.assign(document.createElement("li"), { textContent: t }));
  const freshTotal = day.fresh.reduce((n, t) => n + (Number(/: (\d+) yeni/.exec(t)?.[1]) || 0), 0);
  $("n-scanned").textContent = String(scannedToday);
  $("n-fresh").textContent = String(freshTotal);
  $("n-failed").textContent = String(day.failed.length);
  $("fresh").replaceChildren(...list(day.fresh, "Yeni tebligat yok."));
  $("failed-title").textContent = `Bugün taranamayan firmalar (${day.failed.length})`;
  $("failed").replaceChildren(...list(day.failed.map((x) => `${x.name}: ${x.line}`), "Yok."));
  $("retry").hidden = !day.failed.length;
  $("summary").hidden = false;
  return { freshTotal };
}

/** The bar over the log while a run goes: which firm, how many of how many. */
function progress(i, n, name) {
  $("progress").hidden = false;
  $("progress-firm").textContent = name;
  $("progress-count").textContent = `${i}/${n}`;
  $("progress-bar").max = n;
  $("progress-bar").value = i - 1;
  document.title = `${i}/${n} · e-Tebligat taraması`;
}

async function run() {
  const { token } = await chrome.storage.local.get("token");
  if (!token) return status("Önce eklenti penceresini açıp Accountie anahtarını girin.", true);
  const before = await scanned();
  // Logins stored on a firm import (sealed in Accountie) first; without them, Luca's GİB Şirket screen, read now.
  const stored = await accountie("/api/extension/gib-logins", token);
  let p;
  usedStored = false;
  if (stored.enabled && stored.firms?.length) {
    usedStored = true;
    if (!stored.scanUntil) return status("Tarama onaylı değil. Accountie'de e-Tebligatlar sayfasında Taramayı onayla'ya basın (bu bilgisayardan, 4 saat geçerli), sonra yeniden başlatın.", true);
    p = AccountieGibLogin.plan(stored.firms.map((f) => ({ lucaId: f.lucaId, name: f.name, stored: true })), stored.firms, before.ids, before.failed.map((x) => x.id));
  } else {
    status("Luca'daki GİB giriş bilgileri okunuyor.");
    const rows = await lucaRows();
    if (!rows) return status("Kayıtlı GİB girişi yok ve Luca'da GİB Şirket ekranı açık değil. Firmaları Luca'dan çekin ya da GİB Şirket'i açıp yeniden başlatın.", true);
    const { firms } = await accountie("/api/extension/firms", token);
    p = AccountieGibLogin.plan(rows, firms ?? [], before.ids, before.failed.map((x) => x.id));
  }
  const names = (list) => `${list.slice(0, 10).join(", ")}${list.length > 10 ? "…" : ""}`;
  if (p.noCredentials.length) log(`${p.noCredentials.length} firma`, `Luca'da GİB kullanıcı kodu ya da şifresi boş: ${names(p.noCredentials)}`);
  if (p.notInAccountie.length) log(`${p.notInAccountie.length} firma`, "Accountie'de yok ya da vergi numarası bilinmiyor; önce Luca'dan firmaları çekin.");
  if (p.sameTax.length) log(`${p.sameTax.length} firma`, `Vergi numarası başka bir firmayla aynı; bir kez taranır: ${names(p.sameTax)}`);
  const earlier = [p.done && `${p.done} firma tarandı`, p.failed && `${p.failed} firmada giriş olmadı`].filter(Boolean).join(", ");
  if (!p.todo.length) { summary(before, before.ids.length); return status(earlier ? `Bugün taranacak firma kalmadı: ${earlier}.` : "Taranacak firma yok.", !earlier); }
  if (earlier) log("Bugün", `Daha önce ${earlier}; bunlar atlandı. ${p.todo.length} firma kaldı.`);

  const tab = (await chrome.tabs.query({ url: `${GIB_ORIGIN}/*` }))[0] ?? (await chrome.tabs.create({ url: LOGIN_URL, active: false }));
  let ok = 0, notRead = 0;
  for (const [i, f] of p.todo.entries()) {
    if (stopped) break;
    const head = `${i + 1}/${p.todo.length} · ${f.name}`;
    progress(i + 1, p.todo.length, f.name);
    status("");
    let result;
    try { result = await scanFirm(tab.id, f, token, head); } catch (e) {
      if (e.fatal) { status(e.message, true); break; }
      result = { line: e.said ? e.message : turkish(String(e?.message ?? "")) };
    }
    log(f.name, result.line);
    if (result.ok) { ok++; continue; }
    if (result.stopped) continue;
    notRead++;
    // A skip, a refused login or another firm's account is not asked again today; a passing error (GİB down) is.
    if (result.failed) await remember({ failed: { id: f.lucaId, name: f.name, line: result.line } });
  }
  $("progress-bar").value = ok + notRead;
  // The last firm's session key, password and note leave the tab: the login page is loaded again, empty.
  await tryGib(tab.id, "gib-login.js", () => globalThis.AccountieGibLogin.goToLogin(), null).catch(() => {});
  // The approval ends with the scan: no stored login can be opened in the hours it had left.
  if (usedStored) await fetch(`${APP_ORIGIN}/api/extension/gib-scan`, { method: "DELETE", credentials: "omit", headers: { authorization: `Bearer ${token}` } }).catch(() => {});
  document.title = "e-Tebligat taraması";
  const me = await chrome.tabs.getCurrent();
  if (me?.id) await chrome.tabs.update(me.id, { active: true }).catch(() => {});
  const day = await scanned();
  const { freshTotal } = summary(day, day.ids.length);
  const tally = `bu turda ${ok} firma tarandı${notRead ? `, ${notRead} firma taranamadı` : ""}; bugün toplam ${freshTotal} yeni tebligat.`;
  if ($("status").className === "error") status(`${$("status").textContent} Durum: ${tally}`, true);
  else status(stopped ? `Tarama durduruldu: ${tally} Kaldığı yerden devam etmek için ${usedStored ? "Accountie'de taramayı yeniden onaylayıp " : ""}Taramayı sürdür'e basın.` : `Tarama bitti: ${tally} Ayrıntılar Accountie'de e-Tebligat sayfasında.`);
}

// One run at a time: a second scan page would drive the same GİB tab against this one.
const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel("accountie-tebligat") : null;
let elsewhere = false;
if (channel) {
  channel.onmessage = (e) => {
    if (e.data === "ping" && running) channel.postMessage("busy");
    if (e.data === "busy") elsewhere = true;
  };
}
const busyElsewhere = async () => {
  if (!channel) return false;
  elsewhere = false;
  channel.postMessage("ping");
  await pause(300);
  return elsewhere;
};

$("start").addEventListener("click", async () => {
  if (running) return;
  // Asked at the click (Chrome needs the user's gesture): the extension may only touch Dijital Vergi Dairesi once allowed here.
  const allowed = await chrome.permissions.request({ origins: [`${GIB_ORIGIN}/*`] }).catch(() => false);
  if (!allowed) return status("Dijital Vergi Dairesi izni verilmedi; tarama başlatılmadı.", true);
  if (await busyElsewhere()) return status("Tarama başka bir sekmede sürüyor; o sekmeyi kullanın.", true);
  running = true;
  stopped = false;
  $("start").disabled = true;
  $("retry").hidden = true;
  $("stop").hidden = false;
  $("log").replaceChildren();
  $("log-table").hidden = true;
  $("summary").hidden = true;
  await run().catch((e) => status(e?.said ? e.message : turkish(String(e?.message ?? "")), true));
  running = false;
  $("progress").hidden = true;
  $("start").disabled = false;
  $("start").textContent = stopped ? "Taramayı sürdür" : "Taramayı başlat";
  $("stop").hidden = true;
  $("start").focus?.();
});
$("retry").addEventListener("click", async () => {
  const s = await scanned();
  await chrome.storage.local.set({ tebligatScan: { day: today(), ids: s.ids, failed: [], fresh: s.fresh } });
  $("retry").hidden = true;
  $("failed-title").textContent = "Bugün taranamayan firmalar (0)";
  $("failed").replaceChildren();
  $("n-failed").textContent = "0";
  status("Bugün atlanan firmalar bir sonraki taramada yeniden sorulacak. Taramayı başlat'a basın.");
});
$("stop").addEventListener("click", () => { stopped = true; status("Durduruluyor."); });
window.addEventListener("beforeunload", (e) => { if (running) e.preventDefault(); });
