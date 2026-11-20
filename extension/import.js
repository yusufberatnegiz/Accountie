/* global chrome, AccountieLuca, sirketDonem */
// İlk kurulum: Luca'daki firmaları ve hesap planlarını okuyup Accountie'ye gönderir. Uzun sürer, o yüzden açılır pencerede
// değil kendi sekmesinde çalışır. Luca'ya dokunan her şey luca-import.js içindedir.
const APP_ORIGIN = "https://accountie.app"; // popup.js ile aynı
const YEAR = String(new Date().getFullYear());
const MAX_ERRORS_IN_A_ROW = 5;
// Luca opening no firm at all is not one firm's fault: after this many in a row the run stops instead of going through hundreds.
const MAX_NOT_SWITCHED_IN_A_ROW = 10;
const IMPORT_STALE_MS = 180_000; // background.js ile aynı

/** Chrome's and fetch's own (English) failures in words the user can act on. */
function turkish(message) {
  if (/Failed to fetch|NetworkError|network/i.test(message)) return "Accountie'ye ulaşılamadı (bağlantı).";
  if (/No tab with id|tab was closed|Frame with ID|No frame/i.test(message)) return "Luca sekmesi ya da çerçevesi kapandı.";
  if (/Cannot access|permission/i.test(message)) return "Luca sayfasına erişilemedi; Luca sekmesini yenileyin.";
  return message;
}

const $ = (id) => document.getElementById(id);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let stopped = false;
let running = false;

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

/** Firma seçicinin bulunduğu Luca sekmesi ve çerçevesi, firma listesiyle birlikte. */
async function lucaFrame() {
  for (const tab of await chrome.tabs.query({ url: "https://*.luca.com.tr/*" })) {
    // Sayfanın kendi değişkeni (sirketDonem) yalnız sayfa dünyasından okunur.
    const frames = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true }, world: "MAIN",
      func: () => (typeof sirketDonem === "undefined" ? null : {
        list: Array.from(sirketDonem, (row) => Array.from(row, String)),
        sirket: document.getElementById("SirketCombo")?.value, donem: document.getElementById("DonemCombo")?.value,
      }),
    }).catch(() => []);
    const hit = frames.find((f) => f.result);
    if (hit) return { target: { tabId: tab.id, frameIds: [hit.frameId] }, ...hit.result };
  }
  return null;
}

async function send(token, firm) {
  const res = await fetch(`${APP_ORIGIN}/api/extension/firms`, {
    method: "POST", credentials: "omit", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(firm),
  });
  if (res.status === 401) throw Object.assign(new Error("Anahtar geçersiz veya süresi dolmuş. Accountie'den yeni anahtar alıp eklenti penceresine girin."), { fatal: true });
  if (res.status === 409) throw Object.assign(new Error("Accountie'de firma sınırına ulaşıldı."), { fatal: true });
  if (!res.ok) {
    // The server's own reason (a plan too big), not only that it failed.
    const why = (await res.json().catch(() => null))?.error;
    throw new Error(why ? `Accountie kaydedemedi: ${why}` : "Accountie kaydedemedi.");
  }
  return res.json();
}

/** Luca ids of the firms whose plan Accountie already has. */
async function imported(token) {
  const res = await fetch(`${APP_ORIGIN}/api/extension/firms`, { credentials: "omit", headers: { authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("Anahtar geçersiz veya süresi dolmuş. Accountie'den yeni anahtar alıp eklenti penceresine girin.");
  if (!res.ok) throw new Error("Accountie'deki firmalar okunamadı; yeniden deneyin.");
  return new Set((await res.json()).lucaIds.map(String));
}

/**
 * Every firm's Dijital Vergi Dairesi login from Luca's GİB Şirket screen, read once here so the e-Tebligat scan does not need
 * Luca open: sent to Accountie, which seals each before storing it. Kept in no variable past this function; never logged.
 * The result line for the log, or null when Accountie does not store logins.
 */
async function sendGibLogins(token, target, only) {
  // Which Accountie account the key belongs to, said before any login leaves: a key that is not the user's own shows here.
  const info = await fetch(`${APP_ORIGIN}/api/extension/gib-logins`, { credentials: "omit", headers: { authorization: `Bearer ${token}` } });
  if (!info.ok) return info.status === 503 ? null : "Accountie'ye ulaşılamadı; GİB girişleri kaydedilmedi.";
  const { account, enabled } = await info.json();
  if (!enabled) return null;
  if (!account) return "Accountie hesabı okunamadı; GİB girişleri gönderilmedi.";
  // Asked when the account is new or changed, so the question is read, not clicked through out of habit.
  const { gibAccount } = await chrome.storage.local.get("gibAccount");
  if (gibAccount !== account) {
    const ask = gibAccount
      ? `DİKKAT: Bu, daha önce onayladığınız Accountie hesabı DEĞİL.\n\nÖnceki: ${gibAccount}\nŞimdiki: ${account}\n\nLuca'daki GİB girişleri şimdiki hesaba şifreli kaydedilecek. Bu hesap sizin mi?`
      : `Luca'daki GİB girişleri şu Accountie hesabına şifreli kaydedilecek:\n\n${account}\n\nBu sizin hesabınız mı?`;
    if (!confirm(ask)) return "GİB girişleri gönderilmedi (hesap onaylanmadı).";
    await chrome.storage.local.set({ gibAccount: account });
  }
  const [r] = await chrome.scripting.executeScript({ target, files: ["gib-login.js"] })
    .then(() => chrome.scripting.executeScript({ target, func: () => globalThis.AccountieGibLogin.fetchLucaRows().catch(() => null) }))
    .catch(() => [null]);
  if (!r?.result) return "Luca'nın GİB Şirket ekranı okunamadı; GİB girişleri kaydedilmedi.";
  // Only the firms this import is about and Accountie has: no login leaves for a firm it would only drop.
  const rows = r.result.filter((x) => only.has(String(x.lucaId)) && x.user?.trim() && x.pass).map((x) => ({ lucaId: x.lucaId, username: x.user.trim(), password: x.pass }));
  r.result = null;
  let saved = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const res = await fetch(`${APP_ORIGIN}/api/extension/gib-logins`, {
      method: "PUT", credentials: "omit", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ logins: rows.slice(i, i + 200) }),
    });
    if (res.status === 503) { rows.length = 0; return null; }
    if (!res.ok) { rows.length = 0; return `GİB girişleri kaydedilemedi: ${(await res.json().catch(() => null))?.error ?? "Accountie yanıt vermedi."}`; }
    saved += (await res.json()).saved;
  }
  rows.length = 0;
  return `${saved} firmanın GİB girişi şifreli kaydedildi (e-Tebligat taraması için).`;
}

/** Removes the stored GİB logins of firms with no period this year: the scan never asks for them again. */
async function retireGibLogins(token, lucaIds) {
  for (let i = 0; i < lucaIds.length; i += 500) {
    await fetch(`${APP_ORIGIN}/api/extension/gib-logins`, {
      method: "DELETE", credentials: "omit", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ lucaIds: lucaIds.slice(i, i + 500) }),
    });
  }
}

/** `mode`: "new" reads only the firms Luca has and Accountie lacks, "one" only the firm open in Luca, "all" every firm again. */
async function run(mode) {
  const { token } = await chrome.storage.local.get("token");
  if (!token) return status("Önce eklenti penceresini açıp Accountie anahtarını girin.", true);
  const { filledIds = [] } = await chrome.storage.local.get("filledIds");
  if (filledIds.length) return status("Luca'da yazılmış ama kaydedilmemiş fiş var. Önce Luca'da Kaydet'e basıp eklenti penceresinde Luca'da kaydettim'e basın, sonra firmaları çekin.", true);
  const luca = await lucaFrame();
  if (!luca) return status("Açık Luca sekmesi bulunamadı. Luca'ya girip ana ekranı açın, sonra yeniden basın.", true);
  const original = AccountieLuca.selected(luca.list, luca.sirket, luca.donem);
  if (!original) return status("Luca'da şu an açık olan firma okunamadı. Hiçbir şey değiştirilmedi.", true);
  const open = AccountieLuca.firmsToImport(luca.list, YEAR);
  // The open firm with the period open now, even a closed one; a new firm only if Accountie has no plan for it.
  const have = mode === "new" ? await imported(token) : null;
  const firms = mode === "one" ? [original] : have ? open.filter((f) => !have.has(String(f.lucaId))) : open;
  if (!firms.length) return status(mode === "new" ? `Yeni firma yok: Luca'daki ${open.length} firmanın hepsi Accountie'de. Bir firmanın planı Luca'da değiştiyse o firmayı açıp “Yalnız açık firmayı çek”e basın.` : "Luca'da dönemi olan firma bulunamadı.", mode !== "new");
  // Firms whose last period ended before last year (closed) are left out; said in the result, not dropped silently.
  const closed = mode === "all" ? luca.list.length - open.length : 0;

  // One run at a time: another tab's run moves Luca's session too. The beat is set before anything is read from Luca.
  const { importingAt } = await chrome.storage.local.get("importingAt");
  if (typeof importingAt === "number" && Date.now() - importingAt < IMPORT_STALE_MS) return status("Başka bir sekmede firma çekme sürüyor. O bitince ya da o sekme kapanınca 3 dakika sonra yeniden deneyin.", true);
  // The Kurulum page asks the background whether a run is going (background.js importStatus); a stale beat means it ended.
  const beat = () => chrome.storage.local.set({ importingAt: Date.now() }).catch(() => {});
  await beat();
  const abort = async (text) => { await chrome.storage.local.remove("importingAt").catch(() => {}); status(text, true); };

  await chrome.scripting.executeScript({ target: luca.target, files: ["luca-import.js"] });
  // 8: Luca's session numbers are trusted only if, on the firm open now, they are the ones the firm list gives it.
  const pre = await chrome.scripting.executeScript({ target: luca.target, func: () => globalThis.AccountieLuca.probe().catch(() => null) }).then(([r]) => r?.result, () => null);
  // Without it neither the stay on the first firm nor the way back could be checked: nothing is started.
  if (!pre?.identity) return abort("Luca'daki açık firmanın bilgisi okunamadı; hiçbir firmaya geçilmedi. Luca sayfasını yenileyip yeniden başlatın.");
  // The screen's firm picker and Luca's session disagree (another tab changed firm): the first firm itself is unsure.
  if (pre.ids?.sirket && pre.ids.sirket !== String(original.lucaId)) return abort("Luca'da ekrandaki firma ile oturumdaki firma farklı (başka bir sekmede firma değişmiş olabilir). Luca sayfasını yenileyip yeniden başlatın.");
  const verifyIds = !!pre.ids?.sirket && (!pre.ids.donem || pre.ids.donem === String(original.donemId));
  // The first firm as Luca names it: the way back is checked against it, and a run that never leaves it is caught (last).
  const home = { taxNumber: pre.identity.taxNumber, name: pre.identity.name };
  // 7: kept beating while one firm takes long, and a lock that stays until Luca is back on the first firm (popup.js lucaTab).
  const ticker = setInterval(beat, 20_000);
  await chrome.storage.local.set({ lucaAway: original.shortName });
  let done = 0;
  let failed = 0;
  let errorsInARow = 0;
  let notSwitched = 0;
  // Starts as the first firm: if Luca stays there while the run asks for another, that is "the same firm twice".
  let last = `${home.taxNumber}|${home.name}`;
  let lastLucaId = String(original.lucaId);
  try {
    for (const [i, f] of firms.entries()) {
      if (stopped) break;
      status(`${i + 1}/${firms.length}: ${f.shortName} okunuyor.`);
      await beat();
      try {
        const [{ result }] = await chrome.scripting.executeScript({
          target: luca.target,
          args: [f, verifyIds, String(f.lucaId) !== lastLucaId ? last : ""],
          func: (firm, verify, avoid) => globalThis.AccountieLuca.readFirm(firm, verify, avoid).then((ok) => ({ ok }), (e) => ({ error: e.message, identity: e.identity ?? null })),
        });
        // Luca moved to this firm before the error: the next firm is compared with it.
        if (result?.identity) { last = `${result.identity.taxNumber}|${result.identity.name}`; lastLucaId = String(f.lucaId); }
        // No answer at all: the firm picker frame was reloaded (someone changed firm in Luca) and the reader went with it.
        if (!result?.ok) throw new Error(result?.error ?? "Luca'nın firma seçici çerçevesi yenilendi; çekme sürerken Luca'da firma değiştirmeyin.");
        // Art arda aynı firma geliyorsa Luca firmayı değiştirmiyordur: yanlış plan kaydetmek yerine dur.
        const id = `${result.ok.taxNumber}|${result.ok.name}`;
        if (id === last && String(f.lucaId) !== lastLucaId && !result.ok.verified) throw Object.assign(new Error("Luca aynı firmayı iki kez verdi; firma değişmiyor."), { fatal: true });
        last = id;
        lastLucaId = String(f.lucaId);
        const { verified, ...firm } = result.ok;
        const saved = await send(token, firm);
        done++;
        errorsInARow = 0;
        notSwitched = 0;
        log(result.ok.name, `${saved.accounts} hesap${saved.created ? ", yeni firma" : ""}`);
      } catch (e) {
        failed++;
        const message = turkish(e.message);
        log(f.shortName, message);
        // A firm Luca will not open or that has no plan is skipped and the run goes on; any other error counts toward stopping.
        const firmOnly = /bu firmaya geçmedi|hesap planı boş|hesaptan büyük/.test(message);
        if (!firmOnly) errorsInARow++;
        notSwitched = /bu firmaya geçmedi/.test(message) ? notSwitched + 1 : 0;
        if (e.fatal || errorsInARow >= MAX_ERRORS_IN_A_ROW || notSwitched >= MAX_NOT_SWITCHED_IN_A_ROW) {
          status(e.fatal ? message
            : notSwitched >= MAX_NOT_SWITCHED_IN_A_ROW ? `Luca art arda ${MAX_NOT_SWITCHED_IN_A_ROW} firmaya geçmedi; Luca oturumunu kontrol edin. Durduruldu.`
            : `Son firmalarda ${MAX_ERRORS_IN_A_ROW} hata; Luca oturumu kapanmış olabilir. Durduruldu. Son hata: ${message}`, true);
          break;
        }
      }
      await pause(250);
    }
    // After the firms, so each login finds its firm in Accountie. A failure here never undoes the firms read.
    if (!stopped && done > 0) {
      status("GİB girişleri kaydediliyor.");
      // Only firms with a period in this year: a closed firm's login is neither sent nor kept.
      const active = AccountieLuca.activeIds(luca.list, YEAR);
      const wanted = mode === "one" ? new Set([String(original.lucaId)]) : await imported(token).catch(() => new Set());
      const only = new Set([...wanted].filter((id) => active.has(id)));
      const said = await sendGibLogins(token, luca.target, only).catch(() => "GİB girişleri kaydedilemedi.");
      if (mode !== "one") await retireGibLogins(token, luca.list.map((row) => String(row[0])).filter((id) => !active.has(id))).catch(() => {});
      if (said) log("GİB girişleri", said);
    }
  } finally {
    // Luca'nın kendi seçicisinin yaptığı gibi: çerçeveyi ilk firmaya götür ki oturum ve ekran aynı firmayı göstersin.
    const back = await chrome.scripting.executeScript({ target: luca.target, args: [original, verifyIds, home], func: (o, v, h) => globalThis.AccountieLuca.switchBack(o, v, h) }).then(([r]) => r?.result === true, () => false);
    // The write lock lifts only once Luca is shown to be back on the first firm; otherwise the popup asks first (lucaAway).
    clearInterval(ticker);
    await chrome.storage.local.remove(back ? ["importingAt", "lucaAway"] : ["importingAt"]).catch(() => {});
    const tail = back ? `Luca ${original.shortName} firmasına döndürüldü.` : `Luca'nın ilk firmaya döndüğü doğrulanamadı: Luca'da ${original.shortName} firmasını yeniden seçin.`;
    const head = `${done} firma kaydedildi${failed ? `, ${failed} firma atlandı` : ""}${closed > 0 ? `; dönemi geçen yıldan önce bitmiş ${closed} firma (kapanmış) alınmadı` : ""}.`;
    if ($("status").className !== "error") status(`${head} ${tail}`, !back);
    else status(`${$("status").textContent} ${head} ${tail}`, true);
  }
}

const STARTS = { "start-new": "new", "start-one": "one", "start-all": "all" };
for (const [id, mode] of Object.entries(STARTS)) {
  $(id).addEventListener("click", async () => {
    if (running) return;
    running = true;
    stopped = false;
    for (const b of Object.keys(STARTS)) $(b).disabled = true;
    $("stop").hidden = false;
    await run(mode).catch((e) => status(turkish(e.message), true));
    running = false;
    for (const b of Object.keys(STARTS)) $(b).disabled = false;
    $("stop").hidden = true;
  });
}
$("stop").addEventListener("click", () => { stopped = true; status("Durduruluyor; açık firma geri alınacak."); });
// Sürerken kapatılırsa Luca oturumu başka firmada kalır.
window.addEventListener("beforeunload", (e) => { if (running) e.preventDefault(); });
