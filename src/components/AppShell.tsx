import Link from "next/link";
import type { ReactNode } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { BrandMark } from "@/components/BrandMark";
import { CaptureButton } from "@/components/CaptureButton";
import "./panel/panel.css";

type Current = "fisler" | "fis" | "kurallar" | "firmalar";

// Drawn icons, 16px outline at 1.5px (docs/design/YON.md 5.2).
const ICONS = {
  receipt: <path d="M4 1.75h8v12.5l-1.33-1-1.34 1-1.33-1-1.33 1-1.34-1-1.33 1zM6.25 5.25h3.5M6.25 8h2.5" />,
  table: <><rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1" /><path d="M1.75 6.25h12.5M6 6.25v7" /></>,
  building: <path d="M2.75 14.25V2.75h7v11.5M9.75 6.25h3.5v8M1.5 14.25h13M5 5.25h2M5 8h2M5 10.75h2" />,
};
const Icon = ({ name }: { name: keyof typeof ICONS }) => <svg className="rail-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">{ICONS[name]}</svg>;

/**
 * Panel shell: a 64px rail with its labels always under the icons on desktop, a bottom bar on the phone
 * (Fişler, Fiş çek, Kurallar, Firmalar, Hesap). Theme and Çıkış live in the Hesap sheet.
 * `base` lets the dev preview (/onizleme/panel) keep its links inside the preview.
 */
export function AppShell({ current, base = "/panel", email, children }: { current: Current; base?: string; email?: string; children: ReactNode }) {
  const item = (href: string, label: string, icon: keyof typeof ICONS, active: boolean) => (
    <Link className="rail-item" href={href} aria-current={active ? "page" : undefined}>
      <Icon name={icon} /><span className="rail-label">{label}</span>
    </Link>
  );
  return (
    <div className="app" data-screen={current}>
      <nav className="rail" aria-label="Panel">
        <Link className="rail-mark" href={base} translate="no"><BrandMark /><span className="visually-hidden">Accountie, fiş listesi</span></Link>
        {item(base, "Fişler", "receipt", current === "fisler" || current === "fis")}
        <CaptureButton pickers={["camera"]} variant="rail" base={base} />
        {item(`${base}/kurallar`, "Kurallar", "table", current === "kurallar")}
        {item(`${base}/firmalar`, "Firmalar", "building", current === "firmalar")}
        <div className="rail-end"><AccountMenu email={email} /></div>
      </nav>
      {children}
    </div>
  );
}
