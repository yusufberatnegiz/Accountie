import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Stack_Sans_Headline, Stack_Sans_Text } from "next/font/google";
import { HEAD_SCRIPT, SW_REGISTER } from "@/lib/csp";
import "./globals.css";

// Two families (docs/design/YON.md 6.3): Text for everything, Headline only for the homepage's large headings.
// next/font has no metrics for Stack Sans, so the metric-matched Arial fallbacks are declared in globals.css. Text is the variable file (200-700); both themes use the same weights, so a theme change never relayouts text (YON 23.23). display "swap": the web font always arrives on the first visit ("optional" left most cold visits in Arial); the fallbacks are set to the fonts' width and line box, so the swap keeps line breaks and CLS stays near 0 (YON 23.27).
const text = Stack_Sans_Text({ variable: "--font-stack-text", subsets: ["latin", "latin-ext"], weight: "variable", display: "swap", adjustFontFallback: false, fallback: ["Stack Sans Text Fallback"] });
const head = Stack_Sans_Headline({ variable: "--font-stack-head", subsets: ["latin", "latin-ext"], weight: ["300"], display: "swap", adjustFontFallback: false, fallback: ["Stack Sans Headline Fallback"] });

export const metadata: Metadata = {
  title: { default: "Accountie", template: "%s · Accountie" },
  description: "Yazar kasa fişinden Luca için yevmiye kaydı hazırlar.",
  appleWebApp: { capable: true, title: "Accountie", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192" }], apple: "/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // No themeColor and no JSX meta: the head script owns the one theme-color meta (src/lib/theme.ts).
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // suppressHydrationWarning: the theme script sets data-theme on <html> before React hydrates.
    <html lang="tr" className={`${text.variable} ${head.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
      </head>
      <body><a className="skip-link" href="#icerik">İçeriğe atla</a>{children}{process.env.NODE_ENV === "production" ? <script dangerouslySetInnerHTML={{ __html: SW_REGISTER }} /> : null}</body>
    </html>
  );
}
