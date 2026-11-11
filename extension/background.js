// Takes the extension key from the Accountie site ("Eklentiye bağla" on the Kurallar page), so it is never copied by hand.
// Only the site itself may send it (externally_connectable in manifest.json lists it; the origin is checked again here),
// and only something shaped like a key is stored. Tested in src/lib/luca/extension-background.test.ts.
(function (root) {
  const APP_ORIGIN = "https://accountie.vercel.app"; // popup.js ile aynı
  const TOKEN = /^acx_[A-Za-z0-9_-]{43}$/;

  /** The key to store from one external message, or null when the message is not one to accept. */
  function acceptToken(message, sender) {
    if (!sender || sender.origin !== APP_ORIGIN) return null;
    if (!message || message.type !== "accountie-token" || typeof message.token !== "string" || !TOKEN.test(message.token)) return null;
    return message.token;
  }
  root.AccountieBackground = { acceptToken };

  if (root.chrome?.runtime?.onMessageExternal) {
    root.chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
      const token = acceptToken(message, sender);
      if (!token) return sendResponse({ ok: false });
      // A new key replaces the old one; the written-but-not-saved marks belong to the account, so they stay.
      root.chrome.storage.local.set({ token }).then(() => sendResponse({ ok: true }), () => sendResponse({ ok: false }));
      return true; // answers after the write
    });
  }
})(globalThis);
