"use client";

import { useLayoutEffect } from "react";
import { THEME_EVENT } from "@/components/ThemeSwitch";
import { THEME_COLOR } from "@/lib/theme";

// Dev previews only: ?tema=acik|koyu forces a theme. An effect, not a <script>: a script in the RSC payload never runs after a client-side navigation.
// Sets data-look and the theme-color meta like applyTheme, without storing the choice (YON 16.8).
export function PreviewTheme({ tema }: { tema?: string }) {
  useLayoutEffect(() => {
    if (tema !== "acik" && tema !== "koyu") return;
    const look = tema === "koyu" ? "dark" : "light";
    const r = document.documentElement;
    r.dataset.theme = r.dataset.look = look;
    const m = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (m) m.content = THEME_COLOR[look];
    window.dispatchEvent(new Event(THEME_EVENT));
  }, [tema]);
  return null;
}
