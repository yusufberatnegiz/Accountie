import { AppShell } from "@/components/AppShell";

// The rules wait for one query; the real title and one line, no stand-in rows.
export default function Loading() {
  return (
    <AppShell current="kurallar">
      <main id="icerik" tabIndex={-1} className="canvas canvas-settings" aria-busy="true">
        <div className="title-row"><div className="title-text"><h1>Hesap kuralları</h1><p className="finding" role="status">Kurallar yükleniyor…</p></div></div>
      </main>
    </AppShell>
  );
}
