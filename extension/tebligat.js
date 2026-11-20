/* global chrome, AccountieGibLogin, AccountieGib */
// Bütün firmaların e-Tebligat taraması: Luca'nın GİB Şirket ekranından giriş bilgileri okunur (gib-login.js), her firma için
// Dijital Vergi Dairesi giriş formu doldurulur, doğrulama kodunu kullanıcı yazar, giriş olunca liste okunur (gib-notices.js) ve
// Accountie'ye gönderilir. Şifreler yalnız bu sayfanın belleğindedir: chrome.storage'a, durum metnine ve Accountie'ye gitmez.
const APP_ORIGIN = "https://accountie.app"; // popup.js ile aynı
const GIB_ORIGIN = `https://${AccountieGib.GIB_HOST}`;
const LOGIN_URL = `${GIB_ORIGIN}${AccountieGibLogin.LOGIN_PATH}`;
// Kullanıcının doğrulama kodunu yazması için firma başına süre; dolarsa o firma atlanır.
const WAIT_MS = 5 * 60_000;
const POLL_MS = 1500;

const $ = (id) => document.getElementById(id);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toLocaleDateString("sv-SE");
let running = false;
let stopped = false;

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
  if (/No tab with id|tab was closed/i.test(message)) return "Dijital Vergi Dairesi sekmesi kapandı.";
  if (/Cannot access|permission/i.test(message)) return "Sayfaya erişilemedi; sekmeyi yenileyip yeniden başlatın.";
  return "Beklenmeyen bir hata oldu.";
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

/** Runs one of gib-login.js's or gib-notices.js's functions in the GİB tab, the file injected first (a page load drops it). */
async function inGib(tabId, file, func, args = []) {
  const target = { tabId };
  await chrome.scripting.executeScript({ target, files: [file] });
  const [r] = await chrome.scripting.executeScript({ target, func, args });
  return r?.result;
}

/** The GİB tab on an empty login form: the previous firm's session key removed, the login page loaded. */
async function loginForm(tabId) {
  for (let i = 0; i < 20 && !stopped; i++) {
    const ready = await inGib(tabId, "gib-login.js", () => globalThis.AccountieGibLogin.resetSession()).catch(() => false);
    if (ready) return true;
    await pause(1000);
  }
  return false;
}

/** Waits for the user to log in ("in"), skip the firm ("skip"), stop the run, or the time to run out ("timeout"). */
async function waitForLogin(tabId) {
  const until = Date.now() + WAIT_MS;
  while (Date.now() < until) {
    if (stopped) return "stopped";
    const state = await inGib(tabId, "gib-login.js", () => globalThis.AccountieGibLogin.loginState()).catch(() => "waiting");
    if (state === "in" || state === "skip") return state;
    await pause(POLL_MS);
  }
  return "timeout";
}

async function scanned() {
  const { tebligatScan } = await chrome.storage.local.get("tebligatScan");
  return tebligatScan?.day === today() ? tebligatScan.ids : [];
}
const markScanned = async (lucaId) => chrome.storage.local.set({ tebligatScan: { day: today(), ids: [...new Set([...(await scanned()), lucaId])] } });

/** One firm: fill, wait for the user's login, read the list, check it is that firm's, send. The result line for the log. */
async function scanFirm(tabId, f, token) {
  if (!(await loginForm(tabId))) return { line: "Dijital Vergi Dairesi giriş sayfası açılmadı." };
  const filled = await inGib(tabId, "gib-login.js", (u, p, n) => globalThis.AccountieGibLogin.fillLogin(u, p, n), [f.user, f.pass, f.name]).catch(() => false);
  if (!filled) return { line: "Giriş formu bulunamadı; GİB sayfası değişmiş olabilir." };
  await chrome.tabs.update(tabId, { active: true });
  status(`${f.name}: GİB sekmesinde doğrulama kodunu yazıp Giriş Yap'a basın.`);
  const state = await waitForLogin(tabId);
  if (state === "stopped") return { line: "Durduruldu." };
  if (state === "skip") return { line: "Atlandı." };
  if (state === "timeout") return { line: "5 dakika içinde giriş yapılmadı; atlandı." };
  status(`${f.name}: tebligat listesi okunuyor.`);
  const r = await inGib(tabId, "gib-notices.js", () => globalThis.AccountieGib.readNotices().catch(() => ({ error: "shape", step: "betik" })))
    .catch(() => ({ error: "shape", step: "betik" }));
  if (!r || r.error) return { line: AccountieGib.problem(r ?? { error: "network" }) };
  // The session must be this firm's: a login with another firm's code must never be saved as this one.
  if (!AccountieGibLogin.sameFirm(r.idNumbers, f.taxNumber)) return { line: "Açılan GİB oturumu bu firmanın vergi numarasına ait değil; hiçbir şey kaydedilmedi." };
  const saved = await accountie("/api/extension/notices", token, { method: "POST", body: JSON.stringify({ idNumbers: r.idNumbers, notices: r.notices }) });
  await markScanned(f.lucaId);
  return { line: saved.fresh ? `${saved.fresh} yeni tebligat` : "Yeni tebligat yok", fresh: saved.fresh, firm: saved.firm };
}

async function run() {
  const { token } = await chrome.storage.local.get("token");
  if (!token) return status("Önce eklenti penceresini açıp Accountie anahtarını girin.", true);
  status("Luca'daki GİB giriş bilgileri okunuyor.");
  const rows = await lucaRows();
  if (!rows) return status("Luca'da GİB Şirket ekranı açık değil. Ser.Mes.Defteri → Beyannameler → Toplu Beyanname → GİB Şirket'i açıp yeniden başlatın.", true);
  const { firms } = await accountie("/api/extension/firms", token);
  const p = AccountieGibLogin.plan(rows, firms ?? [], await scanned());
  if (p.noCredentials.length) log(`${p.noCredentials.length} firma`, `Luca'da GİB kullanıcı kodu ya da şifresi boş: ${p.noCredentials.slice(0, 10).join(", ")}${p.noCredentials.length > 10 ? "…" : ""}`);
  if (p.notInAccountie.length) log(`${p.notInAccountie.length} firma`, "Accountie'de yok ya da vergi numarası bilinmiyor; önce Luca'dan firmaları çekin.");
  if (!p.todo.length) return status(p.done ? `Bugün bütün firmalar tarandı (${p.done}).` : "Taranacak firma yok.", !p.done);

  const tab = (await chrome.tabs.query({ url: `${GIB_ORIGIN}/*` }))[0] ?? (await chrome.tabs.create({ url: LOGIN_URL, active: false }));
  const fresh = [];
  let i = 0;
  for (const f of p.todo) {
    if (stopped) break;
    i++;
    status(`${i}/${p.todo.length}: ${f.name}`);
    let result;
    try { result = await scanFirm(tab.id, f, token); } catch (e) {
      if (e.fatal) { status(e.message, true); break; }
      result = { line: e.said ? e.message : turkish(String(e?.message ?? "")) };
    }
    log(f.name, result.line);
    if (result.fresh) fresh.push(`${result.firm ?? f.name}: ${result.fresh} yeni tebligat`);
  }
  // The last firm's session key leaves the tab too.
  await inGib(tab.id, "gib-login.js", () => globalThis.AccountieGibLogin.resetSession()).catch(() => {});
  const me = await chrome.tabs.getCurrent();
  if (me?.id) await chrome.tabs.update(me.id, { active: true }).catch(() => {});
  $("fresh").replaceChildren(...(fresh.length ? fresh : ["Önceki taramada olmayan tebligat yok."]).map((t) => Object.assign(document.createElement("li"), { textContent: t })));
  $("summary").hidden = false;
  if ($("status").className !== "error") status(`${stopped ? "Durduruldu" : "Tarama bitti"}: ${i} firma. Ayrıntılar Accountie'de e-Tebligat sayfasında.`);
}

$("start").addEventListener("click", async () => {
  if (running) return;
  // Asked at the click (Chrome needs the user's gesture): the extension may only touch Dijital Vergi Dairesi once allowed here.
  const allowed = await chrome.permissions.request({ origins: [`${GIB_ORIGIN}/*`] }).catch(() => false);
  if (!allowed) return status("Dijital Vergi Dairesi izni verilmedi; tarama başlatılmadı.", true);
  running = true;
  stopped = false;
  $("start").disabled = true;
  $("stop").hidden = false;
  $("log").replaceChildren();
  $("summary").hidden = true;
  await run().catch((e) => status(e?.said ? e.message : turkish(String(e?.message ?? "")), true));
  running = false;
  $("start").disabled = false;
  $("stop").hidden = true;
});
$("stop").addEventListener("click", () => { stopped = true; status("Durduruluyor."); });
window.addEventListener("beforeunload", (e) => { if (running) e.preventDefault(); });
