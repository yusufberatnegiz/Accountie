import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { BrandMark } from "@/components/BrandMark";
import { CaptureButton } from "@/components/CaptureButton";
import { FirmShortcut } from "@/components/FirmShortcut";
import { FoldButton } from "@/components/FoldButton";
import { Odometer } from "@/components/home/Odometer";
import { countNewNotices } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/session";
import "./panel/panel.css";

type Current = "fisler" | "fis" | "kurallar" | "firmalar" | "tebligatlar" | "kontor" | "kurulum" | "hesap";

// Drawn icons, 16px outline at 1.5px (docs/design/YON.md 5.2).
const ICONS = {
  receipt: <path d="M4 1.75h8v12.5l-1.33-1-1.34 1-1.33-1-1.33 1-1.34-1-1.33 1zM6.25 5.25h3.5M6.25 8h2.5" />,
  table: <><rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1" /><path d="M1.75 6.25h12.5M6 6.25v7" /></>,
  building: <path d="M2.75 14.25V2.75h7v11.5M9.75 6.25h3.5v8M1.5 14.25h13M5 5.25h2M5 8h2M5 10.75h2" />,
  // A list with two items ticked: the setup's steps.
  steps: <path d="M2.25 4.25l1.25 1.25 2.25-2.25M2.25 9.25l1.25 1.25 2.25-2.25M8.25 4.25h5.5M8.25 9.25h5.5M2.75 13.25h.01M8.25 13.25h5.5" />,
  // A closed envelope: e-Tebligat.
  envelope: <><rect x="1.75" y="3.25" width="12.5" height="9.5" rx="1" /><path d="M2 4l6 4.75L14 4" /></>,
  // A stack of tokens: kontör, not money in any one currency.
  coin: <><ellipse cx="8" cy="4.5" rx="5.25" ry="2" /><path d="M2.75 4.5v3.5c0 1.1 2.35 2 5.25 2s5.25-.9 5.25-2V4.5M2.75 8v3.5c0 1.1 2.35 2 5.25 2s5.25-.9 5.25-2V8" /></>,
};
const Icon = ({ name }: { name: keyof typeof ICONS }) => <svg className="rail-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">{ICONS[name]}</svg>;

/** Notices not yet marked seen, beside e-Tebligat. Nothing when there are none or the count cannot be read: never breaks a page. */
async function NoticeBadge() {
  // Both cached per render: the rail and the phone's quick link share one query.
  const n = await getSessionUser().then((u) => (u ? countNewNotices(u.id) : 0)).catch(() => 0);
  if (!n) return null;
  return <><span className="rail-badge" aria-hidden="true"><Odometer value={n > 99 ? "99+" : String(n)} /></span><span className="visually-hidden">, {n} yeni tebligat</span></>;
}

/**
 * Panel shell: a 64px rail with its labels always under the icons on desktop, a bottom bar on the phone
 * (Fişler, Fiş çek, Kurallar, Firmalar, Hesap). Theme and Çıkış live in the Hesap sheet.
 * `base` lets the dev preview (/onizleme/panel) keep its links inside the preview.
 */
/** `setup`: the first-run setup is not done yet (no firm from Luca), so its item shows until it is. `count`: false on loading screens. */
export function AppShell({ current, base = "/panel", email, firmId, setup = false, count = true, children }: { current: Current; base?: string; email?: string; firmId?: string | null; setup?: boolean; count?: boolean; children: ReactNode }) {
  const showSetup = setup || current === "kurulum";
  // The dev preview (another base) has no database: no count there.
  const badge = count && base === "/panel" ? <Suspense fallback={null}><NoticeBadge /></Suspense> : null;
  const item = (href: string, label: string, icon: keyof typeof ICONS, active: boolean, extra?: ReactNode) => (
    <Link className="rail-item" href={href} aria-current={active ? "page" : undefined}>
      <Icon name={icon} /><span className="rail-label">{label}</span>{extra}
    </Link>
  );
  return (
    // data-firm: the firm this page shows. Uploads and downloads send it, so a page left open in another tab never writes into
    // the firm chosen later (the cookie is only the default for the next page).
    <div className="app" data-screen={current} data-firm={firmId ?? undefined}>
      <FirmShortcut base={base} />
      <nav className="rail" aria-label="Panel">
        <Link className="rail-mark" href={base} translate="no"><BrandMark /><span className="rail-brand" aria-hidden="true">Accountie</span><span className="visually-hidden">Accountie, fiş listesi</span></Link>
        {showSetup ? <span className="rail-desktop">{item(`${base}/kurulum`, "Kurulum", "steps", current === "kurulum")}</span> : null}
        {item(base, "Fişler", "receipt", current === "fisler" || current === "fis")}
        <CaptureButton pickers={["camera"]} variant="rail" base={base} />
        {item(`${base}/kurallar`, "Kurallar", "table", current === "kurallar")}
        {item(`${base}/firmalar`, "Firmalar", "building", current === "firmalar")}
        <span className="rail-desktop">{item(`${base}/tebligatlar`, "e-Tebligat", "envelope", current === "tebligatlar", badge)}</span>
        <span className="rail-desktop">{item(`${base}/kontor`, "Kontör", "coin", current === "kontor")}</span>
        <div className="rail-end"><FoldButton /><AccountMenu email={email} here={current === "kurulum"} setup={showSetup && current !== "kurulum"} /></div>
      </nav>
      <nav className="panel-quick-links" aria-label="Tebligat ve kontör">
        <Link className="btn btn-sm" href={`${base}/tebligatlar`} aria-current={current === "tebligatlar" ? "page" : undefined}>e-Tebligat{badge}</Link>
        <Link className="btn btn-sm" href={`${base}/kontor`} aria-current={current === "kontor" ? "page" : undefined}>Kontör</Link>
      </nav>
      {children}
    </div>
  );
}
