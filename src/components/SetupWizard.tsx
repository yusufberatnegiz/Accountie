"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { extensionInstalled, offerToken } from "@/lib/extension-bridge";
import { EXTENSION_STORE_URL } from "@/lib/extension-id";
import "./panel/setup.css";

type Step = 1 | 2 | 3 | 4;
type Note = { tone: "ok" | "error" | "wait"; text: string } | null;

const STEPS = [
  { n: 1, short: "Eklentiyi kurun" },
  { n: 2, short: "Hesabınıza bağlayın" },
  { n: 3, short: "Firmaları çekin" },
] as const;

const POLL_MS = 4000;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const Check = ({ className = "" }: { className?: string }) => (
  <svg className={`setup-check ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

/**
 * First-run setup: install the extension, connect it to the account, bring the firms in from Luca. Each step is checked
 * before the next opens (the extension answers a ping; it takes the key; the server sees firms from Luca), and step 3
 * checks by itself every few seconds. `demo` (the dev preview) answers every check without an extension or a server.
 */
export function SetupWizard({ initialStep, initialFirms = 0, base = "/panel", demo = false }: { initialStep: Step; initialFirms?: number; base?: string; demo?: boolean }) {
  const [step, setStep] = useState<Step>(initialStep);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [firms, setFirms] = useState(initialFirms);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // A new step is announced and focused, so a keyboard or screen-reader user lands on it (not on load).
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    heading.current?.focus();
  }, [step]);

  const go = (next: Step) => { setNote(null); setStep(next); };
  const done = (text: string, next: Step) => { setNote({ tone: "ok", text }); setTimeout(() => go(next), 1100); };

  async function checkInstalled() {
    if (busy) return;
    setBusy(true);
    setNote({ tone: "wait", text: "Eklenti aranıyor" });
    const found = demo ? (await wait(700), true) : await extensionInstalled();
    setBusy(false);
    if (found) return done("Eklenti kurulu.", 2);
    setNote({ tone: "error", text: "Eklenti bulunamadı. Chrome Web Store'da Chrome'a ekle'ye bastıktan sonra bu sayfayı yenileyip tekrar kontrol edin." });
  }

  async function connect() {
    if (busy) return;
    setBusy(true);
    setNote({ tone: "wait", text: "Eklentiye bağlanıyor" });
    let ok = false;
    if (demo) { await wait(800); ok = true; }
    else {
      const res = await fetch("/api/extension-tokens", { method: "POST" }).catch(() => null);
      const token = res?.ok ? ((await res.json()) as { token?: string }).token : undefined;
      ok = token ? await offerToken(token) : false;
    }
    setBusy(false);
    if (ok) return done("Eklenti hesabınıza bağlandı.", 3);
    setNote({ tone: "error", text: "Eklentiye ulaşılamadı. Eklentinin kurulu olduğunu kontrol edin (1. adım), sonra tekrar bağlayın." });
  }

  // Step 3 checks on its own while it is open: the firms arrive when the user presses the button in the extension.
  useEffect(() => {
    if (step !== 3) return;
    let alive = true, tries = 0;
    const tick = async () => {
      tries++;
      const n = demo ? (tries >= 3 ? 12 : 0) : await fetch("/api/kurulum", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null), () => null).then((s) => s?.lucaFirms ?? 0);
      if (!alive) return;
      if (n > 0) {
        setFirms(n);
        setNote({ tone: "ok", text: `${n} firma Luca'dan alındı.` });
        timer = setTimeout(() => { setNote(null); setStep(4); }, 1100);
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    };
    let timer = setTimeout(tick, demo ? 1500 : POLL_MS);
    return () => { alive = false; clearTimeout(timer); };
  }, [step, demo]);

  const progress = step === 4 ? 1 : (step - 1) / 3;
  // Step 3 waits for the extension; until a result arrives, the wait itself is what the page says.
  const shown: Note = note ?? (step === 3 ? { tone: "wait", text: "Firmalar bekleniyor" } : null);

  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-setup">
      <div className="title-row">
        <div className="title-text">
          <h1>Kurulum</h1>
          <p className="finding">Üç adımda Accountie&apos;yi Luca&apos;ya bağlayın. Her adım kontrol edilir, doğruysa bir sonraki açılır.</p>
        </div>
      </div>

      <ol className="setup-steps" aria-label="Kurulum adımları">
        <span className="setup-rail" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></span>
        {STEPS.map((s) => {
          const state = step > s.n ? "done" : step === s.n ? "now" : "next";
          return (
            <li key={s.n} className="setup-step" data-state={state} aria-current={state === "now" ? "step" : undefined}>
              <span className="setup-dot">{state === "done" ? <Check /> : s.n}</span>
              <span className="setup-step-label">{s.short}<span className="visually-hidden">{state === "done" ? ", tamamlandı" : state === "now" ? ", şu anki adım" : ""}</span></span>
            </li>
          );
        })}
      </ol>

      <section key={step} className="panel setup-card" aria-labelledby="setup-title">
        <div className="setup-copy">
          {step < 4 ? <p className="setup-count">Adım {step} / 3</p> : null}
          <h2 id="setup-title" ref={heading} tabIndex={-1}>
            {step === 1 ? "Eklentiyi Chrome'a ekleyin" : step === 2 ? "Eklentiyi hesabınıza bağlayın" : step === 3 ? "Luca'dan firmalarınızı çekin" : "Kurulum tamam"}
          </h2>

          {step === 1 ? (
            <>
              <p>Accountie Luca Doldurucu, onayladığınız fişlerin satırlarını Luca&apos;nın Fiş Detayı ekranına yazar ve ekrandan geri okuyup karşılaştırır.</p>
              <ol className="setup-howto">
                <li>Chrome Web Store sayfasını açın.</li>
                <li><b>Chrome&apos;a ekle</b>&apos;ye basıp onaylayın.</li>
                <li>Bu sayfaya dönüp <b>Kontrol et</b>&apos;e basın.</li>
              </ol>
              <div className="setup-actions">
                <a className="btn" href={EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer">Chrome Web Store&apos;da aç</a>
                <button type="button" className="btn btn-primary" onClick={checkInstalled} aria-busy={busy || undefined}>Kontrol et</button>
              </div>
            </>
          ) : step === 2 ? (
            <>
              <p>Tek tıkla bağlanır: eklenti, onaylı fişlerinizi Accountie&apos;den alabilmek için bir anahtar alır. Anahtar yalnız bu bilgisayarın tarayıcısında durur. Luca şifrenizi istemez.</p>
              <div className="setup-actions">
                <button type="button" className="btn btn-primary" onClick={connect} aria-busy={busy || undefined}>Eklentiye bağla</button>
                <button type="button" className="btn btn-quiet" onClick={() => go(1)}>Geri</button>
              </div>
            </>
          ) : step === 3 ? (
            <>
              <p>Eklenti, Luca&apos;da açık olan firmalarınızın unvanını, vergi numarasını ve hesap planını Accountie&apos;ye alır. Hesap kodlarınız böylece her firmada kendi planından gelir.</p>
              <ol className="setup-howto">
                <li>Luca&apos;ya her zamanki gibi girin.</li>
                <li>Chrome&apos;un sağ üstündeki eklenti simgesinden <b>Accountie Luca Doldurucu</b>&apos;yu açın.</li>
                <li><b>Luca&apos;dan firmaları çek</b>&apos;e basın.</li>
              </ol>
              <p className="setup-hint">Firmalar gelince bu sayfa kendiliğinden ilerler.</p>
              <div className="setup-actions">
                <button type="button" className="btn btn-quiet" onClick={() => go(2)}>Geri</button>
              </div>
            </>
          ) : (
            <>
              <p><b>{firms > 0 ? `${firms.toLocaleString("tr-TR")} firma` : "Firmalarınız"}</b> Luca&apos;dan Accountie&apos;ye geldi. Artık fişin fotoğrafını çekebilir, satırları kontrol edip eklentiyle Luca&apos;ya yazabilirsiniz.</p>
              <div className="setup-actions">
                <Link className="btn btn-primary" href={base}>İlk fişi çekin</Link>
                <Link className="btn" href={`${base}/kurallar`}>Hesap kodlarını kontrol edin</Link>
              </div>
            </>
          )}

          {/* Always mounted, so a screen reader hears each result. */}
          <p role="status" className={shown ? `setup-note setup-note-${shown.tone}` : "setup-note"}>
            {shown?.tone === "ok" ? <Check /> : null}
            {shown?.text}
            {shown?.tone === "wait" ? <span className="wait-dots" aria-hidden="true"><i /><i /><i /></span> : null}
          </p>
        </div>

        <Scene step={step} />
      </section>
    </main>
  );
}

/** One looping picture per step (setup.css); still on reduced motion, and only decoration for assistive technology. */
function Scene({ step }: { step: Step }) {
  if (step === 1) {
    return (
      <div className="setup-scene scene-store" aria-hidden="true">
        <div className="sc-win">
          <div className="sc-bar"><i /><i /><i /><span className="sc-url">chromewebstore.google.com</span><span className="sc-puzzle" /></div>
          <div className="sc-body">
            <div className="sc-app"><span className="sc-icon" /><span className="sc-lines"><b>Accountie Luca Doldurucu</b><small>accountie.app</small></span></div>
            <span className="sc-add">Chrome&apos;a ekle</span>
          </div>
        </div>
        <span className="sc-cursor" />
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="setup-scene scene-link" aria-hidden="true">
        <span className="sc-node sc-node-a">Accountie</span>
        <span className="sc-path" />
        <span className="sc-key"><svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4" /><path d="M12 12h9M18 12v3M21 12v2" /></svg></span>
        <span className="sc-node sc-node-b">Eklenti<Check className="sc-ok" /></span>
      </div>
    );
  }
  if (step === 3) {
    const rows = ["ÖRNEK BALIK LOKANTASI", "ÖRNEK KIRTASİYE", "ÖRNEK İNŞAAT LTD.", "ÖRNEK PETROL"];
    return (
      <div className="setup-scene scene-firms" aria-hidden="true">
        <div className="sc-list sc-from"><b>Luca</b>{rows.map((r) => <span key={r}>{r}</span>)}</div>
        <div className="sc-list sc-to"><b>Accountie</b>{rows.map((r, i) => <span key={r} style={{ animationDelay: `${0.5 + i * 0.45}s` }}>{r}</span>)}</div>
      </div>
    );
  }
  return (
    <div className="setup-scene scene-done" aria-hidden="true">
      <span className="sc-burst" />
      <span className="sc-big"><Check /></span>
    </div>
  );
}
