"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BrandMark } from "@/components/BrandMark";
import { extensionInstalled, importRunning, offerToken } from "@/lib/extension-bridge";
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
// About a minute and a half of nothing: say what usually stops it.
const HINT_AFTER = 22;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Chrome extensions install only in desktop Chrome (and other desktop Chromium browsers); a phone or another browser is told.
const noop = () => () => {};
const desktopChromium = () => /Chrome\//.test(navigator.userAgent) && !/Android|Mobile|iPhone|iPad/.test(navigator.userAgent);

const Check = ({ className = "" }: { className?: string }) => (
  <svg className={`setup-check ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
const Dots = () => <span className="wait-dots" aria-hidden="true"><i /><i /><i /></span>;

/**
 * First-run setup: install the extension, connect it to the account, bring the firms in from Luca. Each step is checked
 * before the next opens (the extension answers a ping; it takes the key; the server sees firms from Luca), and step 3
 * checks by itself every few seconds while the tab is visible. `demo` (the dev preview) answers every check by itself.
 */
export function SetupWizard({ initialStep, initialFirms = 0, base = "/panel", demo = false }: { initialStep: Step; initialFirms?: number; base?: string; demo?: boolean }) {
  const [step, setStep] = useState<Step>(initialStep);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note>(null);
  const [firms, setFirms] = useState(initialFirms);
  const [paused, setPaused] = useState(false);
  const canInstall = useSyncExternalStore(noop, desktopChromium, () => true);
  const heading = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(initialStep);
  const advance = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // A new step is announced and focused (a keyboard or screen-reader user lands on it); the first render is left alone.
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    heading.current?.focus();
  }, [step]);
  useEffect(() => () => clearTimeout(advance.current), []);
  useEffect(() => {
    if (initialStep !== 1 || demo) return;
    let alive = true;
    extensionInstalled().then((found) => { if (alive && found) setStep((s) => (s === 1 ? 2 : s)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arrival
  }, []);

  // Any move by hand cancels a pending automatic one (Geri during the short "done" pause).
  const go = (next: Step) => { clearTimeout(advance.current); setNote(null); setStep(next); };
  const done = (text: string, next: Step) => {
    setNote({ tone: "ok", text });
    clearTimeout(advance.current);
    advance.current = setTimeout(() => { setNote(null); setStep(next); }, 1100);
  };

  async function checkInstalled() {
    if (busy) return;
    setBusy(true);
    setNote({ tone: "wait", text: "Eklenti aranıyor" });
    const found = demo ? (await wait(700), true) : await extensionInstalled();
    setBusy(false);
    if (found) return done("Eklenti kurulu.", 2);
    setNote({ tone: "error", text: "Eklenti bulunamadı. Chrome'a ekledikten sonra bu sayfayı yenileyip tekrar Kontrol et'e basın." });
  }

  async function connect() {
    if (busy) return;
    setBusy(true);
    setNote({ tone: "wait", text: "Eklentiye bağlanıyor" });
    let ok = false;
    if (demo) { await wait(800); ok = true; }
    else {
      const res = await fetch("/api/extension-tokens", { method: "POST" }).catch(() => null);
      if (res?.status === 401) { setBusy(false); setNote({ tone: "error", text: "Oturumunuz kapandı. Tekrar giriş yapıp bu sayfaya dönün." }); return; }
      if (!res?.ok) { setBusy(false); setNote({ tone: "error", text: "Anahtar oluşturulamadı. Biraz sonra tekrar deneyin." }); return; }
      const token = ((await res.json()) as { token?: string }).token;
      ok = token ? await offerToken(token) : false;
      // A key no extension took is withdrawn, so the account never looks connected when it is not.
      if (token && !ok) await fetch("/api/extension-tokens", { method: "DELETE" }).catch(() => null);
    }
    setBusy(false);
    if (ok) return done("Eklenti hesabınıza bağlandı.", 3);
    setNote({ tone: "error", text: "Eklentiye ulaşılamadı. Eklentinin kurulu olduğunu kontrol edin (1. adım), bu sayfayı yenileyip tekrar bağlayın." });
  }

  // Step 3 checks on its own while it is open and the tab is visible; a closed session stops it with a message.
  useEffect(() => {
    if (step !== 3) return;
    let alive = true, tries = 0, last = 0, stable = 0, timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (document.visibilityState === "hidden") { timer = setTimeout(tick, POLL_MS); return; }
      tries++;
      let n = 0;
      if (demo) n = tries >= 3 ? 12 : tries === 2 ? 5 : 0;
      else {
        const res = await fetch("/api/kurulum", { cache: "no-store" }).catch(() => null);
        if (res?.status === 401) { if (alive) setNote({ tone: "error", text: "Oturumunuz kapandı. Tekrar giriş yapıp bu sayfaya dönün." }); return; }
        n = res?.ok ? ((await res.json()) as { lucaFirms?: number }).lucaFirms ?? 0 : 0;
      }
      if (!alive) return;
      stable = n > 0 && n === last ? stable + 1 : 0;
      last = n;
      if (n > 0) {
        // The extension says when its import ends; a version that cannot (before 0.6.1) needs the count to hold for 20 s.
        const running = demo ? tries < 4 : await importRunning();
        if (!alive) return;
        if (running === false || (running === null && stable >= 5)) { setFirms(n); done(`${n} firma Luca'dan alındı.`, 4); return; }
        setNote({ tone: "wait", text: `${n} firma geldi, okuma sürüyor` });
      }
      else if (tries === HINT_AFTER) setNote({ tone: "wait", text: "Hâlâ bekleniyor. Luca sekmesinin açık olduğundan ve eklenti sekmesinde Başlat'a bastığınızdan emin olun; orada bir hata görünüyorsa oradaki talimatı izleyin" });
      timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, demo ? 1500 : POLL_MS);
    return () => { alive = false; clearTimeout(timer); };
  }, [step, demo]);

  // The rail runs between the first and the last dot: it reaches the current step's dot.
  const progress = step >= 3 ? 1 : (step - 1) / 2;
  // Step 3 waits for the extension; until a result arrives, the wait itself is what the page says.
  const shown: Note = note ?? (step === 3 ? { tone: "wait", text: "Firmalar bekleniyor" } : null);
  const noteLine = (
    <p className={shown ? `setup-note setup-note-${shown.tone}` : "setup-note"} aria-hidden="true">
      {shown?.tone === "ok" ? <Check /> : null}{shown?.text}{shown?.tone === "wait" ? <Dots /> : null}
    </p>
  );
  const onPhone = !canInstall && step < 4 ? (
    <p className="setup-device">Bu adımlar bilgisayarda, Chrome tarayıcısında yapılır. Bilgisayarınızda accountie.app&apos;e girip Kurulum&apos;u açın.</p>
  ) : null;
  const live = !demo && !canInstall && step < 4;

  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-setup">
      <div className="title-row">
        <div className="title-text">
          <h1>Kurulum</h1>
          <p className="finding">Üç adımda Accountie&apos;yi Luca&apos;ya bağlayın. Her adım kontrol edilir, doğruysa bir sonraki açılır.</p>
        </div>
      </div>

      <div className="setup-progress">
        <span className="setup-rail" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></span>
        <ol className="setup-steps" aria-label="Kurulum adımları">
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
      </div>

      {/* Outside the card that remounts per step, so each result is announced (the visible line is its picture). */}
      <p role="status" className="visually-hidden">{shown?.text ?? ""}</p>

      <section key={step} className="panel setup-card" aria-labelledby="setup-title">
        <div className="setup-copy">
          <h2 id="setup-title" ref={heading} tabIndex={-1}>
            {step === 1 ? "Eklentiyi Chrome'a ekleyin" : step === 2 ? "Eklentiyi hesabınıza bağlayın" : step === 3 ? "Luca'dan firmalarınızı çekin" : "Kurulum tamam"}
          </h2>
          {onPhone}

          {step === 1 ? (
            <>
              <p>Accountie Luca Doldurucu, onayladığınız fişlerin satırlarını Luca&apos;nın Fiş Detayı ekranına yazar ve ekrandan geri okuyup karşılaştırır.</p>
              <ol className="setup-howto">
                <li><a href={EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer">Chrome Web Store sayfasını<span className="visually-hidden">, yeni sekmede açılır,</span></a> açın.</li>
                <li><b>Chrome&apos;a ekle</b>&apos;ye basıp onaylayın.</li>
                <li>Bu sayfayı yenileyin; eklenti bulununca 2. adım kendiliğinden açılır. Açılmazsa <b>Kontrol et</b>&apos;e basın.</li>
              </ol>
              {live ? null : (
                <div className="setup-actions">
                  <a className="btn" href={EXTENSION_STORE_URL} target="_blank" rel="noopener noreferrer">Chrome Web Store&apos;da aç<span className="visually-hidden">, yeni sekmede açılır</span></a>
                  <button type="button" className="btn btn-primary" onClick={checkInstalled} aria-disabled={busy || undefined}>{busy ? <>Kontrol ediliyor<Dots /></> : "Kontrol et"}</button>
                </div>
              )}
              {noteLine}
            </>
          ) : step === 2 ? (
            <>
              <p>Tek tıkla bağlanır: eklenti, onaylı fişlerinizi Accountie&apos;den alabilmek için bir anahtar alır. Anahtar yalnız bu bilgisayarın tarayıcısında durur; başka bir bilgisayarda bağlarsanız buradaki bağlantı kapanır. Luca şifrenizi istemez.</p>
              <div className="setup-actions">
                {live ? null : <button type="button" className="btn btn-primary" onClick={connect} aria-disabled={busy || undefined}>{busy ? <>Bağlanıyor<Dots /></> : "Eklentiye bağla"}</button>}
                <button type="button" className="btn btn-quiet" onClick={() => go(1)}>Geri</button>
              </div>
              {noteLine}
              {note?.tone === "error" ? <p className="setup-fallback">Otomatik olmuyorsa anahtarı elle de verebilirsiniz: <Link href={`${base}/kurallar#eklenti`}>Kurallar sayfasındaki Eklenti anahtarı</Link>.</p> : null}
            </>
          ) : step === 3 ? (
            <>
              <p>Eklenti, Luca&apos;da açık olan firmalarınızın unvanını, vergi numarasını ve hesap planını Accountie&apos;ye alır. Hesap kodlarınız böylece her firmada kendi planından gelir.</p>
              <ol className="setup-howto">
                <li>Luca&apos;ya her zamanki gibi girin.</li>
                <li>Chrome&apos;un sağ üstündeki yapboz simgesinden (Uzantılar) <b>Accountie Luca Doldurucu</b>&apos;yu açın.</li>
                <li><b>Luca&apos;dan firmaları çek</b>&apos;e, açılan sekmede <b>Başlat</b>&apos;a basın. Okuma bitene kadar Luca&apos;da çalışmayın; bitince bu sayfa kendiliğinden ilerler.</li>
              </ol>
              {noteLine}
              <div className="setup-actions">
                <button type="button" className="btn btn-quiet" onClick={() => go(2)}>Geri</button>
              </div>
            </>
          ) : (
            <>
              <p><b>{firms > 0 ? `${firms.toLocaleString("tr-TR")} firma` : "Firmalarınız"}</b> Luca&apos;dan Accountie&apos;ye geldi. Artık fişin fotoğrafını çekebilir, satırları kontrol edip eklentiyle Luca&apos;ya yazabilirsiniz.</p>
              <div className="setup-actions">
                <Link className="btn btn-primary" href={base}>Fişlere geçin</Link>
                <Link className="btn" href={`${base}/kurallar`}>Hesap kodlarını kontrol edin</Link>
              </div>
            </>
          )}
        </div>

        <div className="setup-scene-wrap">
          <Scene step={step} paused={paused} />
          {step < 4 ? (
            <button type="button" className="btn btn-quiet btn-sm setup-pause" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
              {paused ? "Oynat" : "Duraklat"}<span className="visually-hidden"> (canlandırma)</span>
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}

/** One looping picture per step (setup.css), pausable; still on reduced motion, and only decoration for assistive technology. */
function Scene({ step, paused }: { step: Step; paused: boolean }) {
  const p = paused ? "true" : undefined;
  if (step === 1) {
    return (
      <div className="setup-scene scene-store" data-paused={p} aria-hidden="true">
        <div className="sc-win">
          <div className="sc-bar"><i /><i /><i /><span className="sc-url">chromewebstore.google.com</span><span className="sc-puzzle" /></div>
          <div className="sc-body">
            <div className="sc-app"><span className="sc-icon"><BrandMark /></span><span className="sc-lines"><b>Accountie Luca Doldurucu</b><small>accountie.app</small></span></div>
            <span className="sc-add">Chrome&apos;a ekle</span>
          </div>
        </div>
        <span className="sc-cursor" />
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="setup-scene scene-link" data-paused={p} aria-hidden="true">
        <span className="sc-node sc-node-a">Accountie</span>
        <span className="sc-path"><span className="sc-key"><svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4" /><path d="M12 12h9M18 12v3M21 12v2" /></svg></span></span>
        <span className="sc-node sc-node-b">Eklenti<Check className="sc-ok" /></span>
      </div>
    );
  }
  if (step === 3) {
    const rows = ["ÖRNEK BALIK LOKANTASI", "ÖRNEK KIRTASİYE", "ÖRNEK İNŞAAT LTD.", "ÖRNEK PETROL"];
    return (
      <div className="setup-scene scene-firms" data-paused={p} aria-hidden="true">
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
