"use client";

import { useEffect } from "react";

export const LEAVE_MESSAGE = "Bu fişteki kaydedilmemiş değişiklikler kaybolacak. Devam edilsin mi?";

/** While `dirty`, warns before edits are lost: tab close or reload, in-app links (captured before Next's Link handler) and Back. */
export function useLeaveGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    // Navigation that is not a link click (the Ctrl+K shortcut) reads this mark and asks the same question.
    document.documentElement.dataset.unsaved = "";
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      // A jump within the page (#fis-kaynak) or a new tab leaves nothing.
      if (!a || a.getAttribute("href")?.startsWith("#") || a.getAttribute("target") === "_blank") return;
      if (!confirm(LEAVE_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    // Back (the phone's swipe) is no link: one more entry of this same page sits on top, and going back past it asks first.
    let leaving = false;
    history.pushState(history.state, "", location.href);
    const onPop = () => {
      if (leaving) return;
      if (confirm(LEAVE_MESSAGE)) { leaving = true; history.back(); }
      else history.pushState(history.state, "", location.href);
    };
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("popstate", onPop);
    document.addEventListener("click", onClick, true);
    return () => {
      delete document.documentElement.dataset.unsaved;
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);
}
