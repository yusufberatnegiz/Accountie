"use client";

import Link from "next/link";
import { useRef } from "react";
import { logout } from "@/app/giris/actions";
import { ThemeSwitch } from "@/components/ThemeSwitch";

/**
 * The rail's last item: opens a sheet with the signed-in e-mail, the theme and Çıkış.
 * Çıkış sits one step away, so a stray tap in the phone's bottom bar never ends the session.
 * A native <dialog>: Escape, focus trap and return of focus come from the platform.
 */
export function AccountMenu({ email }: { email?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button className="rail-item" type="button" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
        <svg className="rail-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="8" cy="5.5" r="2.75" /><path d="M2.75 14c.6-2.7 2.7-4.25 5.25-4.25s4.65 1.55 5.25 4.25" /></svg>
        <span className="rail-label">Hesap</span>
      </button>
      <dialog ref={dialog} className="account-sheet floating" aria-labelledby="hesap-baslik"
        onClick={(e) => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
        <div className="account-body">
          <div className="account-head">
            {/* Not a heading: the dialog sits in the DOM before the page's h1, so an h2 here opened the outline (jury tur 8). */}
            <p id="hesap-baslik" className="account-title">Hesap</p>
            <button className="btn btn-quiet btn-sm" type="button" onClick={() => dialog.current?.close()}>Kapat</button>
          </div>
          {email ? <p className="account-email" translate="no">{email}</p> : null}
          <div className="account-row">
            <span>Tema</span>
            <ThemeSwitch labelled />
          </div>
          <form action={logout}>
            <button className="btn account-logout" type="submit">Çıkış yap</button>
          </form>
          <Link className="account-delete" href="/panel/hesap">Hesabı sil</Link>
        </div>
      </dialog>
    </>
  );
}
