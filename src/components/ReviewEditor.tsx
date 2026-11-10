"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, useTransition, ViewTransition } from "react";
import type { ReceiptDetail, VendorRule } from "@/db/queries";
import { ACCOUNT_CODE_PATTERN, PAYMENT_ALTERNATIVES, PAYMENT_LABELS, type Account, type PaymentMethod, type Rules } from "@/lib/default-rules";
import { approvalProblem, type JournalLine } from "@/lib/journal";
import { clipboardText } from "@/lib/luca/clipboard";
import { formatTrAmount, parseTrAmount } from "@/lib/money";
import { STATUS_LABELS } from "@/lib/status";
import { getPhoto } from "@/lib/photo-store";
import { moveOnly } from "@/lib/view-transition";
import { CaptureButton } from "./CaptureButton";
import { ExportButton } from "./ExportButton";
import { Odometer, Roll } from "./home/Odometer";
import { useLeaveGuard } from "./useLeaveGuard";

type EditLine = Omit<JournalLine, "debitKurus" | "creditKurus"> & { key: number; debit: string; credit: string };
type SharedField = "documentNo" | "documentDate" | "documentType" | "description";

const noSubscribe = () => () => {};
// Keys come from the line index, so the server and the browser render the same data-key (no module counter across requests).
const toEdit = (l: JournalLine, i: number): EditLine => {
  const { debitKurus, creditKurus, ...rest } = l;
  return { ...rest, key: i, debit: debitKurus ? formatTrAmount(debitKurus) : "", credit: creditKurus ? formatTrAmount(creditKurus) : "" };
};

/** "" -> 0, invalid -> NaN. */
function kurus(text: string): number {
  if (!text.trim()) return 0;
  try {
    return parseTrAmount(text);
  } catch {
    return NaN;
  }
}

const signature = (ls: EditLine[]) => JSON.stringify(ls.map(({ key, ...rest }) => rest));

const toLine = ({ key, debit, credit, ...rest }: EditLine): JournalLine => ({ ...rest, debitKurus: kurus(debit), creditKurus: kurus(credit) });

// Warning codes that mean "the reader was unsure about this field".
const AMOUNT_WARNINGS = ["amount_unreadable", "total_mismatch", "vat_mismatch", "vat_computed", "vat_missing", "rounding_adjusted", "extraction_failed"];
// Warnings about one header field; they clear once that field is edited.
const WARNING_FIELD: Record<string, string> = { date_invalid: "documentDate", date_unusual: "documentDate", receipt_no_unsure: "documentNo", payment_unsure: "credit" };

type Source = "base" | "vat" | "total";
/** Where a journal line's figure was read on the receipt: the fiş izi (docs/design/YON.md 5.3). */
const sourceOf = (code: string, creditKurus: number): Source => (creditKurus > 0 ? "total" : code.startsWith("191") ? "vat" : "base");
const trDate = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : null);

/** The field that fixes an approval problem, and the words for the button that takes the user there.
 *  On an imbalance the side whose sum differs from the receipt total is the wrong one; its first line is the target. */
export function problemTarget(problem: string, lines: JournalLine[] = [], totalKurus: number | null = null): { id: string; action: string } {
  const row = /^(\d+)\. satırda (hesap kodu)?/.exec(problem);
  if (row) return row[2] ? { id: `satir-${row[1]}-kod`, action: `${row[1]}. satırın hesap kodunu girin` } : { id: `satir-${row[1]}-borc`, action: `${row[1]}. satırın tutarını düzeltin` };
  if (problem.startsWith("Evrak tarihi") || problem.startsWith("Satırlarda evrak tarihi")) return { id: "evrak-tarihi", action: "Evrak tarihini girin" };
  if (problem.startsWith("Evrak no")) return { id: "evrak-no", action: "Evrak numarasını girin" };
  if (problem.startsWith("Satır yok")) return { id: "satir-ekle", action: "Satır ekleyin" };
  if (problem.startsWith("Borç ile alacak") && totalKurus !== null) {
    const debitOff = lines.reduce((s, l) => s + l.debitKurus, 0) !== totalKurus;
    const creditOff = lines.reduce((s, l) => s + l.creditKurus, 0) !== totalKurus;
    const at = debitOff === creditOff ? -1 : lines.findIndex((l) => (creditOff ? l.creditKurus : l.debitKurus) > 0);
    if (at >= 0) return creditOff ? { id: `satir-${at + 1}-alacak`, action: `${at + 1}. satırın alacağını düzeltin` } : { id: `satir-${at + 1}-borc`, action: `${at + 1}. satırın borcunu düzeltin` };
  }
  return { id: "satir-1-borc", action: problem.startsWith("Borç ile alacak") ? "Tutarları düzeltin" : "Tutar biçimini düzeltin" };
}

const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";

/** Scrolls the field into view, clear of the sticky bar, focuses it and gives it one small pulse once the scroll lands. */
function goTo(el: HTMLElement | null) {
  const reduced = still();
  el?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  el?.focus({ preventScroll: true });
  if (!reduced) el?.animate([{ transform: "none" }, { transform: "scale(1.04)" }, { transform: "none" }], { duration: 280, delay: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
}

/** The other draft to open once this one is done, and how many drafts wait besides this one. */
export type NextDraft = { id: string; left: number } | null;

export function ReviewEditor({ receipt, rules, next = null, learned = null, base = "/panel" }: { receipt: ReceiptDetail; rules: Rules; next?: NextDraft; learned?: VendorRule | null; base?: string }) {
  const router = useRouter();
  const editable = receipt.status === "draft";
  const [lines, setLines] = useState(() => receipt.lines.map(toEdit));
  const nextKey = useRef(receipt.lines.length);
  const [savedSignature, setSavedSignature] = useState(() => signature(lines));
  const dirty = editable && signature(lines) !== savedSignature;
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  // A saved action keeps its buttons off until the refreshed receipt arrives, so Onayla never flashes back on.
  const [refreshing, startRefresh] = useTransition();
  const [approved, setApproved] = useState(false);
  const working = busy || refreshing;
  const refresh = () => startRefresh(() => router.refresh());
  const [allWarnings, setAllWarnings] = useState(false);
  const [trace, setTrace] = useState<Source | null>(null);
  const [shownStatus, setShownStatus] = useState(receipt.status);
  if (receipt.status !== shownStatus) {
    setShownStatus(receipt.status);
    setApproved(false);
  }
  const [copied, setCopied] = useState(false);
  // Lines on screen when it opened; a line added later comes in with a short drop (YON 23.4.6).
  const [firstKeys] = useState(() => new Set(lines.map((l) => l.key)));
  const tbody = useRef<HTMLTableSectionElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const flip = useRef<Map<string, number> | null>(null);
  // After a line is removed, the ones below slide up from where they were (FLIP), transform only.
  useLayoutEffect(() => {
    const before = flip.current;
    flip.current = null;
    if (!before || !tbody.current) return;
    for (const row of tbody.current.rows) {
      const dy = (before.get(row.dataset.key ?? "") ?? 0) - row.getBoundingClientRect().top;
      if (dy) row.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 180, easing: EASE_OUT });
    }
  }, [lines]);
  const removeLine = (key: number) => {
    const rows = [...(tbody.current?.rows ?? [])];
    let gone = false;
    const done = () => {
      if (gone) return;
      gone = true;
      flip.current = new Map(rows.map((r) => [r.dataset.key ?? "", r.getBoundingClientRect().top]));
      setLines((ls) => ls.filter((x) => x.key !== key));
    };
    const row = rows.find((r) => r.dataset.key === String(key));
    // A hidden tab's animation clock stops, so the delete never waits on it there; the timer is the fallback if the tab hides mid-exit.
    if (!row || still() || document.visibilityState !== "visible") return done();
    row.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(-4px)" }], { duration: 140, easing: "cubic-bezier(0.55, 0.055, 0.675, 0.19)", fill: "forwards" }).finished.then(done, done);
    setTimeout(done, 200);
  };
  // Approve and reopen re-lay the screen (the header fields move between their card and the strip over the lines):
  // the blocks that stay slide from where they were, transform only, no height animation (YON 23.16).
  const lockFlip = useRef<Map<Element, number> | null>(null);
  // The title moves too: a shorter locked page can pull the scroll back, and a still title would sit under the sliding blocks.
  // Inside the lines panel the swap is in place (inputs to text, the header strip fades in); only whole blocks slide.
  const flipTargets = () => [...(reviewRef.current?.parentElement?.querySelectorAll(":scope > .title-row, .review > :not(.trace-link), .source > *, .head-strip") ?? [])];
  const measureLock = () => { lockFlip.current = still() ? null : new Map(flipTargets().map((el) => [el, el.getBoundingClientRect().top])); };
  useLayoutEffect(() => {
    const before = lockFlip.current;
    lockFlip.current = null;
    if (!before) return;
    const targets = flipTargets();
    const shift = new Map(targets.map((el) => [el, before.has(el) ? before.get(el)! - el.getBoundingClientRect().top : NaN]));
    for (const el of targets) {
      const dy = shift.get(el)!;
      // A block that was not there (the header strip, the fields card) fades in where it lands.
      if (Number.isNaN(dy)) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: EASE_OUT });
      else {
        // A nested block moves with its parent's slide; only its own share is added.
        const own = dy - ((el.parentElement && shift.get(el.parentElement)) || 0);
        if (Math.abs(own) > 1) el.animate([{ transform: `translateY(${own}px)` }, { transform: "none" }], { duration: 180, easing: EASE_OUT });
      }
    }
  }, [editable]);
  // Fiş izi link: one curve from the journal line to the receipt figure it came from, only while the two columns sit side by side.
    const [link, setLink] = useState<{ x: number; y: number; w: number; h: number; p: number; q: number; fromRight: boolean } | null>(null);
  const traceOn = (src: Source, row: HTMLElement) => {
    setTrace(src);
    const root = reviewRef.current;
    const to = root?.querySelector<HTMLElement>(`.read-values > [data-src="${src}"]`);
    if (!root || !to || !matchMedia("(min-width: 1100px)").matches) return setLink(null);
    const o = root.getBoundingClientRect(), a = row.getBoundingClientRect(), b = to.getBoundingClientRect();
    // The receipt column sits left of the lines; the curve runs across the gutter between them and opens from the line's side.
    const rowY = a.top + a.height / 2 - o.top, srcY = b.top + b.height / 2 - o.top;
    const [x1, y1, x2, y2] = b.right <= a.left ? [b.right, srcY, a.left, rowY] : [a.right, rowY, b.left, srcY];
    if (x2 - x1 < 8) return setLink(null);
    // shortcut: measured on enter; a sticky receipt column scrolled under a hovered line leaves the curve stale until the next enter.
    const y = Math.min(y1, y2) - 4;
    setLink({ x: x1 - o.left - 4, y, w: x2 - x1 + 8, h: Math.abs(y2 - y1) + 8, p: y1 - y, q: y2 - y, fromRight: b.right <= a.left });
  };
  const traceOff = () => { setTrace(null); setLink(null); };
  // When the status changes the pressed button is gone: focus moves to the next draft, or to the sentence that says what happened.
  const statusLine = useRef<HTMLParagraphElement>(null);
  const lastStatus = useRef(receipt.status);
  useEffect(() => {
    if (lastStatus.current === receipt.status) return;
    lastStatus.current = receipt.status;
    const nextLink = document.querySelector<HTMLElement>(".bar-next-draft");
    (nextLink?.offsetParent ? nextLink : statusLine.current)?.focus({ preventScroll: true });
  }, [receipt.status]);
  const invoice = receipt.model === "e-fatura"; // imported from GİB XML (src/app/api/efatura): there is no photo to compare
  // Photo exists only in this tab; server render has none.
  const photo = useSyncExternalStore(noSubscribe, () => getPhoto(receipt.id), () => undefined);
  // Below 1100px the photo is a thumbnail over the lines that opens in place, so a line and the receipt share one screen.
  const [photoOpen, setPhotoOpen] = useState(false);
  const thumbRef = useRef<HTMLImageElement>(null);

  useLeaveGuard(dirty);

  const parsed = lines.map(toLine);
  const invalid = parsed.some((l) => Number.isNaN(l.debitKurus) || Number.isNaN(l.creditKurus));
  const sum = (f: (l: JournalLine) => number) => parsed.reduce((s, l) => s + (Number.isNaN(f(l)) ? 0 : f(l)), 0);
  const debit = sum((l) => l.debitKurus);
  const credit = sum((l) => l.creditKurus);
  const vat = sum((l) => (l.accountCode.startsWith("191") ? l.debitKurus : 0));
  // The strip shows the same values as the action bar in the same frame; while keys come (until a 300ms pause) its figures
  // swap without rolling, and a whole-line change (delete) rolls.
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (!typing) return;
    const t = setTimeout(() => setTyping(false), 300);
    return () => clearTimeout(t);
  }, [typing, lines]);
  const problem = invalid ? "Tutar biçimi hatalı." : approvalProblem(parsed);
  const creditCode = parsed.find((l) => l.creditKurus > 0)?.accountCode ?? "";
  const head = lines[0];

  const codes = receipt.warnings.map((w) => w.code);
  const amountsUnsure = codes.some((c) => AMOUNT_WARNINGS.includes(c));
  // A flag stays until the user touches that field.
  const flagged = (name: string, unsure: boolean) => editable && unsure && !seen.has(name);
  // A field warning goes away once the user has edited that field, like its flag.
  const warnings = receipt.warnings.filter((w) => !(editable && seen.has(WARNING_FIELD[w.code] ?? "")));
  const flag = (on: boolean) => (on ? { "data-check": "", ...(warnings.length ? { "aria-describedby": "uyarilar" } : {}) } : {});
  const checkNote = (on: boolean) => (on ? <span className="check-note">Kontrol edin</span> : null);
  const headFlags = {
    documentNo: flagged("documentNo", codes.includes("extraction_failed") || codes.includes("receipt_no_unsure") || !head?.documentNo),
    documentDate: flagged("documentDate", codes.includes("date_invalid") || codes.includes("date_unusual") || !head?.documentDate),
    credit: flagged("credit", codes.includes("payment_unsure")),
    description: flagged("description", codes.includes("extraction_failed") || !head?.description),
  };
  const touch = (name: string) => !seen.has(name) && setSeen((s) => new Set(s).add(name));

  const update = (key: number, patch: Partial<EditLine>) => {
    setTyping(true);
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };
  const updateAll = (field: SharedField, value: string | null) => {
    touch(field);
    setLines((ls) => ls.map((l) => ({ ...l, [field]: value })));
  };
  const setCreditAccount = (code: string) => {
    const account = PAYMENT_ALTERNATIVES.find((a) => a.code === code);
    if (account) setLines((ls) => ls.map((l) => (kurus(l.credit) > 0 ? { ...l, accountCode: account.code, accountName: account.name } : l)));
  };
  const knownAccounts: Account[] = [...Object.values(rules.expense), ...Object.values(rules.vat), ...Object.values(rules.payment), ...PAYMENT_ALTERNATIVES];
  const setCode = (key: number, code: string) => {
    const name = knownAccounts.find((a) => a.code === code.trim())?.name;
    update(key, name ? { accountCode: code, accountName: name } : { accountCode: code });
  };
  // Phone: a line shows only the side it carries; an empty line keeps the side picked for it, and a switch moves the amount across.
  const [picked, setPicked] = useState<Record<number, "debit" | "credit">>({});
  const sideOf = (l: EditLine) => (l.debit && l.credit ? "both" : l.credit ? "credit" : l.debit ? "debit" : picked[l.key] ?? "debit");
  const setSide = (l: EditLine, side: "debit" | "credit") => {
    setPicked((p) => ({ ...p, [l.key]: side }));
    const [here, there] = side === "debit" ? [l.debit, l.credit] : [l.credit, l.debit];
    if (there && !here) {
      touch(`${side}-${l.key}`);
      update(l.key, side === "debit" ? { debit: there, credit: "" } : { credit: there, debit: "" });
    }
  };
  const addLine = () => setLines((ls) => [...ls, { ...ls[0], key: nextKey.current++, accountCode: "", accountName: "", debit: "", credit: "" }]);

  async function call(url: string, init?: RequestInit): Promise<boolean> {
    const res = await fetch(url, init).catch(() => null);
    if (res?.ok) return true;
    const body = res ? await res.json().catch(() => null) : null;
    setError(body?.error ?? (res ? "Sunucu isteği işleyemedi. Tekrar deneyin." : "Bağlantı kurulamadı. Tekrar deneyin."));
    return false;
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setInfo("");
    await action();
    setBusy(false);
  }

  const save = () => {
    if (invalid) {
      setError("Tutarları 7.931,82 biçiminde yazın.");
      return Promise.resolve(false);
    }
    const sent = signature(lines);
    return call(`/api/receipts/${receipt.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ lines: parsed }) })
      .then((ok) => {
        if (ok) setSavedSignature(sent);
        return ok;
      });
  };

  const copy = () => navigator.clipboard.writeText(clipboardText(parsed)).then(() => {
    setInfo("Satırlar panoya kopyalandı.");
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, () => setError("Panoya kopyalanamadı."));

  // What the receipt said, from the lines as first built (the reader's values); the editor's lines may differ after edits.
  const readVat = receipt.lines.reduce((s, l) => s + (l.accountCode.startsWith("191") ? l.debitKurus : 0), 0);
  const readTotal = receipt.totalKurus;
  const vknUnsure = receipt.warnings.some((w) => w.code === "tax_number_invalid");
  const gap = Math.abs(debit - credit);
  const finding = invalid ? "Tutar biçimi hatalı: tutarları 7.931,82 biçiminde yazın."
    : receipt.status === "exported" ? `Borç ve alacak ${formatTrAmount(debit)} TL ile dengede. Luca'ya aktarıldı.`
    : receipt.status === "approved" ? `Borç ve alacak ${formatTrAmount(debit)} TL ile dengede. Onaylandı, Luca dosyasına girer.`
    : gap ? `Fark ${formatTrAmount(gap)} TL: borç ile alacak tutmuyor.`
    : problem ?? `Borç ${formatTrAmount(debit)}, alacak ${formatTrAmount(credit)}. Onaya hazır.`;
  const findingOff = invalid || (editable && !!problem);
  const target = editable && problem ? problemTarget(problem, parsed, receipt.totalKurus) : null;
  // With an invalid amount the first flagged field is the one to fix, wherever it is.
  // The bar keeps its sentence while the field it pointed to has focus: the reason must stay in view as the keyboard opens.
  const [pointed, setPointed] = useState(false);
  const fix = () => {
    let el = (invalid ? document.querySelector<HTMLInputElement>('.journal [aria-invalid="true"]') : null) ?? (target ? document.getElementById(target.id) : null);
    // On the phone a line hides its empty side; the visible amount is the field to fix.
    if (el && !el.offsetParent) el = document.getElementById(el.id.replace("-borc", "-alacak")) ?? el;
    if (!el) return;
    setPointed(true);
    el.addEventListener("blur", () => setPointed(false), { once: true });
    goTo(el);
  };
  const traced = (s: Source) => (trace === s ? { "data-traced": "" } : {});
  const deleteQuestion = receipt.receiptNo ? `${receipt.receiptNo} numaralı fişi silmek istiyor musunuz?` : "Bu taslak fişi silmek istiyor musunuz?";
  const read = (v: string | null | undefined) => v ?? <span className="dash">Okunamadı</span>;

  return (
    <>
      <div className="title-row">
        <div className="title-text">
          <p className="crumb"><Link href={base}>Fişler</Link><span aria-hidden="true"> / </span><span translate="no">Fiş {receipt.receiptNo ?? "numarasız"}</span></p>
          <div className="title-line">
            {/* The list row's vendor name morphs into this title (ReceiptListView). */}
            <ViewTransition name={`fis-${receipt.id}`} share="title-morph" default="none" onShare={(i) => moveOnly(i)}>
              <h1 title={receipt.vendorName ?? undefined}>{receipt.vendorName ?? "Okunamayan fiş"}</h1>
            </ViewTransition>
            <span className={`status status-${receipt.status}`}><Roll value={STATUS_LABELS[receipt.status]} /></span>
          </div>
          <p className={findingOff ? "finding finding-off" : "finding"}>
            {target ? <button className="link-button" type="button" onClick={fix}>{finding}</button> : finding}
          </p>
        </div>
      </div>

      <div className="review" ref={reviewRef}>
        {link ? (
          <svg key={`${link.x} ${link.y} ${link.q}`} className="trace-link" data-from-right={link.fromRight || undefined} aria-hidden="true" focusable="false" width={link.w} height={link.h} style={{ left: link.x, top: link.y }}>
            <path d={`M4 ${link.p}C${link.w / 2} ${link.p} ${link.w / 2} ${link.q} ${link.w - 4} ${link.q}`} />
            <circle cx={4} cy={link.p} r={2.5} /><circle cx={link.w - 4} cy={link.q} r={2.5} />
          </svg>
        ) : null}
        {/* Below 1100px the receipt column falls under the lines: its three figures sit above them, so the spotlight lands on screen. */}
        <div className="read-brief">
          {photo ? (
            <button className="brief-thumb" type="button" aria-expanded={photoOpen} aria-controls="fis-onizleme" aria-label="Fiş fotoğrafı" onClick={() => setPhotoOpen((o) => !o)}>
              {/* The reading screen's photo lands here (CaptureButton, "fis-okundu"); its resize runs as a scale. */}
              <ViewTransition name="fis-foto" share="photo-morph" default="none" onShare={(i) => moveOnly(i, thumbRef.current)}>
                {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL from this device, next/image cannot optimize it */}
                <img ref={thumbRef} src={photo} alt="" width={36} height={48} />
              </ViewTransition>
            </button>
          ) : null}
          <dl aria-label="Fişten okunan, özet">
          <div data-src="base" {...traced("base")}><dt>Matrah</dt><dd className="num">{readTotal !== null ? formatTrAmount(readTotal - readVat) : <span className="dash">-</span>}</dd></div>
          <div data-src="vat" {...traced("vat")}><dt>KDV</dt><dd className="num">{formatTrAmount(readVat)}</dd></div>
          <div data-src="total" {...traced("total")}><dt>Toplam</dt><dd className="num">{readTotal !== null ? formatTrAmount(readTotal) : <span className="dash">-</span>}</dd></div>
          </dl>
          {/* With a photo the thumbnail takes this slot; the read fields follow the lines anyway. */}
          {photo ? null : <a href="#fis-kaynak">Tüm alanlar</a>}
        </div>
        {photo && photoOpen ? (
          <figure className="brief-photo" id="fis-onizleme">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL from this device, next/image cannot optimize it */}
            <img src={photo} alt="Fiş fotoğrafı" width={1200} height={1600} />
          </figure>
        ) : null}
        {warnings.length ? (
          <div className="alert alert-warn" id="uyarilar">
            <p className="alert-title">Kontrol edilecekler</p>
            {/* On the phone two notes show and the rest fold, so the first screen still reaches the journal lines. */}
            <ul className="notes" data-folded={!allWarnings && warnings.length > 3 ? "" : undefined}>{warnings.map((w, i) => <li key={w.code} tabIndex={i === 2 ? -1 : undefined}>{w.message}</li>)}</ul>
            {!allWarnings && warnings.length > 3 ? <button className="link-button warn-more" type="button" onClick={() => { setAllWarnings(true); requestAnimationFrame(() => document.querySelector<HTMLElement>("#uyarilar li:nth-child(3)")?.focus()); }}>{warnings.length - 2} uyarı daha</button> : null}
          </div>
        ) : null}

        <section className="panel" aria-labelledby="satir-baslik">
          <div className="panel-head">
            <h2 id="satir-baslik">Yevmiye satırları</h2>
            {editable ? (
              <label className="inline-field"><span>Alacak hesabı {checkNote(headFlags.credit)}</span>
                <select className="field" value={PAYMENT_ALTERNATIVES.some((a) => a.code === creditCode) ? creditCode : ""} {...flag(headFlags.credit)}
                  onChange={(e) => { touch("credit"); setCreditAccount(e.target.value); }}>
                  {PAYMENT_ALTERNATIVES.some((a) => a.code === creditCode) ? null : <option value="">{creditCode || "Seçin"}</option>}
                  {PAYMENT_ALTERNATIVES.map((a) => <option key={a.code} value={a.code}>{a.code} {a.label}</option>)}
                </select>
              </label>
            ) : null}
          </div>
          {/* Locked: the header fields every line carries, one strip over the lines in the balance strip's rhythm. */}
          {!editable ? (
            <dl className="head-strip" aria-label="Fiş bilgileri">
              <div><dt>Evrak No</dt><dd className="tnum" translate="no">{head?.documentNo || <span className="dash">-</span>}</dd></div>
              <div><dt>Evrak tarihi</dt><dd className="tnum">{trDate(head?.documentDate ?? null) ?? <span className="dash">-</span>}</dd></div>
              <div><dt>Belge türü (BT)</dt><dd>{head?.documentType || <span className="dash">-</span>}</dd></div>
              <div><dt>Açıklama</dt><dd>{head?.description || <span className="dash">-</span>}</dd></div>
            </dl>
          ) : null}
          <table className="journal">
            <thead>
              <tr>
                <th className="col-code">Hesap kodu</th><th>Hesap adı</th><th className="col-amount num">Borç (TL)</th><th className="col-amount num">Alacak (TL)</th>
                {editable ? <th className="col-del"><span className="visually-hidden">Sil</span></th> : null}
              </tr>
            </thead>
            <tbody ref={tbody}>
              {lines.map((l, i) => {
                const codeFlag = flagged(`code-${l.key}`, !l.accountCode);
                const debitFlag = flagged(`debit-${l.key}`, amountsUnsure && !!l.debit);
                const creditFlag = flagged(`credit-${l.key}`, amountsUnsure && !!l.credit);
                const unsure = (on: boolean) => (on ? ", kontrol edin" : "");
                const src = sourceOf(l.accountCode, kurus(l.credit) || 0);
                const side = sideOf(l);
                return (
                <tr key={l.key} data-key={l.key} data-side={side} data-new={firstKeys.has(l.key) ? undefined : ""} {...traced(src)} onMouseEnter={(e) => traceOn(src, e.currentTarget)} onMouseLeave={traceOff} onFocus={(e) => traceOn(src, e.currentTarget)} onBlur={traceOff}>
                  {/* No inputMode: the iOS Turkish decimal pad has a comma but no dot, and codes need dots (191.03.10). */}
                  <td data-label="Hesap kodu"><input id={`satir-${i + 1}-kod`} autoComplete="off" className="field tnum" aria-label={`Satır ${i + 1} hesap kodu${unsure(codeFlag)}`} value={l.accountCode} disabled={!editable}
                    autoCapitalize="off" autoCorrect="off" spellCheck={false} translate="no" placeholder="770.08…" aria-invalid={!!l.accountCode && !ACCOUNT_CODE_PATTERN.test(l.accountCode.trim())}
                    {...flag(codeFlag)} onChange={(e) => { touch(`code-${l.key}`); setCode(l.key, e.target.value); }} />{checkNote(codeFlag)}</td>
                  {/* A textarea so a long name wraps on the phone instead of being cut; it stays one line of text (no line breaks). */}
                  <td data-label="Hesap adı"><textarea rows={1} autoComplete="off" className="field name-field" aria-label={`Satır ${i + 1} hesap adı`} value={l.accountName} disabled={!editable}
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} onChange={(e) => update(l.key, { accountName: e.target.value.replace(/\s*\n\s*/g, " ") })} /></td>
                  <td data-label="Borç (TL)" className="col-amount"><input id={`satir-${i + 1}-borc`} autoComplete="off" className="field num to-luca" aria-label={`Satır ${i + 1} borç${unsure(debitFlag)}`} value={l.debit} disabled={!editable} inputMode="decimal" aria-invalid={Number.isNaN(kurus(l.debit))}
                    {...flag(debitFlag)} onChange={(e) => { touch(`debit-${l.key}`); update(l.key, { debit: e.target.value }); }} />{checkNote(debitFlag)}</td>
                  <td data-label="Alacak (TL)" className="col-amount"><input id={`satir-${i + 1}-alacak`} autoComplete="off" className="field num to-luca" aria-label={`Satır ${i + 1} alacak${unsure(creditFlag)}`} value={l.credit} disabled={!editable} inputMode="decimal" aria-invalid={Number.isNaN(kurus(l.credit))}
                    {...flag(creditFlag)} onChange={(e) => { touch(`credit-${l.key}`); update(l.key, { credit: e.target.value }); }} />{checkNote(creditFlag)}</td>
                  {editable ? <td className="col-del">
                    <span className="side-switch" role="group" aria-label={`Satır ${i + 1} tarafı`}>
                      {(["debit", "credit"] as const).map((s) => <button key={s} className="side-opt" type="button" aria-pressed={side === s} onClick={() => setSide(l, s)}>{s === "debit" ? "Borç" : "Alacak"}</button>)}
                    </span>
                    <button className="btn btn-quiet btn-sm" type="button" aria-label={`Satır ${i + 1} sil`} disabled={lines.length <= 1} onClick={() => ((!l.debit && !l.credit) || confirm(`Satır ${i + 1} (${l.accountCode || "hesap kodu yok"}) silinsin mi?`)) && removeLine(l.key)}>Sil</button></td> : null}
                </tr>
                );
              })}
            </tbody>
          </table>
          {editable ? <div className="journal-add"><button id="satir-ekle" className="btn btn-sm" type="button" disabled={working} onClick={addLine}>Satır ekle</button></div> : null}
          <dl className="balance-strip" data-balanced={!gap && !invalid ? "" : undefined}>
            <div><dt>Borç toplamı</dt><dd className="num"><Odometer value={formatTrAmount(debit)} instant={typing} /></dd></div>
            <div><dt>Alacak toplamı</dt><dd className="num"><Odometer value={formatTrAmount(credit)} instant={typing} /></dd></div>
            <div><dt>KDV (191)</dt><dd className="num"><Odometer value={formatTrAmount(vat)} instant={typing} /></dd></div>
            <div className="balance-answer"><dt>{gap ? "Fark" : "Fark yok, dengede"}</dt><dd className={gap ? "num balance-off" : "num balance-ok"}><Odometer value={formatTrAmount(gap)} instant={typing} />
              {/* Shown when debit meets credit; a CSS transition, so it never plays on load. */}
              <svg className="balance-check" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 8.5l3.25 3.25L13 5" /></svg></dd></div>
          </dl>
        </section>


        <div className="source">
          {photo ? (
            <figure className="photo">
              {/* A fixed 3:4 box (the photo is shrunk to a 1600px long edge) so the lines beside it never move when it decodes. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL from this device, next/image cannot optimize it */}
              <img src={photo} alt="Fiş fotoğrafı" width={1200} height={1600} decoding="async" />
            </figure>
          ) : null}
          {/* The receipt as read; the journal line in focus lights the figure it came from. */}
          <section className="panel read" id="fis-kaynak" aria-labelledby="okunan-baslik">
            <h2 id="okunan-baslik">{invoice ? "e-Faturadan alınan" : "Fişten okunan"}</h2>
            <dl className="read-values">
              <div><dt>Satıcı</dt><dd>{read(receipt.vendorName)}</dd></div>
              {/* Why the expense account is not the category's: an earlier approval of this seller taught it (src/lib/vendor-rule.ts). */}
              {learned ? <div className="read-learned"><dt>Gider hesabı</dt><dd>Bu satıcının önceki onayından: <span className="tnum" translate="no">{learned.accountCode}</span> {learned.accountName}. <Link href={`${base}/kurallar#satici-kurallari`}>Kurallarda</Link> kaldırabilirsiniz.</dd></div> : null}
              <div><dt>VKN</dt><dd className="tnum">{receipt.taxNumber ? <span className={vknUnsure ? "flagged" : undefined}>{receipt.taxNumber}{vknUnsure ? " (kontrol edin)" : ""}</span> : read(null)}</dd></div>
              <div><dt>Fiş No</dt><dd className="tnum" translate="no">{read(receipt.receiptNo)}</dd></div>
              <div><dt>Tarih</dt><dd className="tnum">{read(trDate(receipt.receiptDate))}</dd></div>
              <div className="read-sum" data-src="base" {...traced("base")}><dt>Matrah</dt><dd className="num">{readTotal !== null ? <>{formatTrAmount(readTotal - readVat)}<span className="formula">{formatTrAmount(readTotal)} - {formatTrAmount(readVat)}</span></> : read(null)}</dd></div>
              <div className="read-sum" data-src="vat" {...traced("vat")}><dt>KDV</dt><dd className="num">{formatTrAmount(readVat)}</dd></div>
              <div className="read-sum read-total" data-src="total" {...traced("total")}><dt>Toplam</dt><dd className="num">{readTotal !== null ? <>{formatTrAmount(readTotal)}<span className="formula">{PAYMENT_LABELS[receipt.paymentMethod as PaymentMethod] ?? "Ödeme okunamadı"}</span></> : read(null)}</dd></div>
            </dl>
            <p className="muted small">{invoice ? "Faturanın XML'inden alındı; satırları faturayla karşılaştırın." : photo ? "Fotoğraf yalnızca bu cihazda, bu oturumda görünür." : "Fotoğraf bu cihazda değil; sunucu fotoğrafı saklamaz. Satırları kâğıt fişle karşılaştırın."}</p>
          </section>
        </div>

        {/* Header fields that every line carries: under the lines and before the actions, so Tab and the eye run the same way (YON 23.16). Locked, they sit atop the lines instead. */}
        {editable ? (
        <section className="panel panel-pad info" aria-labelledby="bilgi-baslik">
          <h2 id="bilgi-baslik">Fiş bilgileri</h2>
          <p className="muted small">Bu alanlar bütün satırlara yazılır.</p>
          <div className="form-grid">
            <label>
              <span>Evrak No</span>
              <input id="evrak-no" className="field tnum" value={head?.documentNo ?? ""} disabled={!editable} maxLength={40} required autoComplete="off" spellCheck={false}
                {...flag(headFlags.documentNo)}
                onChange={(e) => updateAll("documentNo", e.target.value)} />{checkNote(headFlags.documentNo)}
            </label>
            <label>
              <span>Evrak tarihi</span>
              <input id="evrak-tarihi" className="field tnum" type="date" value={head?.documentDate ?? ""} disabled={!editable} required
                {...flag(headFlags.documentDate)}
                onChange={(e) => updateAll("documentDate", e.target.value || null)} />{checkNote(headFlags.documentDate)}
            </label>
            <label className="bt-field">
              <span>Belge türü</span>
              <input className="field" value={head?.documentType ?? ""} disabled={!editable} maxLength={10} autoComplete="off" onChange={(e) => updateAll("documentType", e.target.value)} />
            </label>
            <label className="span-all">
              <span>Açıklama</span>
              <input className="field" value={head?.description ?? ""} disabled={!editable} maxLength={200} autoComplete="off"
                {...flag(headFlags.description)}
                onChange={(e) => updateAll("description", e.target.value)} />{checkNote(headFlags.description)}
            </label>
          </div>
        </section>
        ) : null}

        <div className="actions">
          {editable ? (
            <button className="btn" type="button" disabled={working} onClick={() => run(async () => { if (await save()) { setInfo("Kaydedildi."); refresh(); } })}>Taslağı kaydet</button>
          ) : receipt.status === "approved" ? (
            <>
              <button className="btn" type="button" disabled={working} onClick={() => run(async () => { if (await call(`/api/receipts/${receipt.id}/reopen`, { method: "POST" })) { measureLock(); refresh(); } })}>
                Taslağa al
              </button>
              {/* Without this, a receipt typed into Luca by hand stays approved and the next Excel file repeats it. */}
              <button className="btn" type="button" disabled={working}
                onClick={() => confirm("Bu fişi Luca'ya kendiniz kaydettiniz mi? Fiş “Aktarıldı” olur ve sonraki Excel dosyasına girmez.")
                  && run(async () => { if (await call(`/api/receipts/${receipt.id}/exported`, { method: "POST" })) refresh(); })}>
                Luca&apos;ya elle girdim
              </button>
            </>
          ) : receipt.status === "exported" ? (
            <button className="btn" type="button" disabled={working}
              onClick={() => confirm("Fiş yeniden “Onaylandı” olur; eklentide ve sonraki Excel dosyasında tekrar çıkar. Luca'daki kaydı silmediyseniz fiş iki kez girilir. Devam edilsin mi?")
                && run(async () => { if (await call(`/api/receipts/${receipt.id}/exported`, { method: "DELETE" })) refresh(); })}>
              Aktarılmadı say
            </button>
          ) : null}
          <button className="btn" type="button" disabled={invalid} onClick={copy}><Roll value={copied ? "Kopyalandı" : "Satırları kopyala"} /></button>
          <p role="status" className="muted small">{info}</p>
        </div>

        <div className="action-bar" data-pointed={pointed || undefined}>
          {/* Errors show here, next to the button that caused them; a box higher up is off screen on the phone. */}
          <p ref={statusLine} tabIndex={-1} className={error || (editable && problem) ? "balance balance-off" : "balance balance-ok"} aria-live="polite">
            {error ? error
              : receipt.status === "approved" ? <><span className="phone-only">{"Onaylandı. Luca'ya aktarmak için Excel'i bilgisayarda indirin."}</span><span className="desktop-only">{"Onaylandı. Excel'i indirip Luca'nın Excel veri aktarımı ekranına yükleyin."}</span></>
              : receipt.status === "exported" ? "Luca'ya aktarıldı."
              : target ? <><span id="onay-engeli">{problem}</span> <button className="link-button" type="button" onClick={fix}>{target.action}</button></>
              : dirty ? "Borç ve alacak eşit. Değişiklikler henüz kaydedilmedi." : "Borç ve alacak eşit, onaya hazır."}
          </p>
          {/* The way back sits under the thumb on the phone, where this screen hides the bottom bar. */}
          <Link className="btn btn-lg bar-back" href={base}>Fişler</Link>
          {/* After approval the phone user goes on with the bag of receipts: the next draft, or the camera when none is left. */}
          {!editable ? <div className="bar-next phone-only"><CaptureButton pickers={["camera"]} variant="bar" primary={!next} base={base} /></div> : null}
          {!editable && next ? (
            <Link className="btn btn-lg bar-next-draft" href={`${base}/fis/${next.id}`}>Sıradaki taslak ({next.left})</Link>
          ) : null}
          {editable ? (
            // aria-disabled keeps the button in the Tab order; pressing it while blocked goes to the field that fixes it.
            <button className="btn btn-primary btn-lg" type="button" disabled={working || approved} data-busy={working || approved || undefined} data-done={approved || undefined} aria-disabled={target ? true : undefined}
              aria-describedby={target ? "onay-engeli" : undefined}
              onClick={() => (target ? fix() : run(async () => { if ((await save()) && (await call(`/api/receipts/${receipt.id}/approve`, { method: "POST" }))) { setApproved(true); measureLock(); refresh(); } }))}>
              {approved ? "Onaylandı" : busy ? "Kaydediliyor…" : "Onayla"}
            </button>
          ) : (
            // Luca runs on the computer; downloading on the phone would mark the receipt exported for nothing.
            <div className="desktop-only"><ExportButton receiptIds={[receipt.id]} label="Luca için Excel indir" primary /></div>
          )}
        </div>

        {editable ? (
          <section className="danger-zone" aria-labelledby="sil-baslik">
            <div>
              <h2 id="sil-baslik">Fişi sil</h2>
              <p className="muted small">Taslak ve satırları kalıcı olarak silinir.</p>
            </div>
            <button className="btn btn-danger" type="button" disabled={working}
              onClick={() => confirm(deleteQuestion) && run(async () => { if (await call(`/api/receipts/${receipt.id}`, { method: "DELETE" })) router.push(base); })}>
              Fişi sil
            </button>
          </section>
        ) : null}
      </div>
    </>
  );
}
