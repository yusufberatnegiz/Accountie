import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";

/**
 * The frames product pieces are shown in on the homepage (YON.md 23.2): an app window (36px bar with the mark and the screen's
 * name, no traffic lights or address bar) on its plate, and a phone drawn in CSS (bezel, pill-shaped camera cut, no brand).
 * Both are live HTML, so they are sharp at every DPR. Server and client safe.
 */
export function AppWindow({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <div className={`plated${className ? ` ${className}` : ""}`}>
      <div className="win" data-ui>
        <p className="win-bar"><BrandMark /><span>{title}</span></p>
        <div className="win-body">{children}</div>
      </div>
    </div>
  );
}

export function Phone({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`phone${className ? ` ${className}` : ""}`} data-ui>
      <div className="phone-screen">{children}</div>
    </div>
  );
}
