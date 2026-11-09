"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LEAVE_MESSAGE } from "@/components/useLeaveGuard";

/** Ctrl+K (⌘K on a Mac) anywhere in the panel opens the firm search: a müşavir switches between hundreds of firms. */
export function FirmShortcut({ base }: { base: string }) {
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.isComposing) return;
      if (document.querySelector("dialog:modal")) return; // an open sheet keeps its keys
      e.preventDefault();
      const search = document.getElementById("firma-ara");
      if (search) search.focus();
      else if (!("unsaved" in document.documentElement.dataset) || confirm(LEAVE_MESSAGE)) router.push(`${base}/firmalar#ara`);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [base, path, router]);
  return null;
}
