"use client";

import { useLayoutEffect } from "react";

// Dev previews only: ?tema=acik|koyu forces a theme. An effect, not a <script>: a script in the RSC payload never runs after a client-side navigation.
export function PreviewTheme({ tema }: { tema?: string }) {
  useLayoutEffect(() => {
    if (tema === "acik" || tema === "koyu") document.documentElement.dataset.theme = tema === "koyu" ? "dark" : "light";
  }, [tema]);
  return null;
}
