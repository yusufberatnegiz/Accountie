// Takes the extension key from the Accountie site ("Eklentiye bağla" on the Kurulum page), so it is never copied by hand.
// Only the site itself may send it (externally_connectable in manifest.json lists it; the origin is checked again here),
// and only something shaped like a key is stored. Tested in src/lib/luca/extension-background.test.ts.
(function (root) {
  // The site, with or without www (Vercel redirects one to the other); popup.js talks to the first.
  const APP_ORIGINS = ["https://accountie.app", "https://www.accountie.app"];
  const TOKEN = /^acx_[A-Za-z0-9_-]{43}$/;

  /** The key to store from one external message, or null when the message is not one to accept. */
  function acceptToken(message, sender) {
    if (!sender || !APP_ORIGINS.includes(sender.origin)) return null;
    if (!message || message.type !== "accountie-token" || typeof message.token !== "string" || !TOKEN.test(message.token)) return null;
    return message.token;
  }
  /** Longer than one firm ever takes: a beat older than this is a run that ended without clearing it (tab closed). */
  const IMPORT_STALE_MS = 180_000;
  /** The answer to the site's "is the firm import running" question, or null when the message is not that question from the site. */
  function importStatus(message, sender, importingAt, now) {
    if (!sender || !APP_ORIGINS.includes(sender.origin) || !message || message.type !== "accountie-import-status") return null;
    return { ok: true, importing: typeof importingAt === "number" && now - importingAt < IMPORT_STALE_MS };
  }
  root.AccountieBackground = { acceptToken, importStatus };

  async function launchGibScan(message, sender) {
    if (!APP_ORIGINS.includes(sender?.origin) || sender.url?.split(/[?#]/, 1)[0] !== `${sender.origin}/panel/tebligatlar`) return false;
    const { account, until } = message;
    if (typeof account !== "string" || !account || typeof until !== "string" || until.length !== 24 || !(Date.parse(until) > Date.now())) return false;
    const { token } = await root.chrome.storage.local.get("token");
    if (typeof token !== "string" || !TOKEN.test(token)) return false;
    const res = await root.fetch(`${APP_ORIGINS[0]}/api/extension/gib-logins`, { credentials: "omit", cache: "no-store", headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return false;
    const stored = await res.json();
    if (!stored.enabled || !stored.firms?.length || stored.account !== account || stored.scanUntil !== until) return false;
    await root.chrome.tabs.create({ url: `${root.chrome.runtime.getURL("tebligat.html")}#${encodeURIComponent(until)}`, active: true });
    return true;
  }

  let ocrCloseTimer = null;
  let ocrEnsuring = null;

  async function ensureOcrDocument() {
    if (ocrEnsuring) return ocrEnsuring;
    ocrEnsuring = (async () => {
      if (await root.chrome.offscreen?.hasDocument()) return;
      await root.chrome.offscreen.createDocument({
        url: "ocr.html",
        reasons: ["WORKERS", "BLOBS"],
        justification: "Dijital Vergi Dairesi doğrulama kodunu cihazda yerel olarak okur.",
      });
    })();
    try {
      await ocrEnsuring;
    } finally {
      ocrEnsuring = null;
    }
  }

  async function ocrOnce(png) {
    clearTimeout(ocrCloseTimer);
    await ensureOcrDocument();
    const answer = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ ok: false, reason: "timeout" }), 8_000);
      root.chrome.runtime.sendMessage({ type: "ocr", png }, (value) => {
        clearTimeout(timer);
        resolve(value || { ok: false, reason: "no-answer" });
      });
    });
    ocrCloseTimer = setTimeout(() => root.chrome.offscreen.closeDocument().catch(() => {}), 60_000);
    return answer;
  }

  if (root.chrome?.runtime?.onMessage) {
    root.chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== "ocrRequest") return;
      ocrOnce(message.png)
        .then((value) => sendResponse(value))
        .catch((error) => sendResponse({ ok: false, reason: "model-error", detail: String(error?.message || error).slice(0, 200) }));
      return true;
    });
  }

  if (root.chrome?.runtime?.onMessageExternal) {
    root.chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
      if (message?.type === "accountie-gib-scan") {
        launchGibScan(message, sender).then((ok) => sendResponse({ ok }), () => sendResponse({ ok: false }));
        return true;
      }
      if (message?.type === "accountie-import-status") {
        root.chrome.storage.local.get("importingAt").then(
          ({ importingAt }) => sendResponse(importStatus(message, sender, importingAt, Date.now()) ?? { ok: false }),
          () => sendResponse({ ok: false }),
        );
        return true;
      }
      const token = acceptToken(message, sender);
      if (!token) return sendResponse({ ok: false });
      // A new key replaces the old one; the written-but-not-saved marks belong to the account, so they stay.
      root.chrome.storage.local.set({ token }).then(() => sendResponse({ ok: true }), () => sendResponse({ ok: false }));
      return true; // answers after the write
    });
  }
})(globalThis);
