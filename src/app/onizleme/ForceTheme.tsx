import { THEME_COLOR } from "@/lib/theme";

// Dev previews only: ?tema=acik|koyu forces a theme so a headless browser can measure both.
// Sets data-look and the theme-color meta too, the same three things applyTheme sets (YON 16.8).
export function ForceTheme({ tema }: { tema?: string }) {
  if (tema !== "acik" && tema !== "koyu") return null;
  const look = tema === "koyu" ? "dark" : "light";
  const js = `var r=document.documentElement,m=document.querySelector('meta[name="theme-color"]');r.dataset.theme=r.dataset.look=${JSON.stringify(look)};if(m)m.content=${JSON.stringify(THEME_COLOR[look])}`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
