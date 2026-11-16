/* global chrome, AccountieLuca, sirketDonem */
// İlk kurulum: Luca'daki firmaları ve hesap planlarını okuyup Accountie'ye gönderir. Uzun sürer, o yüzden açılır pencerede
// değil kendi sekmesinde çalışır. Luca'ya dokunan her şey luca-import.js içindedir.
const APP_ORIGIN = "https://accountie.app"; // popup.js ile aynı
const YEAR = String(new Date().getFullYear());
const MAX_ERRORS_IN_A_ROW = 5;

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
  if (!res.ok) throw new Error("Accountie kaydedemedi.");
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

  await chrome.scripting.executeScript({ target: luca.target, files: ["luca-import.js"] });
  // 8: Luca's session numbers are trusted only if, on the firm open now, they are the ones the firm list gives it.
  const pre = await chrome.scripting.executeScript({ target: luca.target, func: () => globalThis.AccountieLuca.probe().catch(() => null) }).then(([r]) => r?.result, () => null);
  const verifyIds = !!pre?.ids?.sirket && pre.ids.sirket === String(original.lucaId);
  // The Kurulum page asks the background whether a run is going (background.js importStatus); a stale beat means it ended.
  const beat = () => chrome.storage.local.set({ importingAt: Date.now() }).catch(() => {});
  await beat();
  // 7: kept beating while one firm takes long, and a lock that stays until Luca is back on the first firm (popup.js lucaTab).
  const ticker = setInterval(beat, 20_000);
  await chrome.storage.local.set({ lucaAway: original.shortName });
  let done = 0;
  let failed = 0;
  let errorsInARow = 0;
  let last = "";
  try {
    for (const [i, f] of firms.entries()) {
      if (stopped) break;
      status(`${i + 1}/${firms.length}: ${f.shortName} okunuyor.`);
      await beat();
      try {
        const [{ result }] = await chrome.scripting.executeScript({
          target: luca.target,
          args: [f, verifyIds], func: (firm, verify) => globalThis.AccountieLuca.readFirm(firm, verify).then((ok) => ({ ok }), (e) => ({ error: e.message })),
        });
        if (!result?.ok) throw new Error(result?.error ?? "Luca sekmesine ulaşılamadı.");
        // Art arda aynı firma geliyorsa Luca firmayı değiştirmiyordur: yanlış plan kaydetmek yerine dur.
        const id = `${result.ok.taxNumber}|${result.ok.name}`;
        if (id === last && !result.ok.verified) throw Object.assign(new Error("Luca aynı firmayı iki kez verdi; firma değişmiyor."), { fatal: true });
        last = id;
        const { verified, ...firm } = result.ok;
        const saved = await send(token, firm);
        done++;
        errorsInARow = 0;
        log(result.ok.name, `${saved.accounts} hesap${saved.created ? ", yeni firma" : ""}`);
      } catch (e) {
        failed++;
        log(f.shortName, e.message);
        // A firm Luca will not open or that has no plan is skipped and the run goes on; any other error counts toward stopping.
        const firmOnly = /bu firmaya geçmedi|hesap planı boş/.test(e.message);
        if (!firmOnly) errorsInARow++;
        if (e.fatal || errorsInARow >= MAX_ERRORS_IN_A_ROW) {
          status(e.fatal ? e.message : `Art arda ${MAX_ERRORS_IN_A_ROW} hata; Luca oturumu kapanmış olabilir. Durduruldu. Son hata: ${e.message}`, true);
          break;
        }
      }
      await pause(250);
    }
  } finally {
    // Luca'nın kendi seçicisinin yaptığı gibi: çerçeveyi ilk firmaya götür ki oturum ve ekran aynı firmayı göstersin.
    const back = await chrome.scripting.executeScript({ target: luca.target, args: [original, verifyIds], func: (o, v) => globalThis.AccountieLuca.switchBack(o, v) }).then(([r]) => r?.result === true, () => false);
    // The write lock lifts only once Luca is shown to be back on the first firm; otherwise the popup asks first (lucaAway).
    clearInterval(ticker);
    await chrome.storage.local.remove(back ? ["importingAt", "lucaAway"] : ["importingAt"]).catch(() => {});
    const tail = back ? `Luca ${original.shortName} firmasına döndürüldü.` : `Luca'nın ilk firmaya döndüğü doğrulanamadı: Luca'da ${original.shortName} firmasını yeniden seçin.`;
    const head = `${done} firma kaydedildi${failed ? `, ${failed} firma atlandı` : ""}.`;
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
