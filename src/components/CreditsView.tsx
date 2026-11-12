"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { PACKAGES, perCreditKurus, savingPercent, vatInsideKurus } from "@/lib/credits";
import { formatTrAmount } from "@/lib/money";

type Billing = { name: string; taxNumber: string; taxOffice: string | null; phone: string; address: string; city: string };
export type CreditUse = { firmId: string | null; name: string | null; used: number; documents: number };
export type Purchase = { id: string; packageId: string; credits: number; amountKurus: number; paidAt: Date | string | null };

const tl = (kurus: number) => `${formatTrAmount(kurus).replace(/,00$/, "")} TL`;
// A true minus sign: at display size the hyphen reads as a dash.
const count = (n: number) => (n < 0 ? `−${(-n).toLocaleString("tr-TR")}` : n.toLocaleString("tr-TR"));
const day = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }) : "-");

// What the payment's result was (src/lib/settle-payment.ts), in the buyer's words; green only for credits really added.
const OUTCOME: Record<string, { text: string; tone: "ok" | "error" | "warn" }> = {
  tamam: { text: "Ödeme alındı. Kontörler bakiyenize eklendi.", tone: "ok" },
  hata: { text: "Ödeme tamamlanmadı ve kontör eklenmedi. Kart bilgilerini kontrol edip tekrar deneyebilirsiniz.", tone: "error" },
  inceleme: { text: "Ödeme iyzico'nun güvenlik incelemesinde. Bu sayfa her açılışta sonucu yeniden sorar; onaylanınca kontörler bakiyenize eklenir.", tone: "warn" },
  bekliyor: { text: "Ödemenin sonucu henüz alınamadı. Bu sayfa her açılışta sonucu yeniden sorar. Kontör bir saat içinde eklenmezse", tone: "warn" },
};

// Server field names (BillingSchema) to the form's own.
const FIELD: Record<string, string> = { name: "ad", taxNumber: "vkn", taxOffice: "vd", phone: "tel", address: "adres", city: "il" };

/**
 * The kontör screen, after Anthropic's billing page: the balance first and large, quiet package cards (each with its
 * per-receipt price and the saving against the smallest), and one order column that names the amount on its button.
 * Paying happens on iyzico's own page. `open`: purchases can be taken; `required`: reading needs credits (KONTOR_ZORUNLU).
 */
export function CreditsView({ balance, open, required, billing, usage, history, outcome, added, ranOut, endpoint = "/api/payments" }: {
  balance: number; open: boolean; required: boolean; billing: Billing | null; usage: CreditUse[]; history: Purchase[]; outcome?: string; added?: number; ranOut?: number; endpoint?: string;
}) {
  const [picked, setPicked] = useState(PACKAGES[1].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const message = useRef<HTMLParagraphElement>(null);
  const pkg = PACKAGES.find((p) => p.id === picked) ?? PACKAGES[1];
  const done = outcome ? OUTCOME[outcome] : undefined;
  // Only while it is still true: after a purchase the same address no longer says the balance ran out.
  const showRanOut = ranOut !== undefined && balance <= 0;
  const usedTotal = usage.reduce((n, u) => n + u.used, 0);

  // A result arriving with the page (back from iyzico, or sent here by an upload) is read out first, not found by scrolling,
  // and leaves the address: a bookmark or a reload never shows it again.
  useEffect(() => {
    message.current?.focus();
    const url = new URL(location.href);
    if (url.searchParams.has("odeme") || url.searchParams.has("bitti")) {
      url.searchParams.delete("odeme");
      url.searchParams.delete("bitti");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  }, []);
  // A field the server refused: opened and focused once the form is out of its busy state (inert would swallow the focus).
  useEffect(() => {
    if (!error?.field || busy) return;
    document.getElementById("fatura")?.setAttribute("open", "");
    document.querySelector<HTMLInputElement>(`[name="${error.field}"]`)?.focus();
  }, [error, busy]);
  // Back from iyzico through the browser's history: the page comes from its cache with the button still busy.
  useEffect(() => {
    const restore = (e: PageTransitionEvent) => { if (e.persisted) setBusy(false); };
    addEventListener("pageshow", restore);
    return () => removeEventListener("pageshow", restore);
  }, []);

  async function pay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !open) return;
    const data = new FormData(e.currentTarget);
    const field = (k: string) => String(data.get(k) ?? "").trim();
    setBusy(true);
    setError(null);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ packageId: pkg.id, billing: { name: field("ad"), taxNumber: field("vkn"), taxOffice: field("vd"), phone: field("tel"), address: field("adres"), city: field("il") } }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    if (!res?.ok || typeof body?.url !== "string") {
      setBusy(false);
      const at = typeof body?.field === "string" ? FIELD[body.field] : undefined;
      setError({ text: body?.error ?? "Bağlantı kurulamadı. Tekrar deneyin.", field: at });
      return;
    }
    // iyzico's hosted page: the card is typed there, never here. The button stays busy until the page leaves.
    window.location.assign(body.url);
  }

  // The error is read with the field it is about: described by it as well as named in aria-errormessage.
  const fieldError = (name: string) => (error?.field === name ? <span className="field-error" aria-hidden="true">{error.text}</span> : null);
  const invalid = (name: string, hint?: string) => (error?.field === name
    ? { "aria-invalid": true, "aria-errormessage": "odeme-hata", "aria-describedby": hint ? `${hint} odeme-hata` : "odeme-hata" }
    : hint ? { "aria-describedby": hint } : {});
  const balanceNote = !open ? "Satın alma yakında açılıyor; o zamana kadar fiş okuma ücretsiz."
    : balance < 0 ? `Son yüklemede bakiye ${count(balance)} kontöre indi. Bu açık, yükleyeceğiniz paketten düşülür.${required ? " Yeni belge okumak için bir paket seçin." : ""}`
    : balance > 0 ? `Yaklaşık ${count(balance)} fiş ya da ${count(Math.floor(balance / 2))} fatura.${required ? "" : " Fiş okuma şimdilik ücretsiz; kontörünüz zorunluluk başlayınca kullanılmaya başlar."}`
    : !required ? "Fiş okuma şimdilik ücretsiz; kontör zorunlu olmadan önce e-postayla haber verilir."
    : showRanOut ? "Bakiye bitti." : "Fiş okumak için bir paket seçin.";

  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-kontor">
      <div className="title-row">
        <div className="title-text">
          <h1>Kontör</h1>
          <p className="finding">Bir fiş ya da Z raporu 1, bir fatura 2 kontör. Bakiye bütün firmalarınızda ortaktır; kontörün süresi dolmaz.</p>
        </div>
      </div>

      {done ? (
        <p ref={message} tabIndex={-1} className={done.tone === "ok" ? "alert alert-ok" : done.tone === "error" ? "alert alert-error" : "alert alert-warn"} role={done.tone === "error" ? "alert" : "status"}>
          {outcome === "tamam" && added ? `Ödeme alındı. ${count(added)} kontör bakiyenize eklendi.` : done.text}{outcome === "bekliyor" ? <> <a href="mailto:destek@accountie.app">destek@accountie.app</a> adresine yazın.</> : null}
        </p>
      ) : showRanOut ? (
        <p ref={message} tabIndex={-1} className="alert alert-warn" role="alert">{ranOut > 0 ? `${ranOut} belge eklendi, ardından kontörünüz bitti.` : "Kontörünüz bitti."} Fiş okumaya devam etmek için bir paket seçin.</p>
      ) : null}

      <section className="panel kontor-balance" aria-labelledby="bakiye-baslik">
        <div>
          <h2 id="bakiye-baslik" className="kontor-label">Bakiye</h2>
          <p className="kontor-figure" data-negative={balance < 0 || undefined}>
            {/* The minus sign alone may go unread at a screen reader's default punctuation level; the word is said instead. */}
            <span className="tnum">{balance < 0 ? <><span aria-hidden="true">−</span><span className="visually-hidden">eksi </span>{count(-balance)}</> : count(balance)}</span> <span className="kontor-unit">kontör</span>
          </p>
        </div>
        <p className="kontor-note">{balanceNote}</p>
      </section>

      <div className="kontor-grid">
        <div className="kontor-main">
          <section className="panel kontor-packs" aria-labelledby="paket-baslik">
            <h2 id="paket-baslik">Paket seçin</h2>
            <div className="pack-list" role="radiogroup" aria-labelledby="paket-baslik" inert={busy || undefined}>
              {PACKAGES.map((p) => {
                const saving = savingPercent(p);
                return (
                  <label key={p.id} className="pack" data-selected={p.id === picked || undefined}>
                    <input className="visually-hidden" type="radio" name="paket" value={p.id} checked={p.id === picked} onChange={() => { setPicked(p.id); setError(null); }} />
                    <span className="pack-head">
                      <span className="pack-name">{p.name}</span>
                      {saving ? <span className="pill pill-positive">Fiş başı %{saving} tasarruf</span> : null}
                    </span>
                    <span className="pack-credits"><span className="tnum">{count(p.credits)}</span> kontör</span>
                    <span className="pack-price tnum">{tl(p.priceKurus)}</span>
                    <span className="pack-unit"><span className="tnum">{formatTrAmount(perCreditKurus(p))}</span> TL / fiş</span>
                  </label>
                );
              })}
            </div>
            <p className="hint">Fiyatlara KDV dahildir. Kontörün süresi dolmaz ve iade edilmez. Satıcısı ve toplamı okunamayan belgeden kontör düşmez.</p>
            {/* On a phone the order column is far below: the choice and a way down to it, right under the cards. */}
            <p className="pack-chosen"><span>Seçilen: {pkg.name}, <span className="tnum">{tl(pkg.priceKurus)}</span></span><a href="#odeme-baslik">Ödemeye geç</a></p>
          </section>

          <section className="panel kontor-usage" aria-labelledby="kullanim-baslik">
            <div className="kontor-section-head">
              <h2 id="kullanim-baslik">Bu ay firmalara göre</h2>
              {usedTotal ? <p className="hint"><span className="tnum">{count(usedTotal)}</span> kontör</p> : null}
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
            ) : <p className="kontor-empty">Bu ay kontör kullanılmadı. Okunan her belge, yüklendiği firmanın satırına yazılır.</p>}
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
            ) : <p className="kontor-empty">Henüz satın alma yok.</p>}
          </section>
        </div>

        <section className="panel kontor-pay" aria-labelledby="odeme-baslik">
          <h2 id="odeme-baslik">Ödeme</h2>
          <dl className="pay-summary">
            <div><dt>Paket</dt><dd>{pkg.name}, {count(pkg.credits)} kontör</dd></div>
            <div><dt>Fiş başı</dt><dd className="tnum">{formatTrAmount(perCreditKurus(pkg))} TL</dd></div>
            <div><dt>İçindeki KDV (%20)</dt><dd className="tnum">{formatTrAmount(vatInsideKurus(pkg.priceKurus))} TL</dd></div>
            <div className="pay-total"><dt>Ödenecek</dt><dd className="tnum">{tl(pkg.priceKurus)}</dd></div>
          </dl>
          {/* POST without script (a tap before hydration): the invoice details go in the body, never into the address. */}
          <form className="pay-form" method="post" onSubmit={pay}>
            {/* Saved details fold to one line, so the button sits under the total; a new buyer gets the open form. */}
            {/* Nothing to fill while purchases are closed; while the payment page opens, the details stay as typed but out of reach. */}
            {open ? <details id="fatura" className="pay-details" open={!billing || undefined} inert={busy || undefined}>
              <summary>
                <span className="pay-details-title">Fatura bilgileri</span>
                {billing ? <span className="pay-details-who">{billing.name}, {billing.city}</span> : null}
                {billing ? <span className="pay-details-edit" aria-hidden="true">Değiştir</span> : null}
              </summary>
              <fieldset className="pay-billing">
                <legend className="visually-hidden">Fatura bilgileri</legend>
                <label className="span-all">Ad soyad ya da unvan<input className="field" name="ad" required minLength={3} maxLength={200} autoComplete="name" defaultValue={billing?.name} {...invalid("ad")} />{fieldError("ad")}</label>
                <label>VKN ya da TCKN<input className="field tnum" name="vkn" required inputMode="numeric" pattern="\d{10,11}" maxLength={11} autoComplete="off" title="10 haneli VKN ya da 11 haneli TCKN" defaultValue={billing?.taxNumber} {...invalid("vkn", "vkn-ipucu")} />
                  <span id="vkn-ipucu" className="hint">10 haneli VKN ya da 11 haneli TCKN</span>{fieldError("vkn")}</label>
                <label>Vergi dairesi<input className="field" name="vd" placeholder="İsteğe bağlı" maxLength={80} autoComplete="off" defaultValue={billing?.taxOffice ?? ""} {...invalid("vd")} />{fieldError("vd")}</label>
                <label>Cep telefonu<input className="field tnum" name="tel" required type="tel" inputMode="tel" placeholder="05xx xxx xx xx" maxLength={16} autoComplete="tel" defaultValue={billing?.phone} {...invalid("tel")} />{fieldError("tel")}</label>
                <label>İl<input className="field" name="il" required minLength={2} maxLength={60} autoComplete="address-level1" defaultValue={billing?.city} {...invalid("il")} />{fieldError("il")}</label>
                <label className="span-all">Fatura adresi<textarea className="field" name="adres" required minLength={10} maxLength={300} rows={2} autoComplete="street-address" defaultValue={billing?.address} {...invalid("adres")} />{fieldError("adres")}</label>
              </fieldset>
            </details> : <p className="hint">Satın alma açılınca fatura bilgilerinizi burada girersiniz.</p>}
            <button type="submit" className="btn btn-primary btn-lg pay-submit" disabled={!open || undefined} aria-busy={busy || undefined} aria-describedby={error ? "odeme-hata" : undefined}>
              {!open ? "Satın alma yakında açılıyor" : busy ? <>Ödeme sayfası açılıyor<span className="wait-dots" aria-hidden="true"><i /><i /><i /></span></> : `${tl(pkg.priceKurus)} öde`}
            </button>
            {error ? <p id="odeme-hata" className="alert alert-error" role="alert">{error.text}</p> : null}
            {open ? <p className="hint">
              Ödeyerek <Link href="/kosullar#k-5" prefetch={false}>Kullanım Koşullarını</Link> (6. madde: kontör ve iade) ve <Link href="/mesafeli-satis" prefetch={false}>Mesafeli Hizmet Satış Sözleşmesini</Link> kabul edersiniz.
              Kart bilgilerinizi iyzico&apos;nun güvenli ödeme sayfasında girersiniz; Accountie kart bilgisi görmez ve saklamaz. Tek çekim yapılır.
            </p> : null}
          </form>
        </section>
      </div>
    </main>
  );
}
