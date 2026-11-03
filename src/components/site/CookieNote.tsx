"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const KEY = "cerez-bildirimi";

/**
 * Cookie notice for the public pages (docs/design/YON.md 14.3). Accountie sets only the session cookie, so there is nothing
 * to refuse: "Tamam" and "Tercihler" instead of an accept/reject pair. Shown after hydration only when not yet dismissed,
 * so it never shifts the layout; blocked storage shows it again next time, which is harmless. Pages render it right after the
 * skip link, before the bar: it is fixed, so DOM order only sets the Tab order, and Tab reaches it while it is still shown.
 */
export function CookieNote() {
  const [shown, setShown] = useState(false);
  const [away, setAway] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(KEY) === "1"; } catch { /* storage blocked */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the stored choice exists only in the browser
    if (!seen) setShown(true);
  }, []);
  useEffect(() => {
    if (!shown) return;
    // Past the first screen it steps aside, so it never lies over the page's headings; back at the top it returns.
    const onScroll = () => setAway(window.scrollY > window.innerHeight * 0.5 && !dialog.current?.open);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [shown]);
  const done = () => {
    try { localStorage.setItem(KEY, "1"); } catch { /* storage blocked: shown again next visit */ }
    dialog.current?.close();
    setShown(false);
  };
  if (!shown) return null;
  return (
    <section className="cookie-note" aria-labelledby="cookie-title" data-away={away || undefined}>
      <h2 id="cookie-title">Çerezler</h2>
      <p>Yalnız oturum çerezi.<span className="cookie-more"> Analitik ve reklam yok.</span> <Link href="/gizlilik">Gizlilik</Link></p>
      <div className="cookie-actions">
        <button type="button" className="btn" onClick={done}>Tamam</button>
        <button type="button" className="btn" onClick={() => dialog.current?.showModal()}>Tercihler</button>
      </div>
      <dialog className="cookie-dialog floating" ref={dialog} aria-labelledby="cookie-dialog-title">
        <h2 id="cookie-dialog-title">Çerez tercihleri</h2>
        <label className="cookie-row">
          <input type="checkbox" defaultChecked disabled aria-describedby="cookie-session-hint" />
          <span>Zorunlu: oturum</span>
        </label>
        <p className="hint" id="cookie-session-hint">Giriş yaptıktan sonra panelin sizi tanıması için gerekir, kapatılamaz. Başka çerez yok.</p>
        <p className="hint">Tema seçimi çerez değildir; bu tarayıcının belleğinde durur ve sunucuya gitmez.</p>
        <div className="cookie-actions">
          <button type="button" className="btn btn-primary" onClick={done}>Kaydet ve kapat</button>
        </div>
      </dialog>
    </section>
  );
}
