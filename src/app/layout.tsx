import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Accountie", template: "%s · Accountie" },
  description: "Muhasebe ofisi beyan, ödeme ve mevzuat takip sistemi",
  icons: { icon: "/accountie-logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr" className={geistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
