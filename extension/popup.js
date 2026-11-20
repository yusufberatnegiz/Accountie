/* global chrome, AccountieFill, AccountieSelectors, AccountieGib */
// Change together with host_permissions in manifest.json (e.g. http://localhost:3000 for development).
const APP_ORIGIN = "https://accountie.app";
// Luca birden çok sunucuda çalışır (auygs, auygs16, ...).
const LUCA_HOST = /^auygs\d*\.luca\.com\.tr$/;

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

const selected = () => receipts.filter((r) => $(`pick-${r.id}`)?.checked);
// Written into the open Luca entry and not yet marked: such a receipt cannot be picked again (it would go into Luca twice).
let filledNow = [];
const pickable = () => receipts.filter((r) => !filledNow.includes(r.id));
// A firm by its Accountie id: two firms imported from Luca may share a name.
const firmOf = (r) => r?.firmId || r?.firm;
// "Tümünü seç" works on one firm: the waiting entry's, else the first chosen or listed one.
const firmOpen = () => { const firm = firmOf(receipts.find((r) => filledNow.includes(r.id)) ?? selected()[0] ?? pickable()[0]); return pickable().filter((r) => firmOf(r) === firm); };
const allPicked = (open) => open.length > 0 && selected().length === open.length && open.every((r) => $(`pick-${r.id}`)?.checked);

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

/** One small receipt per approved receipt: firm, vendor, number and date, total; checked ones go to Luca together. */
function renderCards(filled) {
  filledNow = filled;
  $("cards").replaceChildren(...receipts.map((r) => {
    // The lines show on hover: account, then Borç or "A" + Alacak.
    const lines = r.rows.map((row) => `${row.accountCode}  ${row.debit || `A ${row.credit}`}`);
    return el("li", { className: `card${filled.includes(r.id) ? " filled" : ""}` },
      el("input", { type: "checkbox", id: `pick-${r.id}`, checked: !filled.includes(r.id) && receipts.length === 1, disabled: filled.includes(r.id) }),
      el("label", { htmlFor: `pick-${r.id}`, title: lines.join(String.fromCharCode(10)) },
        el("span", { className: "firm", textContent: r.firm || "Firma yok" }),
        el("span", { className: "vendor", textContent: r.title || "Satıcı yok" }),
        el("span", { className: "meta", textContent: `${r.documentNo || "No yok"} · ${r.documentDate}` }),
        el("span", { className: "total", textContent: `${r.total} TL` }),
        filled.includes(r.id) ? el("span", { className: "state", textContent: "Yazıldı, kaydı bekliyor" }) : ""),
      el("span", { className: "tick", "aria-hidden": "true" }));
  }));
  updateSelection();
}

function updateSelection() {
  const picked = selected();
  const waiting = receipts.find((r) => filledNow.includes(r.id));
  const firms = new Set([...(waiting ? [firmOf(waiting)] : []), ...picked.map(firmOf)]);
  // The open entry's firm (or else the first picked receipt's) sets the firm; picked cards of any other firm are marked.
  const firm = waiting ? firmOf(waiting) : firmOf(picked[0]);
  for (const r of receipts) $(`pick-${r.id}`)?.closest(".card").classList.toggle("other-firm", firms.size > 1 && picked.includes(r) && firmOf(r) !== firm);
  $("fill").disabled = picked.length === 0 || firms.size > 1;
  $("fill").textContent = picked.length > 1 ? `${picked.length} fişi Fiş Detayına yaz` : "Fiş Detayına yaz";
  const open = pickable();
  $("toggle-all").textContent = allPicked(firmOpen()) ? "Seçimi kaldır" : "Tümünü seç";
  $("toggle-all").hidden = firmOpen().length < 2;
  $("selection").className = firms.size > 1 ? "muted error" : "muted";
  $("selection").textContent = !picked.length ? (open.length ? "Aktarılacak fişleri seçin." : "")
    : firms.size > 1 ? (waiting ? `Açık Luca kaydı ${waiting.firm} firmasının. Başka firmanın fişi bu kayda yazılamaz; önce kaydı bitirin.` : `Seçilen fişler ${firms.size} ayrı firmadan. Luca'da tek firma açık olur; firma adı kırmızı ve kalın olanları seçimden çıkarın.`)
    : `${picked.length} fiş seçildi, toplam ${picked.reduce((n, r) => n + r.rows.length, 0)} satır. Fişler Fiş Detayına alt alta yazılır.`;
}

/**
 * Luca's firm number (SIRKET_ID) the open Luca tab shows in its firm picker frame; null when it cannot be read (no picker found, or
 * frames that disagree), and then nothing is checked against it.
 */
async function openLucaFirm(tabId) {
  const found = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: () => document.getElementById("SirketCombo")?.value || null })
    .then((rs) => [...new Set(rs.map((r) => r.result).filter(Boolean))], () => []);
  return found.length === 1 ? String(found[0]) : null;
}

async function activeLucaTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url && LUCA_HOST.test(new URL(tab.url).hostname) ? tab : null;
}

async function activeGibTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url && new URL(tab.url).origin === `https://${AccountieGib.GIB_HOST}` ? tab : null;
}

/**
 * The open Dijital Vergi Dairesi session's e-Tebligat list to Accountie: read in that tab (gib-notices.js; only two read-only GİB
 * calls, no envelope opened), then only the list's header fields are sent. GİB's session key never leaves the tab.
 */
async function sendNotices() {
  const tab = await activeGibTab();
  if (!tab) return status("Önce Dijital Vergi Dairesi'nde firmanın hesabıyla giriş yapın, eklentiyi o sekmede açın.", true);
  status("e-Tebligat listesi okunuyor.");
  const target = { tabId: tab.id };
  // A script that throws or cannot be injected is a failed read, said in Turkish, never Chrome's own English message.
  const failed = { result: { error: "shape", step: "betik" } };
  const [read] = await chrome.scripting.executeScript({ target, files: ["gib-notices.js"] })
    .then(() => chrome.scripting.executeScript({ target, func: () => globalThis.AccountieGib.readNotices().catch(() => ({ error: "shape", step: "betik" })) }))
    .catch(() => [failed]);
  const r = read?.result;
  if (!r || r.error) return status(AccountieGib.problem(r ?? { error: "network" }), true);
  const res = await fetch(APP_ORIGIN + "/api/extension/notices", {
    method: "POST", credentials: "omit",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ idNumbers: r.idNumbers, notices: r.notices }),
  });
  if (res.status === 401) { await forget(); throw new Error("Anahtar geçersiz veya süresi dolmuş. Accountie'den yeni anahtar alın."); }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || "Accountie'ye ulaşılamadı. Tekrar deneyin.");
  status(`${body.firm} tarandı. ${body.fresh ? `${body.fresh} yeni tebligat bulundu.` : "Bu taramada yeni tebligat bulunmadı."}`);
}

async function showConnectedView() {
  if (!(await activeGibTab())) return load();
  $("token-form").hidden = true;
  $("notices-view").hidden = false;
  status("");
}

async function load() {
  status("Fişler getiriliyor.");
  // With Luca open on a firm, that firm's receipts are listed (not the oldest 50 of all firms); written ones always come back.
  const luca = await activeLucaTab();
  const sirket = luca ? await openLucaFirm(luca.id) : null;
  const waiting = await filledIds();
  const query = new URLSearchParams({ ...(sirket ? { sirket } : {}), ...(waiting.length ? { keep: waiting.join(",") } : {}) }).toString();
  const data = await api(`/api/extension/receipts${query ? `?${query}` : ""}`);
  receipts = data.receipts;
  // A written receipt no longer approved (exported on the site, sent back to draft) has no mark left to make: dropped, so it never
  // holds the firm import (import.js) or the auto run.
  const still = waiting.filter((id) => receipts.some((r) => r.id === id));
  if (still.length !== waiting.length) await chrome.storage.local.set({ filledIds: still });
  $("token-form").hidden = true;
  $("list-view").hidden = false;
  $("auto").hidden = $("auto-note").hidden = !autoReady();
  // The popup closes when the user clicks Luca's Kaydet; reopen with "Luca'da kaydettim" visible for every receipt filled since.
  const filled = still;
  renderCards(filled);
  if (!receipts.length) $("cards").replaceChildren(el("li", { className: "empty muted", textContent: "Aktarılacak onaylı fiş yok. Accountie'de fişleri onaylayınca burada görünür." }));
  $("fill").hidden = !receipts.length;
  // Approved receipts the firm's Luca plan no longer takes (or whose firm is not from Luca): never listed, but said.
  $("off-plan").hidden = !data.offPlan;
  $("off-plan").textContent = data.offPlan ? `${data.offPlan} onaylı fiş listede yok: firması Luca'dan çekilmemiş ya da satırları firmanın Luca planına uymuyor. Accountie'de fişi açıp “Taslağa al”a basın; satırlar plana göre yeniden kurulur.` : "";
  // While written receipts wait for Luca's Kaydet, marking them is the next step: that button leads.
  $("done").className = filled.length ? "primary" : "";
  $("fill").className = filled.length ? "" : "primary";
  $("clear-filled").hidden = !filled.length;
  // Never while an entry waits for Kaydet: the run would write into it.
  $("auto").disabled = receipts.length < 2 || filled.length > 0;
  $("done").after($("status"));
  $("done").hidden = !filled.length;
  if (filled.length) $("done").textContent = filled.length > 1 ? `Luca'da kaydettim (${filled.length} fiş)` : "Luca'da kaydettim";
  status("");
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
// Receipts written into the open Luca entry and not yet marked; several can share one entry, one under another.
const filledIds = async () => (await chrome.storage.local.get("filledIds")).filledIds ?? [];
const addFilled = async (id) => chrome.storage.local.set({ filledIds: [...new Set([...(await filledIds()), id])] });
const dropFilled = async (id) => chrome.storage.local.set({ filledIds: (await filledIds()).filter((x) => x !== id) });
// Auto save needs all three selectors checked on Luca's real screen (selectors.js); until then the extension only fills.
const autoReady = () => !!(AccountieSelectors.save && AccountieSelectors.saved && AccountieSelectors.newEntry);

async function lucaTab() {
  // While the firm import runs, Luca's session moves from firm to firm: a receipt written now could land in another firm.
  const { importingAt } = await chrome.storage.local.get("importingAt");
  if (typeof importingAt === "number" && Date.now() - importingAt < 180_000) {
    status("Luca'dan firmalar çekiliyor; Luca oturumu firma firma değişiyor. Çekme bitince fiş yazın.", true);
    return null;
  }
  // A firm import that could not show Luca back on the first firm (or whose tab was closed): asked once, then the next try writes.
  const { lucaAway } = await chrome.storage.local.get("lucaAway");
  if (lucaAway) {
    // No fresh beat (checked above): the run has ended, or its tab was closed. Asked once, then the next try writes.
    await chrome.storage.local.remove(["lucaAway", "importingAt"]);
    status(`Firma çekmeden sonra Luca'nın ${lucaAway} firmasına döndüğü doğrulanamadı. Luca'da açık firmayı kontrol edin; doğruysa yeniden basın.`, true);
    return null;
  }
  const tab = await activeLucaTab();
  if (!tab) {
    status("Önce Luca'da Fiş Detayı ekranını açın, sonra eklentiyi o sekmede açın.", true);
    return null;
  }
  return tab;
}

/**
 * The firm of Luca's session (where Kaydet books), read without changing anything: its firm number and VKN from Luca's own customer
 * page (luca-import.js probe), in the frame that holds the firm picker. Null when it cannot be read.
 */
async function lucaSession(tabId) {
  const frames = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: () => !!document.getElementById("SirketCombo") }).catch(() => []);
  const hit = frames.find((f) => f.result);
  if (!hit) return null;
  const target = { tabId, frameIds: [hit.frameId] };
  const probe = await chrome.scripting.executeScript({ target, files: ["luca-import.js"] })
    .then(() => chrome.scripting.executeScript({ target, func: () => globalThis.AccountieLuca.probe().catch(() => null) }))
    .then(([r]) => r?.result, () => null);
  return probe?.identity ? { sirket: probe.ids?.sirket ?? null, taxNumber: probe.identity.taxNumber ?? null } : null;
}

/** False (and says why) unless Luca's screen and session both show the receipts' firm, brought from Luca: else they would be booked elsewhere. */
async function sameFirm(tab, list) {
  const problem = AccountieFirmCheck.firmProblem(list, await openLucaFirm(tab.id), await lucaSession(tab.id));
  if (!problem) return true;
  status(problem, true);
  return false;
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
  // Only this receipt's rows are read back (from its table row down); the ones above belong to receipts filled before.
  const grids = (await inTab(tabId, (start) => globalThis.AccountieFill.readGrid(document, globalThis.AccountieSelectors, start), [summary.start])).filter(Boolean);
  const grid = grids.sort((a, b) => b.length - a.length)[0] ?? null;
  return { summary, problems: AccountieFill.checkGrid(receipt.rows, grid) };
}

/** The chosen receipts one under another in the open Fiş Detayı; stops at the first one the screen does not match. */
async function fill() {
  const picked = selected();
  const tab = picked.length && (await lucaTab());
  if (!tab) return;
  // A receipt already written (and not yet marked) would go into Luca twice; its card is disabled, this is the last guard.
  if (picked.some((r) => filledNow.includes(r.id))) return status("Seçilenlerden biri zaten yazıldı. Luca'da kaydettiyseniz Luca'da kaydettim'e basın.", true);
  if (!(await sameFirm(tab, picked))) return;
  let written = 0;
  let last = null;
  for (const [i, receipt] of picked.entries()) {
    $("fill").textContent = `Yazılıyor ${i + 1}/${picked.length}`;
    if (picked.length > 1) status(`${i + 1}/${picked.length}: ${receipt.documentNo} yazılıyor.`);
    await addFilled(receipt.id);
    filledNow = [...filledNow, receipt.id];
    const { summary, problems } = await fillAndCheck(tab.id, receipt);
    last = summary;
    // Kept after partial fills too: the user completes the missing cells by hand and still has to mark the receipt.
    if (summary.gridFound) written++;
    else { await dropFilled(receipt.id); filledNow = filledNow.filter((x) => x !== receipt.id); }
    const done = written ? `${written} fiş yazıldı. ` : "";
    if (problems.length) { await load(); return status(`${done}${receipt.documentNo} numaralı fişte ekran fişle aynı değil: ${problems.join(" ")} Düzeltmeden Kaydet'e basmayın.`, true); }
    if (!summary.ok) { await load(); return status(`${done}${receipt.documentNo} numaralı fişte durdum. ${summary.message}`, true); }
  }
  await load();
  status(picked.length > 1 ? `${written} fiş alt alta yazıldı ve ekranla karşılaştırıldı. Luca'da kontrol edip Kaydet'e siz basın, sonra eklentiyi açıp Luca'da kaydettim'e basın.` : last.message);
}

/** Every approved receipt in turn: fill, check, save, wait for Luca's confirmation, mark, new entry. The last one is left for the user to save. */
async function autoAll() {
  const tab = await lucaTab();
  if (!tab || !receipts.length) return;
  const queue = pickable().filter((r, _, all) => firmOf(r) === firmOf(all[0]));
  if (!(await sameFirm(tab, queue))) return;
  let saved = 0;
  const stop = async (receipt, text) => {
    if (receipt) await addFilled(receipt.id);
    await load();
    status(`${saved} fiş kaydedildi. ${text}`, true);
  };
  for (const [i, receipt] of queue.entries()) {
    status(`${i + 1}/${queue.length}: ${receipt.documentNo} dolduruluyor.`);
    const { summary, problems } = await fillAndCheck(tab.id, receipt);
    if (!summary.ok) return stop(summary.gridFound ? receipt : null, `${receipt.documentNo} numaralı fişte durdum. ${summary.message}`);
    if (problems.length) return stop(receipt, `${receipt.documentNo} numaralı fişte durdum, ekrandaki kayıt fişle aynı değil: ${problems.join(" ")} Düzeltip Kaydet'e siz basın.`);
    if (i === queue.length - 1) {
      await addFilled(receipt.id);
      await load();
      return status(`${saved} fiş kaydedildi. Son fiş (${receipt.documentNo}) dolduruldu ve ekranla karşılaştırıldı. Kontrol edip Kaydet'e siz basın, sonra Luca'da kaydettim'e basın.`);
    }
    // Kaydet books to Luca's session: checked again before every press, another tab may have changed firm meanwhile.
    if (!(await sameFirm(tab, [receipt]))) return stop(receipt, `${receipt.documentNo} dolduruldu ama kaydedilmedi. ${$("status").textContent}`);
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
  const ids = (await filledIds()).filter((id) => receipts.some((r) => r.id === id)); // marks for receipts no longer listed are just dropped
  for (const id of ids) await api(`/api/extension/receipts/${encodeURIComponent(id)}/transferred`, "POST");
  await chrome.storage.local.remove("filledIds");
  await load();
  status(`${ids.length} fiş Accountie'de aktarıldı olarak işaretlendi.`);
}

/** Luca'da satırlar kaydedilmeden silindiyse: yazıldı işaretlerini Accountie'de aktarıldı yapmadan kaldırır. */
async function clearFilled() {
  // The rows must be gone from Luca first: otherwise the same receipts would be written under them a second time.
  if (!confirm("Bu fişlerin satırlarını Luca'daki açık kayıttan sildiniz mi? Silmediyseniz fişler aynı kayda ikinci kez yazılır.")) return;
  await chrome.storage.local.remove("filledIds");
  await load();
  status("Yazıldı işaretleri kaldırıldı; fişler yeniden seçilebilir.");
}

async function forget() {
  token = "";
  receipts = [];
  await chrome.storage.local.remove("token");
  $("list-view").hidden = true;
  $("notices-view").hidden = true;
  $("token-form").hidden = false;
  $("token-form").after($("status"));
}

const ACTIONS = ["fill", "auto", "done", "import", "forget", "toggle-all", "clear-filled", "notices"];
/** One action at a time: every action button is off while one runs, and the pressed one says it is busy. */
let busy = false;
const guard = (fn, id) => async () => {
  if (busy) return;
  busy = true;
  const keep = selected().map((r) => r.id);
  if (id) {
    for (const a of ACTIONS) if (a !== id) $(a).disabled = true;
    for (const c of document.querySelectorAll(".card input")) c.disabled = true;
    $(id).setAttribute("aria-disabled", "true");
    $(id).setAttribute("aria-busy", "true");
  }
  // An error mid-run reloads the list, so whatever was written shows as written and "Luca'da kaydettim" is offered.
  try { await fn(); } catch (e) { if (receipts.length) await load().catch(() => {}); status(e.message, true); } finally {
    busy = false;
    if (id) {
      $(id).removeAttribute("aria-busy");
      $(id).removeAttribute("aria-disabled");
      for (const a of ACTIONS) $(a).disabled = false;
      if (receipts.length) {
        renderCards(filledNow);
        // The choice survives a failed or partial run; written receipts drop out of it.
        for (const rid of keep) { const box = $(`pick-${rid}`); if (box && !box.disabled) box.checked = true; }
        updateSelection();
      }
      $("auto").disabled = receipts.length < 2 || filledNow.length > 0;
      // Focus stays on the pressed button, or on the step that now leads when it went away.
      const usable = (b) => b && !b.hidden && !b.disabled;
      const target = [$(id), $("done"), $("fill"), document.querySelector(".card input:not(:disabled)"), $("import")].find(usable);
      target?.focus();
    }
  }
};

$("token-form").addEventListener("submit", (e) => {
  e.preventDefault();
  token = $("token").value.trim();
  $("token").value = "";
  // Local storage: kept on this computer across restarts, never synced; "Anahtarı sil" removes it.
  guard(async () => { await chrome.storage.local.set({ token }); await showConnectedView(); })();
});
$("cards").addEventListener("change", updateSelection);
$("toggle-all").addEventListener("click", () => {
  const open = firmOpen(), all = !allPicked(open);
  // Selecting all keeps to that firm, so other firms' picks are dropped.
  for (const r of pickable()) $(`pick-${r.id}`).checked = all && open.includes(r);
  updateSelection();
});
$("fill").addEventListener("click", guard(fill, "fill"));
$("auto").addEventListener("click", guard(autoAll, "auto"));
$("done").addEventListener("click", guard(done, "done"));
$("clear-filled").addEventListener("click", guard(clearFilled, "clear-filled"));
$("notices").addEventListener("click", guard(sendNotices, "notices"));
// Kendi sekmesinde: açılır pencere odağı kaybedince kapanır, içe aktarma dakikalar sürer.
$("import").addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("import.html") }));
$("forget").addEventListener("click", guard(async () => { await forget(); status("Anahtar silindi."); }));
$("forget-gib").addEventListener("click", guard(async () => { await forget(); status("Anahtar silindi."); }));

guard(async () => {
  if (await activeGibTab()) {
    $("heading").textContent = "e-Tebligat";
    $("connect").textContent = "Eklentiyi bağla";
  }
  const { token: saved } = await chrome.storage.local.get("token");
  if (saved) {
    token = saved;
    await showConnectedView();
  }
})();
