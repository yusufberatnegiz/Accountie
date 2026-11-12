"use client";

import { useState, type FormEvent } from "react";
import { PACKAGES, perCreditKurus, savingPercent, vatInsideKurus } from "@/lib/credits";
import { formatTrAmount } from "@/lib/money";

type Billing = { name: string; taxNumber: string; taxOffice: string | null; phone: string; address: string; city: string };
export type CreditUse = { firmId: string | null; name: string | null; used: number; documents: number };
export type Purchase = { id: string; packageId: string; credits: number; amountKurus: number; paidAt: Date | string | null };

const tl = (kurus: number) => `${formatTrAmount(kurus).replace(/,00$/, "")} TL`;
const count = (n: number) => n.toLocaleString("tr-TR");
const day = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }) : "-");

// What iyzico's callback says, in the buyer's words (src/app/api/payments/callback/route.ts).
const OUTCOME: Record<string, { text: string; error?: boolean }> = {
  tamam: { text: "Ödeme alındı. Kontörler bakiyenize eklendi." },
  hata: { text: "Ödeme tamamlanmadı ve kontör eklenmedi. Kart bilgilerini kontrol edip tekrar deneyebilirsiniz.", error: true },
  inceleme: { text: "Ödeme bankanın incelemesinde. Onaylanınca kontörler bakiyenize kendiliğinden eklenir." },
  bekliyor: { text: "Ödemenin sonucu henüz alınamadı. Birkaç dakika sonra bu sayfayı yenileyin; kontör eklenmediyse destek@accountie.app adresine yazın.", error: true },
};

/**
 * The kontör screen: the balance, the four packages (each with its per-receipt price and saving against the smallest),
 * the order summary with the invoice details, and what was used and bought. Paying happens on iyzico's own page.
 */
export function CreditsView({ balance, open, billing, usage, history, outcome, ranOut, endpoint = "/api/payments" }: {
  balance: number; open: boolean; billing: Billing | null; usage: CreditUse[]; history: Purchase[]; outcome?: string; ranOut?: number; endpoint?: string;
}) {
  const [picked, setPicked] = useState(PACKAGES[1].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pkg = PACKAGES.find((p) => p.id === picked) ?? PACKAGES[1];
  const done = outcome ? OUTCOME[outcome] : undefined;
  const usedTotal = usage.reduce((n, u) => n + u.used, 0);

  async function pay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !open) return;
    const data = new FormData(e.currentTarget);
    const field = (k: string) => String(data.get(k) ?? "").trim();
    setBusy(true);
    setError("");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packageId: pkg.id, billing: { name: field("ad"), taxNumber: field("vkn"), taxOffice: field("vd"), phone: field("tel"), address: field("adres"), city: field("il") } }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    if (!res?.ok || typeof body?.url !== "string") {
      setBusy(false);
      setError(body?.error ?? "Bağlantı kurulamadı. Tekrar deneyin.");
      return;
    }
    // iyzico's hosted page: the card is typed there, never here. The button stays busy until the page leaves.
    window.location.assign(body.url);
  }

  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-kontor">
      <div className="title-row">
        <div className="title-text">
          <h1>Kontör</h1>
          <p className="finding">Bir fiş ya da Z raporu 1, bir fatura 2 kontör. Bakiye bütün firmalarınızda ortaktır; kontörün süresi dolmaz.</p>
        </div>
      </div>

      {done ? <p className={done.error ? "alert alert-error" : "alert alert-ok"} role={done.error ? "alert" : "status"}>{done.text}</p> : null}
      {ranOut !== undefined ? (
        <p className="alert alert-warn" role="alert">{ranOut > 0 ? `${ranOut} fiş eklendi, ardından kontörünüz bitti.` : "Kontörünüz bitti."} Fiş okumaya devam etmek için bir paket seçin.</p>
      ) : null}

      <section className="panel kontor-balance" aria-labelledby="bakiye-baslik">
        <div>
          <h2 id="bakiye-baslik" className="kontor-label">Bakiye</h2>
          <p className="kontor-figure" data-negative={balance < 0 || undefined}><span className="tnum">{count(balance)}</span> <span className="kontor-unit">kontör</span></p>
        </div>
        <p className="kontor-note">
          {balance < 0
            ? `Son yüklemede bakiye ${count(balance)} kontöre indi. Bu açık, yükleyeceğiniz paketten düşülür.`
            : balance > 0 ? `Yaklaşık ${count(balance)} fiş ya da ${count(Math.floor(balance / 2))} fatura.` : "Fiş okumak için bir paket seçin."}
          {open ? null : " Satın alma yakında açılıyor; o zamana kadar fiş okumak için kontör gerekmiyor."}
        </p>
      </section>

      <div className="kontor-grid">
        <section className="panel kontor-packs" aria-labelledby="paket-baslik">
          <h2 id="paket-baslik">Paket seçin</h2>
          <div className="pack-list" role="radiogroup" aria-labelledby="paket-baslik">
            {PACKAGES.map((p) => {
              const saving = savingPercent(p);
              return (
                <label key={p.id} className="pack" data-selected={p.id === picked || undefined}>
                  <input className="visually-hidden" type="radio" name="paket" value={p.id} checked={p.id === picked} onChange={() => setPicked(p.id)} />
                  <span className="pack-head">
                    <span className="pack-name">{p.name}</span>
                    {saving ? <span className="pill pill-positive">Fiş başı %{saving} tasarruf</span> : null}
                  </span>
                  <span className="pack-credits"><span className="tnum">{count(p.credits)}</span> kontör</span>
                  <span className="pack-price tnum">{tl(p.priceKurus)}</span>
                  <span className="pack-unit">Fiş başı <span className="tnum">{formatTrAmount(perCreditKurus(p))}</span> TL</span>
                </label>
              );
            })}
          </div>
          <p className="hint">Fiyatlara KDV dahildir. Kontörün süresi dolmaz ve iade edilmez. Okunamayan belgeden kontör düşmez.</p>
        </section>

        <section className="panel kontor-pay" aria-labelledby="odeme-baslik">
          <h2 id="odeme-baslik">Ödeme</h2>
          <dl className="pay-summary">
            <div><dt>Paket</dt><dd>{pkg.name}, {count(pkg.credits)} kontör</dd></div>
            <div><dt>Fiş başı</dt><dd className="tnum">{formatTrAmount(perCreditKurus(pkg))} TL</dd></div>
            <div><dt>İçindeki KDV (%20)</dt><dd className="tnum">{formatTrAmount(vatInsideKurus(pkg.priceKurus))} TL</dd></div>
            <div className="pay-total"><dt>Ödenecek</dt><dd className="tnum">{tl(pkg.priceKurus)}</dd></div>
          </dl>
          <form className="pay-form" onSubmit={pay} aria-describedby={error ? "odeme-hata" : undefined}>
            <fieldset className="pay-billing">
              <legend>Fatura bilgileri</legend>
              <label className="span-all">Ad soyad ya da unvan<input className="field" name="ad" required minLength={3} maxLength={200} autoComplete="name" defaultValue={billing?.name} /></label>
              <label>VKN ya da TCKN<input className="field tnum" name="vkn" required inputMode="numeric" pattern="\d{10,11}" maxLength={11} autoComplete="off" defaultValue={billing?.taxNumber} /></label>
              <label>Vergi dairesi<input className="field" name="vd" placeholder="İsteğe bağlı" maxLength={80} autoComplete="off" defaultValue={billing?.taxOffice ?? ""} /></label>
              <label>Cep telefonu<input className="field tnum" name="tel" required type="tel" inputMode="tel" placeholder="05xx xxx xx xx" maxLength={16} autoComplete="tel" defaultValue={billing?.phone} /></label>
              <label>İl<input className="field" name="il" required minLength={2} maxLength={60} autoComplete="address-level1" defaultValue={billing?.city} /></label>
              <label className="span-all">Fatura adresi<textarea className="field" name="adres" required minLength={10} maxLength={300} rows={2} autoComplete="street-address" defaultValue={billing?.address} /></label>
            </fieldset>
            {error ? <p id="odeme-hata" className="alert alert-error" role="alert">{error}</p> : null}
            <button type="submit" className="btn btn-primary btn-lg pay-submit" aria-disabled={busy || !open || undefined}>
              {!open ? "Satın alma yakında açılıyor" : busy ? "Ödeme sayfası açılıyor…" : `${tl(pkg.priceKurus)} öde`}
            </button>
            <p className="hint">Kart bilgilerinizi iyzico&apos;nun güvenli ödeme sayfasında girersiniz; Accountie kart bilgisi görmez ve saklamaz. Ödeme 3D Secure ile onaylanır, tek çekim yapılır.</p>
          </form>
        </section>
      </div>

      <div className="kontor-grid kontor-records">
        <section className="panel kontor-usage" aria-labelledby="kullanim-baslik">
          <div className="kontor-section-head">
            <h2 id="kullanim-baslik">Bu ay firmalara göre</h2>
            <p className="hint">{usedTotal ? `${count(usedTotal)} kontör` : "Bu ay kontör kullanılmadı"}</p>
          </div>
          {usage.length ? (
            <table className="kontor-table">
              <thead><tr><th>Firma</th><th className="num">Belge</th><th className="num">Kontör</th></tr></thead>
              <tbody>
                {usage.map((u) => (
                  <tr key={u.firmId ?? "silinen"}><td>{u.name ?? <span className="muted">Silinen firma</span>}</td><td className="num tnum">{count(u.documents)}</td><td className="num tnum">{count(u.used)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted">Okunan her belge, yüklendiği firmanın satırına yazılır.</p>}
        </section>

        <section className="panel kontor-history" aria-labelledby="gecmis-baslik">
          <div className="kontor-section-head"><h2 id="gecmis-baslik">Satın almalar</h2></div>
          {history.length ? (
            <table className="kontor-table">
              <thead><tr><th>Tarih</th><th className="num">Kontör</th><th className="num">Tutar</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}><td>{day(h.paidAt)}</td><td className="num tnum">{count(h.credits)}</td><td className="num tnum">{tl(h.amountKurus)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className="muted">Henüz satın alma yok.</p>}
        </section>
      </div>
    </main>
  );
}
