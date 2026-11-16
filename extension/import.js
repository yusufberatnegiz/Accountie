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

async function run() {
  const { token } = await chrome.storage.local.get("token");
  if (!token) return status("Önce eklenti penceresini açıp Accountie anahtarını girin.", true);
  const { filledIds = [] } = await chrome.storage.local.get("filledIds");
  if (filledIds.length) return status("Luca'da yazılmış ama kaydedilmemiş fiş var. Önce Luca'da Kaydet'e basıp eklenti penceresinde Luca'da kaydettim'e basın, sonra firmaları çekin.", true);
  const luca = await lucaFrame();
  if (!luca) return status("Açık Luca sekmesi bulunamadı. Luca'ya girip ana ekranı açın, sonra Başlat'a basın.", true);
  const original = AccountieLuca.selected(luca.list, luca.sirket, luca.donem);
  if (!original) return status("Luca'da şu an açık olan firma okunamadı. Hiçbir şey değiştirilmedi.", true);
  const firms = AccountieLuca.firmsToImport(luca.list, YEAR);
  if (!firms.length) return status("Luca'da dönemi olan firma bulunamadı.", true);
  // Firms whose last period ended before last year (closed) are left out; said in the result, not dropped silently.
  const closed = luca.list.length - firms.length;

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

$("start").addEventListener("click", async () => {
  if (running) return;
  running = true;
  stopped = false;
  $("start").disabled = true;
  $("stop").hidden = false;
  await run().catch((e) => status(e.message, true));
  running = false;
  $("start").disabled = false;
  $("stop").hidden = true;
});
$("stop").addEventListener("click", () => { stopped = true; status("Durduruluyor; açık firma geri alınacak."); });
// Sürerken kapatılırsa Luca oturumu başka firmada kalır.
window.addEventListener("beforeunload", (e) => { if (running) e.preventDefault(); });
