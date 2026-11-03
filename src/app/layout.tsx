import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Stack_Sans_Headline, Stack_Sans_Text } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Two families (docs/design/YON.md 6.3): Text for everything, Headline only for the homepage's large headings.
// next/font has no metrics for Stack Sans, so the metric-matched Arial fallbacks are declared in globals.css.
const text = Stack_Sans_Text({ variable: "--font-stack-text", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], display: "swap", adjustFontFallback: false, fallback: ["Stack Sans Text Fallback"] });
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1114" },
  ],
};

// Production only: public/sw.js serves public/cevrimdisi.html when a navigation fails offline (caches nothing else).
const SW_REGISTER = `if("serviceWorker" in navigator)addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // suppressHydrationWarning: the theme script sets data-theme on <html> before React hydrates.
    <html lang="tr" className={`${text.variable} ${head.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body><a className="skip-link" href="#icerik">İçeriğe atla</a>{children}{process.env.NODE_ENV === "production" ? <script dangerouslySetInnerHTML={{ __html: SW_REGISTER }} /> : null}</body>
    </html>
  );
}
