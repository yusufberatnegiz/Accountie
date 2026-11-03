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
  // No themeColor and no JSX meta: the head script owns the one theme-color meta (src/lib/theme.ts).
};

// Marks <html> before first paint so the homepage's entrance animations run only with script, and not in a tab opened in
// the background. In the root layout (not the page), so it is also set when the homepage is reached by client navigation.
const JS_FLAG = "if(document.visibilityState!=='hidden')document.documentElement.classList.add('js')";

// Production only: public/sw.js serves public/cevrimdisi.html when a navigation fails offline (caches nothing else).
const SW_REGISTER = `if("serviceWorker" in navigator)addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){})})`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // suppressHydrationWarning: the theme script sets data-theme on <html> before React hydrates.
    <html lang="tr" className={`${text.variable} ${head.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT + ";" + JS_FLAG }} />
      </head>
      <body><a className="skip-link" href="#icerik">İçeriğe atla</a>{children}{process.env.NODE_ENV === "production" ? <script dangerouslySetInnerHTML={{ __html: SW_REGISTER }} /> : null}</body>
    </html>
  );
}
