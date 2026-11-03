// Dev-only: the homepage with a forced theme (?tema=acik|koyu), so both themes can be measured in a headless browser.
import LandingPage from "@/app/page";

export default async function PreviewHome({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  const theme = tema === "koyu" ? "dark" : "light";
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.dataset.theme=${JSON.stringify(theme)}` }} />
      <LandingPage />
    </>
  );
}
