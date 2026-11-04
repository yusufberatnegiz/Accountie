/* global chrome, AccountieFill, AccountieSelectors */
// Change together with host_permissions in manifest.json (e.g. http://localhost:3000 for development).
const APP_ORIGIN = "https://accountie.vercel.app";
const LUCA_HOST = "auygs.luca.com.tr";

const $ = (id) => document.getElementById(id);
let token = "";
let receipts = [];

function status(text, isError = false) {
  $("status").textContent = text;
  $("status").className = isError ? "error" : "";
}

async function api(path, method = "GET") {
  const res = await fetch(APP_ORIGIN + path, { method, headers: { authorization: `Bearer ${token}` }, credentials: "omit" });
  if (res.status === 401) {
    await forget();
    throw new Error("Anahtar geçersiz veya süresi dolmuş. Accountie'den yeni anahtar alın.");
  }
  if (!res.ok) throw new Error("Accountie'ye ulaşılamadı. Tekrar deneyin.");
  return res.status === 204 ? null : res.json();
}

const current = () => receipts.find((r) => r.id === $("receipt").value);

function renderPreview() {
  const body = $("preview");
  body.replaceChildren();
  for (const row of current()?.rows ?? []) {
    const tr = document.createElement("tr");
    for (const v of [row.accountCode, row.debit, row.credit]) tr.appendChild(Object.assign(document.createElement("td"), { textContent: v }));
    body.appendChild(tr);
  }
  $("done").hidden = true;
}

async function load() {
  status("Fişler getiriliyor.");
  const data = await api("/api/extension/receipts");
  receipts = data.receipts;
  $("receipt").replaceChildren(...receipts.map((r) => Object.assign(document.createElement("option"), {
    value: r.id, textContent: `${r.documentNo} · ${r.documentDate} · ${r.title} · ${r.total} TL`,
  })));
  $("token-form").hidden = true;
  $("list-view").hidden = false;
  $("fill").disabled = receipts.length === 0;
  $("auto").hidden = $("auto-note").hidden = !autoReady();
  $("auto").disabled = receipts.length < 2;
  // The popup closes when the user clicks Luca's Kaydet; reopen on the filled receipt with "Luca'da kaydettim" visible.
  const { filledId } = await chrome.storage.session.get("filledId");
  const filled = receipts.some((r) => r.id === filledId);
  if (filled) $("receipt").value = filledId;
  renderPreview();
  $("done").hidden = !filled;
  status(receipts.length ? "" : "Aktarılacak onaylı fiş yok.");
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
// Auto save needs all three selectors checked on Luca's real screen (selectors.js); until then the extension only fills.
const autoReady = () => !!(AccountieSelectors.save && AccountieSelectors.saved && AccountieSelectors.newEntry);

async function lucaTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || new URL(tab.url).hostname !== LUCA_HOST) {
    status("Önce Luca'da Fiş Detayı ekranını açın, sonra eklentiyi o sekmede açın.", true);
    return null;
  }
  return tab;
}

// Runs func in every frame of the tab (Luca's grid may sit in a frame), with our scripts loaded there first.
async function inTab(tabId, func, args = []) {
  const target = { tabId, allFrames: true };
  await chrome.scripting.executeScript({ target, files: ["selectors.js", "fill.js"] });
  return (await chrome.scripting.executeScript({ target, args, func })).map((r) => r.result);
}

async function waitFor(tabId, func, ms = 15000) {
  for (let t = 0; t < ms; t += 400) {
    if ((await inTab(tabId, func)).some(Boolean)) return true;
    await pause(400);
  }
  return false;
}

/** Fills the grid, then reads it back and compares it with the receipt: row count, codes, amounts and totals. */
async function fillAndCheck(tabId, receipt) {
  const results = await inTab(tabId, (rows) => globalThis.AccountieFill.fillReceipt(document, rows, globalThis.AccountieSelectors), [receipt.rows]);
  const summary = AccountieFill.summarize(results, receipt.rows.length);
  if (!summary.gridFound) return { summary, problems: [] };
  const grids = (await inTab(tabId, () => globalThis.AccountieFill.readGrid(document, globalThis.AccountieSelectors))).filter(Boolean);
  const grid = grids.sort((a, b) => b.length - a.length)[0] ?? null;
  return { summary, problems: AccountieFill.checkGrid(receipt.rows, grid) };
}

async function fill() {
  const receipt = current();
  const tab = receipt && (await lucaTab());
  if (!tab) return;
  const { summary, problems } = await fillAndCheck(tab.id, receipt);
  if (problems.length) status(`Ekrandaki kayıt fişle aynı değil: ${problems.join(" ")} Düzeltmeden Kaydet'e basmayın.`, true);
  else status(summary.message, !summary.ok);
  // Shown after partial fills too: the user completes the missing cells by hand and still has to mark the receipt.
  $("done").hidden = !summary.gridFound;
  if (summary.gridFound) await chrome.storage.session.set({ filledId: receipt.id });
}

/** Every approved receipt in turn: fill, check, save, wait for Luca's confirmation, mark, new entry. The last one is left for the user to save. */
async function autoAll() {
  const tab = await lucaTab();
  if (!tab || !receipts.length) return;
  const queue = [...receipts];
  let saved = 0;
  const stop = async (receipt, text) => {
    if (receipt) await chrome.storage.session.set({ filledId: receipt.id });
    await load();
    status(`${saved} fiş kaydedildi. ${text}`, true);
  };
  for (const [i, receipt] of queue.entries()) {
    status(`${i + 1}/${queue.length}: ${receipt.documentNo} dolduruluyor.`);
    const { summary, problems } = await fillAndCheck(tab.id, receipt);
    if (!summary.ok) return stop(summary.gridFound ? receipt : null, `${receipt.documentNo} numaralı fişte durdum. ${summary.message}`);
    if (problems.length) return stop(receipt, `${receipt.documentNo} numaralı fişte durdum, ekrandaki kayıt fişle aynı değil: ${problems.join(" ")} Düzeltip Kaydet'e siz basın.`);
    if (i === queue.length - 1) {
      await chrome.storage.session.set({ filledId: receipt.id });
      await load();
      return status(`${saved} fiş kaydedildi. Son fiş (${receipt.documentNo}) dolduruldu ve ekranla karşılaştırıldı. Kontrol edip Kaydet'e siz basın, sonra Luca'da kaydettim'e basın.`);
    }
    // The configured button must still read "Kaydet": a selector that drifted onto another button is never pressed.
    const pressed = await inTab(tab.id, () => {
      const b = document.querySelector(globalThis.AccountieSelectors.save);
      if (!b || !/kaydet/i.test(b.textContent || b.value || "")) return false;
      // A confirmation still showing from the previous receipt must not count for this one.
      for (const old of document.querySelectorAll(globalThis.AccountieSelectors.saved)) old.dataset.accountieSeen = "1";
      b.click();
      return true;
    });
    if (!pressed.some(Boolean)) return stop(receipt, "Luca'nın Kaydet düğmesi bulunamadı. Fişi kontrol edip kendiniz kaydedin.");
    if (!(await waitFor(tab.id, () => !!document.querySelector(`${globalThis.AccountieSelectors.saved}:not([data-accountie-seen])`)))) {
      return stop(receipt, `${receipt.documentNo} için Kaydet'e basıldı ama Luca kaydı onaylamadı. Luca'da kontrol edin; fiş Accountie'de aktarıldı olarak işaretlenmedi.`);
    }
    await api(`/api/extension/receipts/${encodeURIComponent(receipt.id)}/transferred`, "POST");
    saved++;
    await inTab(tab.id, () => { document.querySelector(globalThis.AccountieSelectors.newEntry)?.click(); });
    const fresh = await waitFor(tab.id, () => { const g = globalThis.AccountieFill.readGrid(document, globalThis.AccountieSelectors); return !!g && g.length === 0; });
    if (!fresh) return stop(null, "Yeni boş fiş açılmadı. Luca'da yeni fiş açıp Hepsini sırayla kaydet'e tekrar basın.");
  }
}

async function done() {
  const receipt = current();
  await api(`/api/extension/receipts/${encodeURIComponent(receipt.id)}/transferred`, "POST");
  await chrome.storage.session.remove("filledId");
  await load();
  status("Fiş Accountie'de aktarıldı olarak işaretlendi.");
}

async function forget() {
  token = "";
  receipts = [];
  await chrome.storage.session.remove(["token", "filledId"]);
  $("list-view").hidden = true;
  $("token-form").hidden = false;
}

const guard = (fn) => () => fn().catch((e) => status(e.message, true));

$("token-form").addEventListener("submit", (e) => {
  e.preventDefault();
  token = $("token").value.trim();
  $("token").value = "";
  // Session storage: cleared when the browser closes, never synced.
  guard(async () => { await chrome.storage.session.set({ token }); await load(); })();
});
$("receipt").addEventListener("change", renderPreview);
$("fill").addEventListener("click", guard(fill));
$("auto").addEventListener("click", guard(autoAll));
$("done").addEventListener("click", guard(done));
$("forget").addEventListener("click", guard(async () => { await forget(); status("Anahtar silindi."); }));

chrome.storage.session.get("token").then(({ token: saved }) => {
  if (saved) { token = saved; guard(load)(); }
});
