// Dev-only: the homepage with a forced theme (?tema=acik|koyu, light when absent), so both themes can be measured in a headless browser.
import LandingPage from "@/app/page";
import { ForceTheme } from "../ForceTheme";

export default async function PreviewHome({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  return <><ForceTheme tema={tema === "koyu" ? "koyu" : "acik"} /><LandingPage /></>;
}
