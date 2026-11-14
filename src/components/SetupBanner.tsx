"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const KEY = "accountie-kurulum-gizle";
const noop = () => () => {};
const hiddenBefore = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

/** The list's reminder while the setup is pending; "Şimdilik gizle" puts it away in this browser (the menu item stays). */
export function SetupBanner({ href }: { href: string }) {
  const stored = useSyncExternalStore(noop, hiddenBefore, () => false);
  const [hidden, setHidden] = useState(false);
  if (stored || hidden) return null;
  return (
    <div className="panel setup-banner">
      <p><b>Kurulumu tamamlayın.</b> Eklentiyi kurup Luca&apos;dan firmalarınızı çekin; üç adım, birkaç dakika.</p>
      <div className="setup-banner-actions">
        <button type="button" className="btn btn-quiet" onClick={() => { try { localStorage.setItem(KEY, "1"); } catch {} setHidden(true); }}>Şimdilik gizle</button>
        <Link className="btn btn-primary" href={href}>Kuruluma başla</Link>
      </div>
    </div>
  );
}
