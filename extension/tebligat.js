/* global chrome, AccountieGibLogin, AccountieGib */
// Luca'dan firma çekilirken kaydedilen GİB girişleri, kullanıcının onayıyla Accountie'den firma firma açılır.
// Dijital Vergi Dairesi'nde girişten sonra liste okunur ve Accountie'ye gönderilir. Zarf açılmaz, belge indirilmez.
// Bir giriş yalnız o firmanın formu için bellekte durur: chrome.storage'a, durum metnine ve tebligat isteğine hiç girmez.
const APP_ORIGIN = "https://accountie.app"; // popup.js ile aynı
const NOTICES_URL = `${APP_ORIGIN}/panel/tebligatlar`;
const COMPLETED_SCAN_URL = `${NOTICES_URL}?tarama=tamamlandi`;
const GIB_ORIGIN = `https://${AccountieGib.GIB_HOST}`;
const GIB_PERMISSION = { origins: [`${GIB_ORIGIN}/*`] };
const LOGIN_URL = `${GIB_ORIGIN}${AccountieGibLogin.LOGIN_PATH}`;

const MAX_OCR_ATTEMPTS = 3;

const $ = (id) => document.getElementById(id);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toLocaleDateString("sv-SE");
let running = false;
let stopped = false;
let activeGrant = null;
let launchUntil = null;

/** Ends the approval in Accountie once the stored logins are no longer needed (done, stopped, failed, or this page closing). */
async function endGrant(keepalive = false) {
  if (!activeGrant) return;
  const { token, until } = activeGrant;
  activeGrant = null;
  await fetch(`${APP_ORIGIN}/api/extension/gib-scan?until=${encodeURIComponent(until)}`, { method: "DELETE", credentials: "omit", keepalive, headers: { authorization: `Bearer ${token}` } }).catch(() => {});
}

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

async function accountie(path, token, init = {}) {
  const res = await fetch(APP_ORIGIN + path, { ...init, credentials: "omit", headers: { authorization: `Bearer ${token}`, ...(init.body ? { "content-type": "application/json" } : {}) } });
  if (res.status === 401) throw Object.assign(new Error("Anahtar geçersiz veya süresi dolmuş. Accountie'den yeni anahtar alıp eklenti penceresine girin."), { fatal: true, said: true });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(body?.error || "Accountie'ye ulaşılamadı."), { said: true });
  return body;
}

async function requestScanGrant(token) {
  const res = await fetch(`${APP_ORIGIN}/api/extension/gib-scan`, {
    method: "POST", credentials: "include", cache: "no-store", headers: { authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => null);
  if (res.ok && typeof body?.until === "string" && Date.parse(body.until) > Date.now()) return body.until;
  const webApprovalAvailable = [401, 403, 405].includes(res.status);
  $("scan-approval").hidden = !webApprovalAvailable;
  const message = (res.status === 401
    ? "Accountie'ye giriş yapıp tarama erişimini onaylayın."
    : body?.error || `Tarama erişimi açılamadı (HTTP ${res.status}).`) +
    (webApprovalAvailable ? " Erişim onayından sonra bu sekmeye dönüp Taramayı başlat'a basın." : "");
  throw Object.assign(new Error(message), { said: true });
}

const tabClosed = () => Object.assign(new Error("Dijital Vergi Dairesi sekmesi kapandı; tarama durduruldu. Taramayı sürdür'e basın."), { fatal: true, said: true });

/** The GİB tab, or a fatal error when it was closed (no firm waits on a tab that is gone). */
async function gibTab(tabId) {
  return chrome.tabs.get(tabId).catch(() => { throw tabClosed(); });
}

async function keepTabOpen(tab, restoreTabs) {
  if (!tab?.autoDiscardable || tab.id == null) return;
  const updated = await chrome.tabs.update(tab.id, { autoDiscardable: false }).catch(() => null);
  if (updated) restoreTabs.push(() => chrome.tabs.update(tab.id, { autoDiscardable: true }));
}

async function showCompletedScan() {
  const tabs = await chrome.tabs.query({ currentWindow: true, url: `${NOTICES_URL}*` });
  const existing = tabs.find((tab) => tab.url && new URL(tab.url).pathname === "/panel/tebligatlar");
  if (existing?.id != null) {
    const updated = await chrome.tabs.update(existing.id, { url: COMPLETED_SCAN_URL, active: true }).catch(() => null);
    if (updated) return;
  }
  await chrome.tabs.create({ url: COMPLETED_SCAN_URL, active: true });
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
  const login = await storedLogin(token, f.lucaId);
  if (login.problem) return { line: login.problem, failed: true };
  if (!(await fill(tabId, login, `Accountie · ${head}: Doğrulama kodu okunuyor…`))) return { line: "Giriş formu bulunamadı; GİB sayfası değişmiş olabilir." };
  status(`${head}: doğrulama kodu okunuyor…`);

  let ocrDone = false;
  const ocrTimeout = (ms) => new Promise((r) => setTimeout(() => r({ ok: false, reason: "timeout" }), ms));
  for (let ocrAttempt = 0; ocrAttempt < MAX_OCR_ATTEMPTS && !stopped; ocrAttempt++) {
    const solved = await Promise.race([
      tryGib(tabId, "gib-login.js", () => globalThis.AccountieGibLogin.gibCaptchaSolveAndFill(), { ok: false, reason: "error" }),
      ocrTimeout(15_000),
    ]);
    if (!solved?.ok) {
      if (solved?.reason) status(`${head}: OCR başarısız (${solved.reason}).`);
      break;
    }
    await tryGib(tabId, "gib-login.js", () => globalThis.AccountieGibLogin.submitLogin(), null);
    await pause(2500);
    await loaded(tabId, 10_000);
    const s = await tryGib(tabId, "gib-login.js", () => globalThis.AccountieGibLogin.loginState(), "waiting");
    if (s === "in") { ocrDone = true; break; }
    if (s === "stop") { stopped = true; break; }
    if (s === "skip") { ocrDone = true; break; }
    if (s !== "refill") break;
    if (ocrAttempt < MAX_OCR_ATTEMPTS - 1) {
      await tryGib(tabId, "gib-login.js", () => {
        const img = document.querySelector('img[alt="captchaImg"]');
        return globalThis.AccountieGibLogin.captchaWaitNewSrc(img, img?.src);
      }, false);
      await fill(tabId, login, `Accountie · ${head}: Doğrulama kodu yeniden okunuyor (${ocrAttempt + 2}/${MAX_OCR_ATTEMPTS})…`);
    }
  }

  let state;
  if (ocrDone) {
    state = await tryGib(tabId, "gib-login.js", () => globalThis.AccountieGibLogin.loginState(), "waiting");
  } else if (!stopped) {
    login.user = login.pass = "";
    return { line: "Doğrulama kodu çözülemedi.", failed: true };
  }

  login.user = login.pass = "";
  if (stopped && !state) return { line: "Durduruldu.", stopped: true };
  if (state === "stopped") return { line: "Durduruldu.", stopped: true };
  if (state === "skip") return { line: "Atlandı; bugün yeniden sorulmaz.", failed: true };
  // Logged in: the left-behind clean-up of this page must not cut the read short.
  await tryGib(tabId, "gib-login.js", (t) => { clearTimeout(globalThis.accountieClear); return globalThis.AccountieGibLogin.showNote(t); }, null, [`Accountie · ${head}: okunuyor, birazdan sıradaki firma gelecek.`]);
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

async function run(restoreTabs, expectedUntil) {
  const { token } = await chrome.storage.local.get("token");
  if (!token) return status("Önce eklenti penceresini açıp Accountie anahtarını girin.", true);
  const before = await scanned();
  const stored = await accountie("/api/extension/gib-logins", token);
  if (!stored.enabled) return status("GİB girişlerini saklama Accountie'de etkin değil.", true);
  if (!stored.firms?.length) return status("Kayıtlı GİB girişi yok. Firmaları Luca'dan çekin, sonra yeniden deneyin.", true);
  const live = Date.parse(stored.scanUntil) > Date.now() ? stored.scanUntil : null;
  if (expectedUntil && expectedUntil !== live) return status("Tarama erişimi değişti veya süresi doldu. Yeniden başlatmak için Taramayı başlat'a basın.", true);
  activeGrant = { token, until: live ?? await requestScanGrant(token) };
  const p = AccountieGibLogin.plan(stored.firms, before.ids, before.failed.map((x) => x.id));
  const names = (list) => `${list.slice(0, 10).join(", ")}${list.length > 10 ? "…" : ""}`;
  if (p.noTax.length) log(`${p.noTax.length} firma`, `Vergi numarası eksik olan firmaları Luca'dan yeniden çekin: ${names(p.noTax)}.`);
  if (p.sameTax.length) log(`${p.sameTax.length} firma`, `Vergi numarası başka bir firmayla aynı; bir kez taranır: ${names(p.sameTax)}`);
  const earlier = [p.done && `${p.done} firma tarandı`, p.failed && `${p.failed} firmada giriş olmadı`].filter(Boolean).join(", ");
  if (!p.todo.length) { await endGrant(); summary(before, before.ids.length); return status(earlier ? `Bugün taranacak firma kalmadı: ${earlier}.` : "Taranacak firma yok.", !earlier); }
  if (earlier) log("Bugün", `Daha önce ${earlier}; bunlar atlandı. ${p.todo.length} firma kaldı.`);

  const tab = (await chrome.tabs.query({ currentWindow: true, url: `${GIB_ORIGIN}/*` }))[0] ?? (await chrome.tabs.create({ url: LOGIN_URL, active: false }));
  await keepTabOpen(tab, restoreTabs);
  let ok = 0, notRead = 0;
  for (const [i, f] of p.todo.entries()) {
    if (stopped) break;
    const head = `${i + 1}/${p.todo.length} · ${f.name}`;
    progress(i + 1, p.todo.length, f.name);
    status("");
    let result;
    let fatal = null;
    try {
      result = await scanFirm(tab.id, f, token, head);
    } catch (e) {
      if (e?.fatal) fatal = e;
      else {
        log(`${f.name} · hata`, String(e?.message ?? e));
        result = { line: e.said ? e.message : turkish(String(e?.message ?? "")) };
      }
    }
    if (fatal) { status(fatal.message, true); break; }
    log(f.name, result.line);
    if (result.ok) { ok++; continue; }
    if (result.stopped) continue;
    notRead++;
    // A skip, a refused login or another firm's account is not asked again today; a passing error (GİB down) is.
    if (result.failed) await remember({ failed: { id: f.lucaId, name: f.name, line: result.line } });
  }
  $("progress-bar").value = ok + notRead;
  // The last firm's session key, password and note leave the tab: the login page is loaded again, empty.
  const left = await tryGib(tab.id, "gib-login.js", () => globalThis.AccountieGibLogin.goToLogin(), null).catch(() => null);
  if (left?.stop) stopped = true;
  // The approval ends with the scan: no stored login can be opened in the hours it had left.
  await endGrant();
  document.title = "e-Tebligat taraması";
  const day = await scanned();
  const { freshTotal } = summary(day, day.ids.length);
  const tally = `Bu turda ${ok} firma tarandı${notRead ? `, ${notRead} firma taranamadı` : ""}. Bugün toplam ${freshTotal} yeni tebligat bulundu.`;
  if ($("status").className === "error") return status(`${$("status").textContent} ${tally}`, true);
  if (stopped) return status(`Tarama durduruldu. ${tally} Kaldığı yerden devam etmek için Taramayı sürdür'e basın.`);
  if (!ok) return status("Bu turda hiçbir firma taranamadı. Ayrıntıları firma sonuçlarında görebilirsiniz.", true);
  document.title = "Tarama tamamlandı";
  status(`Tarama tamamlandı. ${tally}`);
  $("notices-link").href = COMPLETED_SCAN_URL;
  $("notices-link").hidden = false;
  await showCompletedScan().catch(() => status(`Tarama tamamlandı. ${tally} Accountie sayfasını bağlantıdan açabilirsiniz.`));
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

async function startScan() {
  if (running) return;
  if (await busyElsewhere()) return status("Tarama başka bir sekmede sürüyor; o sekmeyi kullanın.", true);
  if (running) return;
  running = true;
  stopped = false;
  $("start").disabled = true;
  $("retry").hidden = true;
  $("stop").hidden = false;
  $("log").replaceChildren();
  $("log-table").hidden = true;
  $("summary").hidden = true;
  $("notices-link").hidden = true;
  $("scan-approval").hidden = true;
  const restoreTabs = [];
  const expectedUntil = launchUntil;
  launchUntil = null;
  try {
    await keepTabOpen(await chrome.tabs.getCurrent(), restoreTabs);
    await run(restoreTabs, expectedUntil);
  } catch (e) {
    status(e?.said ? e.message : turkish(String(e?.message ?? "")), true);
  } finally {
    await endGrant();
    await Promise.allSettled(restoreTabs.map((restore) => restore()));
    running = false;
  }
  $("progress").hidden = true;
  $("start").disabled = false;
  $("start").textContent = stopped ? "Taramayı sürdür" : "Taramayı başlat";
  $("stop").hidden = true;
  $("start").focus?.();
}

$("start").addEventListener("click", async () => {
  if (running) return;
  // Chrome only allows an optional site permission request from a user gesture.
  const allowed = await chrome.permissions.request(GIB_PERMISSION).catch(() => false);
  if (!allowed) return status("Dijital Vergi Dairesi izni verilmedi. Tarama başlatılmadı.", true);
  await startScan();
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
// Closed or crashed mid-run: the approval does not stay open for the hours it had left.
window.addEventListener("pagehide", () => { endGrant(true); });
async function initialize() {
  const hash = window.location?.hash.slice(1);
  if (!hash) return;
  const until = decodeURIComponent(hash);
  if (until.length !== 24 || !Number.isFinite(Date.parse(until))) return;
  window.history.replaceState(null, "", window.location.pathname);
  launchUntil = until;
  if (await chrome.permissions.contains(GIB_PERMISSION).catch(() => false)) {
    await startScan();
  } else {
    $("start").textContent = "GİB erişimine izin ver ve başlat";
    status("İlk tarama için Chrome’da Dijital Vergi Dairesi erişimine izin verin.");
  }
}

initialize().catch(() => status("Tarama ekranı hazırlanamadı. Sayfayı yenileyip yeniden deneyin.", true));
