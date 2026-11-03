"use client";

import { useEffect } from "react";

const LEAVE_MESSAGE = "Kaydedilmemiş değişiklikler kaybolacak. Sayfadan çıkılsın mı?";

/** While `dirty`, warns before edits are lost: tab close or reload, and in-app links (captured before Next's Link handler). */
export function useLeaveGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest("a[href]") && !confirm(LEAVE_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);
}
