"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const KEY = "cerez-bildirimi";

/**
 * Cookie notice for the public pages (docs/design/YON.md 14.3). Accountie sets only the session cookie, so there is nothing
 * to refuse: "Tamam" and "Tercihler" instead of an accept/reject pair. Shown after hydration only when not yet dismissed,
 * so it never shifts the layout; blocked storage shows it again next time, which is harmless. Pages render it first, right after
 * the skip link: it is fixed at the screen's foot, so DOM order only sets the Tab order, and it hides past half a screen of
 * scroll, so a keyboard user reaches it at the top while it is still shown (YON 23.14).
 */
export function CookieNote() {
  const [shown, setShown] = useState(false);
  const [away, setAway] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const note = useRef<HTMLElement>(null);
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(KEY) === "1"; } catch { /* storage blocked */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the stored choice exists only in the browser
    if (!seen) setShown(true);
  }, []);
  useEffect(() => {
    if (!shown) return;
    // Past the first screen it steps aside, so it never lies over the page's headings; back at the top it returns.
    // React bails out on an unchanged value, but only after scheduling; compare first so a scroll costs no render.
    let last = false;
    const onScroll = () => { const v = window.scrollY > window.innerHeight * 0.5 && !dialog.current?.open && !note.current?.contains(document.activeElement); if (v !== last) { last = v; setAway(v); } };
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
    // A labelled region, not a heading: a screen reader's heading list starts with the page's own h1.
    <section ref={note} className="cookie-note" aria-label="Çerezler" data-away={away || undefined}>
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
          <button type="button" className="btn btn-primary" onClick={done}>Kapat</button>
        </div>
      </dialog>
    </section>
  );
}
