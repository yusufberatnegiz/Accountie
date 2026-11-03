// Dev previews only: ?tema=acik|koyu forces a theme so a headless browser can measure both.
export function ForceTheme({ tema }: { tema?: string }) {
  if (tema !== "acik" && tema !== "koyu") return null;
  const theme = tema === "koyu" ? "dark" : "light";
  return <script dangerouslySetInnerHTML={{ __html: `document.documentElement.dataset.theme=${JSON.stringify(theme)}` }} />;
}
