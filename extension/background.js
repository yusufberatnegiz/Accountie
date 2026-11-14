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
  const IMPORT_STALE_MS = 60_000;
  /** The answer to the site's "is the firm import running" question, or null when the message is not that question from the site. */
  function importStatus(message, sender, importingAt, now) {
    if (!sender || !APP_ORIGINS.includes(sender.origin) || !message || message.type !== "accountie-import-status") return null;
    return { ok: true, importing: typeof importingAt === "number" && now - importingAt < IMPORT_STALE_MS };
  }
  root.AccountieBackground = { acceptToken, importStatus };

  if (root.chrome?.runtime?.onMessageExternal) {
    root.chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
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
