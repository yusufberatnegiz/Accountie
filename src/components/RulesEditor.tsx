"use client";

import { useEffect, useState } from "react";
import { ExtensionTokenPanel } from "@/components/ExtensionTokenPanel";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { ACCOUNT_CODE_PATTERN, DEFAULT_RULES, rulesToRows, type RuleKind, type RuleRow } from "@/lib/default-rules";
import { formatTrAmount } from "@/lib/money";

// The example receipt 0047 (8.725,00 TL, KDV %10 793,18, paid by card) shows what each setting produces.
const SAMPLE = { total: 872500, vat: 79318 };

const GROUPS: { kind: RuleKind; title: string; text: string; preview: (rows: RuleRow[]) => [string, string, string] }[] = [
  {
    kind: "expense", title: "Gider hesapları", text: "Fiş türüne göre borç satırına yazılan hesap.",
    preview: (rs) => { const r = rs.find((x) => x.key === "meal"); return ["Yemek ve ağırlama fişi", `${r?.accountCode ?? ""} ${r?.accountName ?? ""}`, `Borç ${formatTrAmount(SAMPLE.total - SAMPLE.vat)}`]; },
  },
  {
    kind: "vat", title: "İndirilecek KDV", text: "Fişteki KDV oranına göre 191 hesabı. KDV yeniden hesaplanmaz, fişteki tutar yazılır.",
    preview: (rs) => { const r = rs.find((x) => x.key === "10"); return ["%10 KDV", `${r?.accountCode ?? ""} ${r?.accountName ?? ""}`, `Borç ${formatTrAmount(SAMPLE.vat)}`]; },
  },
  {
    kind: "payment", title: "Ödeme ve alacak", text: "Ödeme şekline göre alacak satırına yazılan hesap. Fiş ekranında fiş başına değiştirilebilir.",
    preview: (rs) => { const r = rs.find((x) => x.key === "card"); return ["Kartla ödenen fiş", `${r?.accountCode ?? ""} ${r?.accountName ?? ""}`, `Alacak ${formatTrAmount(SAMPLE.total)}`]; },
  },
  {
    kind: "setting", title: "Belge türü", text: "Luca'daki BT sütununa yazılır. Yazar kasa fişi için ÖK.",
    preview: (rs) => ["Her satırın BT sütunu", rs[0]?.accountCode ?? "", ""],
  },
];

const invalid = (r: RuleRow) => (r.kind === "setting" ? !r.accountCode.trim() || r.accountCode.length > 10 : !ACCOUNT_CODE_PATTERN.test(r.accountCode));
const same = (a: RuleRow, b: RuleRow) => a.kind === b.kind && a.key === b.key;

/** Settings in two columns: each group is a row with its own Save; a Save sends only its group's edits. */
export function RulesEditor({ rows: initial }: { rows: RuleRow[] }) {
  const [rows, setRows] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [note, setNote] = useState<{ kind: RuleKind; text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState<RuleKind | null>(null);

  const update = (r: RuleRow, patch: Partial<RuleRow>) => setRows((rs) => rs.map((x) => (same(x, r) ? { ...x, ...patch } : x)));
  const dirty = (kind: RuleKind) => rows.some((r) => r.kind === kind && JSON.stringify(r) !== JSON.stringify(saved.find((s) => same(s, r))));

  // Warn before unsaved rules are lost on tab close or reload.
  const anyDirty = GROUPS.some((g) => dirty(g.kind));
  useEffect(() => {
    if (!anyDirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [anyDirty]);

  async function save(kind: RuleKind) {
    setNote(null);
    if (rows.some((r) => r.kind === kind && invalid(r))) {
      setNote({ kind, text: "Hesap kodu 770.08 biçiminde olmalı.", error: true });
      // Let React paint aria-invalid first, then jump to the field the user must fix.
      requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`#kural-${kind} [aria-invalid="true"]`)?.focus());
      return;
    }
    const next = saved.map((s) => (s.kind === kind ? rows.find((r) => same(r, s)) ?? s : s));
    setBusy(kind);
    const res = await fetch("/api/account-rules", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows: next }) }).catch(() => null);
    setBusy(null);
    if (res?.ok) {
      setSaved(next);
      setNote({ kind, text: "Kaydedildi. Yeni fişlere uygulanır.", error: false });
    } else setNote({ kind, text: (res && (await res.json().catch(() => null))?.error) ?? "Kaydedilemedi. Tekrar deneyin.", error: true });
  }

  return (
    <div className="settings">
      {GROUPS.map((g) => {
        const groupRows = rows.filter((r) => r.kind === g.kind);
        const [from, account, amount] = g.preview(groupRows);
        const setting = g.kind === "setting";
        return (
          <section key={g.kind} id={`kural-${g.kind}`} className="setting-row" aria-labelledby={`grp-${g.kind}`}>
            <div className="setting-label">
              <h2 id={`grp-${g.kind}`}>{g.title}</h2>
              <p className="muted small">{g.text}</p>
              <p className="setting-preview" aria-label="Örnek fiş 0047 ile sonuç">
                <span className="muted">{from}</span>
                <span className="tnum" translate="no">{account}</span>
                {amount ? <span className="to-luca">{amount}</span> : null}
              </p>
            </div>
            <div className="setting-panel">
              <table className="rules-table">
                <thead><tr><th>Kural</th><th className="col-code">{setting ? "Değer" : "Hesap Kodu"}</th>{setting ? null : <th>Hesap Adı</th>}</tr></thead>
                <tbody>
                  {groupRows.map((r) => (
                    <tr key={r.key}>
                      <td className="rule-label">{r.label}</td>
                      <td data-label={setting ? "Değer" : "Hesap Kodu"}><input autoComplete="off" spellCheck={false} translate="no" className="field tnum" placeholder={setting ? "ÖK…" : "770.08…"} aria-label={`${r.label} ${setting ? "değeri" : "hesap kodu"}`} aria-invalid={invalid(r)} value={r.accountCode} onChange={(e) => update(r, { accountCode: e.target.value.trim() })} /></td>
                      {setting ? null : <td data-label="Hesap Adı"><input autoComplete="off" className="field" aria-label={`${r.label} hesap adı`} value={r.accountName} onChange={(e) => update(r, { accountName: e.target.value })} /></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="setting-save">
                <p className={note?.kind === g.kind ? (note.error ? "field-error" : "saved") : "muted small"} aria-live="polite">
                  {note?.kind === g.kind ? note.text : dirty(g.kind) ? "Kaydedilmemiş değişiklik var." : ""}
                </p>
                <button className={dirty(g.kind) ? "btn btn-primary" : "btn"} type="button" onClick={() => save(g.kind)} disabled={busy !== null}>{busy === g.kind ? "Kaydediliyor…" : `${g.title} kaydet`}</button>
              </div>
            </div>
          </section>
        );
      })}

      <section className="setting-row" aria-labelledby="grp-eklenti">
        <div className="setting-label">
          <h2 id="grp-eklenti">Chrome eklentisi (deneysel)</h2>
          <p className="muted small">Eklenti onaylı fişin satırlarını Luca&apos;da açık Fiş Detayı ekranına yazar; Kaydet&apos;e siz basarsınız. Anahtar 12 saat geçerlidir ve yalnızca sizin onaylı fişlerinizi okur.</p>
          <p className="muted small">Luca&apos;da henüz denenmedi; alanları bulamayabilir. Excel ile aktarım birincil yoldur.</p>
        </div>
        <div className="setting-panel"><ExtensionTokenPanel /></div>
      </section>

      <section className="setting-row" aria-labelledby="grp-gorunum">
        <div className="setting-label">
          <h2 id="grp-gorunum">Görünüm</h2>
          <p className="muted small">Sistem seçiliyken cihazın açık veya koyu ayarını izler. Seçim bu tarayıcıda hatırlanır.</p>
        </div>
        <div className="setting-panel setting-theme"><ThemeSwitch labelled /></div>
      </section>

      <section className="setting-row danger-zone" aria-labelledby="grp-sifirla">
        <div className="setting-label">
          <h2 id="grp-sifirla">Varsayılan kurallara dön</h2>
          <p className="muted small">Bütün hesap kodları ilk kurulumdaki değerlere döner. Her bölümü kaydedene kadar hiçbir şey değişmez.</p>
        </div>
        <div className="setting-panel">
          <button className="btn btn-danger" type="button"
            onClick={() => confirm("Bütün hesap kuralları varsayılan değerlere dönsün mü? Kaydetmeden önce kontrol edebilirsiniz.") && setRows(rulesToRows(DEFAULT_RULES))}>
            Varsayılanlara dön
          </button>
        </div>
      </section>
    </div>
  );
}
