"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * The last resort when the root layout itself fails: reported to Sentry, and a plain Turkish page with a way back
 * (the layout's styles and fonts are gone at this point, so it stands on its own).
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html lang="tr">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8f4ed", color: "#241e18", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 420, padding: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 500, margin: "0 0 12px" }}>Bir şeyler ters gitti</h1>
          <p style={{ margin: "0 0 20px", lineHeight: 1.5 }}>Sayfa yüklenemedi. Hata kaydedildi. Tekrar deneyin; sorun sürerse destek@accountie.app adresine yazın.</p>
          <button type="button" onClick={reset} style={{ font: "inherit", fontWeight: 600, padding: "10px 18px", borderRadius: 999, border: 0, background: "#241e18", color: "#f8f4ed", cursor: "pointer" }}>Tekrar dene</button>
        </main>
      </body>
    </html>
  );
}
