"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { LEAVE_MESSAGE } from "@/components/useLeaveGuard";

/**
 * A receipt opened from the list (?fis=), beside the list instead of in place of it. A modal <dialog>: focus stays inside, the list
 * under it is inert, Esc closes. Closing is going back to the list's own address (same tab and month), through the unsaved-edit question.
 */
export function ReceiptDrawer({ close, children }: { close: string; children: ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    // The row that opened it gets focus back when it goes (the list is not reloaded, so it is the same element).
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (d && !d.open) d.showModal();
    return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, []);
  const leave = () => {
    if ("unsaved" in document.documentElement.dataset && !confirm(LEAVE_MESSAGE)) return;
    router.push(close, { scroll: false });
  };
  return (
    <dialog ref={ref} className="drawer" aria-labelledby="cekmece-baslik"
      onCancel={(e) => { e.preventDefault(); leave(); }}
      // Chrome closes a dialog on a repeated Esc even when cancel is refused: the address then follows, so no hidden drawer stays open.
      onClose={() => router.push(close, { scroll: false })}
      // A press on the dimmed list (the dialog's own box outside the sheet) closes it.
      onClick={(e) => { if (e.target === e.currentTarget) leave(); }}>
      <div className="drawer-sheet">
        <button type="button" className="btn drawer-close" onClick={leave} aria-label="Kapat">Kapat</button>
        {children}
      </div>
    </dialog>
  );
}
