"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReceiptDetail } from "@/db/queries";
import { ACCOUNT_CODE_PATTERN, PAYMENT_ALTERNATIVES, PAYMENT_LABELS, type Account, type PaymentMethod, type Rules } from "@/lib/default-rules";
import { approvalProblem, type JournalLine } from "@/lib/journal";
import { clipboardText } from "@/lib/luca/clipboard";
import { formatTrAmount, parseTrAmount } from "@/lib/money";
import { getPhoto } from "@/lib/photo-store";
import { ExportButton } from "./ExportButton";

type EditLine = Omit<JournalLine, "debitKurus" | "creditKurus"> & { key: number; debit: string; credit: string };
type SharedField = "documentNo" | "documentDate" | "documentType" | "description";

const noSubscribe = () => () => {};
let nextKey = 0;
const toEdit = (l: JournalLine): EditLine => {
  const { debitKurus, creditKurus, ...rest } = l;
  return { ...rest, key: nextKey++, debit: debitKurus ? formatTrAmount(debitKurus) : "", credit: creditKurus ? formatTrAmount(creditKurus) : "" };
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
const LEAVE_MESSAGE = "Kaydedilmemiş değişiklikler kaybolacak. Sayfadan çıkılsın mı?";

const toLine = ({ key, debit, credit, ...rest }: EditLine): JournalLine => ({ ...rest, debitKurus: kurus(debit), creditKurus: kurus(credit) });

// Warning codes that mean "the reader was unsure about this field".
const AMOUNT_WARNINGS = ["amount_unreadable", "total_mismatch", "vat_mismatch", "vat_computed", "vat_missing", "rounding_adjusted", "extraction_failed"];
// Warnings about one header field; they clear once that field is edited.
const WARNING_FIELD: Record<string, string> = { date_invalid: "documentDate", date_unusual: "documentDate", receipt_no_unsure: "documentNo", payment_unsure: "credit" };

export function ReviewEditor({ receipt, rules }: { receipt: ReceiptDetail; rules: Rules }) {
  const router = useRouter();
  const editable = receipt.status === "draft";
  const [lines, setLines] = useState(() => receipt.lines.map(toEdit));
  const [savedSignature, setSavedSignature] = useState(() => signature(lines));
  const dirty = editable && signature(lines) !== savedSignature;
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  // Photo exists only in this tab; server render has none.
  const photo = useSyncExternalStore(noSubscribe, () => getPhoto(receipt.id), () => undefined);

  // Warn before unsaved edits are lost: tab close or reload, and in-app links (captured before Next's Link handler).
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest("a[href]") && !confirm(LEAVE_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const parsed = lines.map(toLine);
  const invalid = parsed.some((l) => Number.isNaN(l.debitKurus) || Number.isNaN(l.creditKurus));
  const sum = (f: (l: JournalLine) => number) => parsed.reduce((s, l) => s + (Number.isNaN(f(l)) ? 0 : f(l)), 0);
  const debit = sum((l) => l.debitKurus);
  const credit = sum((l) => l.creditKurus);
  const vat = sum((l) => (l.accountCode.startsWith("191") ? l.debitKurus : 0));
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

  const update = (key: number, patch: Partial<EditLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
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
  const addLine = () => setLines((ls) => [...ls, { ...ls[0], key: nextKey++, accountCode: "", accountName: "", debit: "", credit: "" }]);

  async function call(url: string, init?: RequestInit): Promise<boolean> {
    const res = await fetch(url, init).catch(() => null);
    if (res?.ok) return true;
    const body = res ? await res.json().catch(() => null) : null;
    setError(body?.error ?? "Bağlantı kurulamadı. Tekrar deneyin.");
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

  const copy = () => navigator.clipboard.writeText(clipboardText(parsed)).then(() => setInfo("Satırlar panoya kopyalandı."), () => setError("Panoya kopyalanamadı."));

  return (
    <div className="review">
      {photo ? (
        <section className="review-photo panel" aria-label="Fiş fotoğrafı">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL from this device, next/image cannot optimize it */}
          <img src={photo} alt="Fiş fotoğrafı" />
        </section>
      ) : (
        // The server never stores the photo; on another device show what was read, to compare with the paper receipt.
        <section className="review-photo review-read panel panel-pad" aria-labelledby="okunan-baslik">
          <h2 id="okunan-baslik">Fişte okunan</h2>
          <dl className="read-values">
            <div><dt>Satıcı</dt><dd>{receipt.vendorName ?? "Okunamadı"}</dd></div>
            <div><dt>VKN</dt><dd className="num-font">{receipt.taxNumber ?? "Okunamadı"}</dd></div>
            <div><dt>Fiş No</dt><dd className="num-font">{receipt.receiptNo ?? "Okunamadı"}</dd></div>
            <div><dt>Tarih</dt><dd className="num-font">{receipt.receiptDate ? receipt.receiptDate.split("-").reverse().join(".") : "Okunamadı"}</dd></div>
            <div><dt>Toplam</dt><dd className="num-font">{receipt.totalKurus !== null ? `${formatTrAmount(receipt.totalKurus)} TL` : "Okunamadı"}</dd></div>
            <div><dt>Ödeme</dt><dd>{PAYMENT_LABELS[receipt.paymentMethod as PaymentMethod] ?? "Okunamadı"}</dd></div>
          </dl>
          <p className="muted small">Fotoğraf yalnızca çekildiği cihazda, aynı oturumda görünür. Satırları kağıt fişle karşılaştırın.</p>
        </section>
      )}

      <div className="review-main">
        {warnings.length ? (
          <div className="alert alert-warn" id="uyarilar">
            <p className="alert-title">Kontrol edilecekler</p>
            <ul className="notes">{warnings.map((w) => <li key={w.code}>{w.message}</li>)}</ul>
          </div>
        ) : null}

        <section className="panel panel-pad" aria-labelledby="bilgi-baslik">
          <h2 id="bilgi-baslik">Fiş bilgileri</h2>
          <p className="muted small">Bu alanlar bütün satırlara yazılır.</p>
          <div className="form-grid">
            <label>
              <span>Evrak No {checkNote(headFlags.documentNo)}</span>
              <input className="field" value={head?.documentNo ?? ""} disabled={!editable} maxLength={40} required
                {...flag(headFlags.documentNo)}
                onChange={(e) => updateAll("documentNo", e.target.value)} />
            </label>
            <label>
              <span>Evrak Tarihi {checkNote(headFlags.documentDate)}</span>
              <input className="field" type="date" value={head?.documentDate ?? ""} disabled={!editable} required
                {...flag(headFlags.documentDate)}
                onChange={(e) => updateAll("documentDate", e.target.value || null)} />
            </label>
            <label>Belge türü (BT)
              <input className="field" value={head?.documentType ?? ""} disabled={!editable} maxLength={10} onChange={(e) => updateAll("documentType", e.target.value)} />
            </label>
            {editable ? (
              <label>Alacak hesabı {checkNote(headFlags.credit)}
                <select className="field" value={PAYMENT_ALTERNATIVES.some((a) => a.code === creditCode) ? creditCode : ""} {...flag(headFlags.credit)}
                  onChange={(e) => { touch("credit"); setCreditAccount(e.target.value); }}>
                  {PAYMENT_ALTERNATIVES.some((a) => a.code === creditCode) ? null : <option value="">{creditCode || "Seçin"}</option>}
                  {PAYMENT_ALTERNATIVES.map((a) => <option key={a.code} value={a.code}>{a.code} {a.label}</option>)}
                </select>
              </label>
            ) : null}
            <label className="span-all">
              <span>Açıklama {checkNote(headFlags.description)}</span>
              <input className="field" value={head?.description ?? ""} disabled={!editable} maxLength={200}
                {...flag(headFlags.description)}
                onChange={(e) => updateAll("description", e.target.value)} />
            </label>
          </div>
        </section>

        <section className="panel" aria-labelledby="satir-baslik">
          <h2 id="satir-baslik" className="panel-pad">Yevmiye satırları</h2>
          <table className="lines">
            <thead>
              <tr>
                <th className="col-code">Hesap Kodu</th><th>Hesap Adı</th><th className="col-amount num">Borç (TL)</th><th className="col-amount num">Alacak (TL)</th>
                {editable ? <th className="col-del"><span className="visually-hidden">Sil</span></th> : null}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const codeFlag = flagged(`code-${l.key}`, !l.accountCode);
                const debitFlag = flagged(`debit-${l.key}`, amountsUnsure && !!l.debit);
                const creditFlag = flagged(`credit-${l.key}`, amountsUnsure && !!l.credit);
                const unsure = (on: boolean) => (on ? ", kontrol edin" : "");
                return (
                <tr key={l.key}>
                  {/* No inputMode: the iOS Turkish decimal pad has a comma but no dot, and codes need dots (191.03.10). */}
                  <td data-label="Hesap Kodu"><input autoComplete="off" className="field num-font" aria-label={`Satır ${i + 1} hesap kodu${unsure(codeFlag)}`} value={l.accountCode} disabled={!editable}
                    autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-invalid={!!l.accountCode && !ACCOUNT_CODE_PATTERN.test(l.accountCode.trim())}
                    {...flag(codeFlag)} onChange={(e) => { touch(`code-${l.key}`); setCode(l.key, e.target.value); }} />{checkNote(codeFlag)}</td>
                  <td data-label="Hesap Adı"><input autoComplete="off" className="field" aria-label={`Satır ${i + 1} hesap adı`} value={l.accountName} disabled={!editable} onChange={(e) => update(l.key, { accountName: e.target.value })} /></td>
                  <td data-label="Borç (TL)"><input autoComplete="off" className="field num" aria-label={`Satır ${i + 1} borç${unsure(debitFlag)}`} value={l.debit} disabled={!editable} inputMode="decimal" aria-invalid={Number.isNaN(kurus(l.debit))}
                    {...flag(debitFlag)} onChange={(e) => { touch(`debit-${l.key}`); update(l.key, { debit: e.target.value }); }} />{checkNote(debitFlag)}</td>
                  <td data-label="Alacak (TL)"><input autoComplete="off" className="field num" aria-label={`Satır ${i + 1} alacak${unsure(creditFlag)}`} value={l.credit} disabled={!editable} inputMode="decimal" aria-invalid={Number.isNaN(kurus(l.credit))}
                    {...flag(creditFlag)} onChange={(e) => { touch(`credit-${l.key}`); update(l.key, { credit: e.target.value }); }} />{checkNote(creditFlag)}</td>
                  {editable ? <td className="col-del"><button className="btn btn-quiet" type="button" aria-label={`Satır ${i + 1} sil`} disabled={lines.length <= 1} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>Sil</button></td> : null}
                </tr>
                );
              })}
            </tbody>
          </table>
          <dl className="totals">
            <div><dt>Borç</dt><dd className="num">{formatTrAmount(debit)}</dd></div>
            <div><dt>Alacak</dt><dd className="num">{formatTrAmount(credit)}</dd></div>
            <div><dt>KDV (191)</dt><dd className="num">{formatTrAmount(vat)}</dd></div>
          </dl>
        </section>

        {info ? <p role="status" className="muted">{info}</p> : null}

        <div className="actions">
          {editable ? (
            <>
              <button className="btn" type="button" disabled={busy} onClick={addLine}>Satır ekle</button>
              <button className="btn" type="button" disabled={busy} onClick={() => run(async () => { if (await save()) { setInfo("Kaydedildi."); router.refresh(); } })}>Taslağı kaydet</button>
            </>
          ) : receipt.status === "approved" ? (
            <>
              <button className="btn" type="button" disabled={busy} onClick={() => run(async () => { if (await call(`/api/receipts/${receipt.id}/reopen`, { method: "POST" })) router.refresh(); })}>
                Taslağa al
              </button>
              {/* Without this, a receipt typed into Luca by hand stays approved and the next Excel file repeats it. */}
              <button className="btn" type="button" disabled={busy}
                onClick={() => confirm("Bu fişi Luca'ya kendiniz kaydettiniz mi? Fiş \"Aktarıldı\" olur ve sonraki Excel dosyasına girmez.")
                  && run(async () => { if (await call(`/api/receipts/${receipt.id}/exported`, { method: "POST" })) router.refresh(); })}>
                Luca&apos;ya elle girdim
              </button>
            </>
          ) : null}
          <button className="btn" type="button" disabled={invalid} onClick={copy}>Satırları kopyala</button>
          {editable ? (
            <button className="btn btn-danger" type="button" disabled={busy}
              onClick={() => confirm("Bu taslak fiş silinsin mi?") && run(async () => { if (await call(`/api/receipts/${receipt.id}`, { method: "DELETE" })) router.push("/"); })}>
              Fişi sil
            </button>
          ) : null}
        </div>

        <div className="action-bar">
          {/* Errors show here, next to the button that caused them; a box higher up is off screen on the phone. */}
          <p className={error || (editable && problem) ? "balance balance-off" : "balance balance-ok"} aria-live="polite">
            {error ? error
              : receipt.status === "approved" ? "Onaylandı. Luca'ya aktarmak için Excel'i bilgisayarda indirin."
              : receipt.status === "exported" ? "Luca'ya aktarıldı."
              : problem ?? (dirty ? "Borç ve alacak eşit. Değişiklikler henüz kaydedilmedi." : "Borç ve alacak eşit, onaya hazır.")}
          </p>
          {editable ? (
            <button className="btn btn-primary btn-lg" type="button" disabled={busy || !!problem}
              onClick={() => run(async () => { if ((await save()) && (await call(`/api/receipts/${receipt.id}/approve`, { method: "POST" }))) router.refresh(); })}>
              {busy ? "Kaydediliyor…" : "Onayla"}
            </button>
          ) : (
            // Luca runs on the computer; downloading on the phone would mark the receipt exported for nothing.
            <div className="desktop-only"><ExportButton receiptIds={[receipt.id]} label="Luca için Excel indir" primary /></div>
          )}
        </div>
      </div>
    </div>
  );
}
