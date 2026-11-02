/* global chrome, AccountieFill */
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
  renderPreview();
  status(receipts.length ? "" : "Aktarılacak onaylı fiş yok.");
}

async function fill() {
  const receipt = current();
  if (!receipt) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || new URL(tab.url).hostname !== LUCA_HOST) return status("Önce Luca'da Fiş Detayı ekranını açın, sonra eklentiyi o sekmede açın.", true);
  const target = { tabId: tab.id, allFrames: true };
  await chrome.scripting.executeScript({ target, files: ["selectors.js", "fill.js"] });
  const results = await chrome.scripting.executeScript({
    target,
    args: [receipt.rows],
    func: (rows) => globalThis.AccountieFill.fillReceipt(document, rows, globalThis.AccountieSelectors),
  });
  const summary = AccountieFill.summarize(results.map((r) => r.result), receipt.rows.length);
  status(summary.message, !summary.ok);
  $("done").hidden = !summary.ok;
}

async function done() {
  const receipt = current();
  await api(`/api/extension/receipts/${encodeURIComponent(receipt.id)}/transferred`, "POST");
  await load();
  status("Fiş Accountie'de aktarıldı olarak işaretlendi.");
}

async function forget() {
  token = "";
  receipts = [];
  await chrome.storage.session.remove("token");
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
$("done").addEventListener("click", guard(done));
$("forget").addEventListener("click", guard(async () => { await forget(); status("Anahtar silindi."); }));

chrome.storage.session.get("token").then(({ token: saved }) => {
  if (saved) { token = saved; guard(load)(); }
});
