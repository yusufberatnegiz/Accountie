"use client";

import { useState } from "react";
import { ExtensionTokenPanel } from "@/components/ExtensionTokenPanel";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { useLeaveGuard } from "@/components/useLeaveGuard";
import { ACCOUNT_CODE_PATTERN, DEFAULT_RULES, rulesToRows, type RuleKind, type RuleRow } from "@/lib/default-rules";
import { formatTrAmount } from "@/lib/money";

// The example receipt 0047 (8.725,00 TL, KDV %10 793,18, paid by card) shows what the rule in focus produces.
const SAMPLE = { total: 872500, vat: 79318 };
const vatAt = (rate: number) => Math.round((SAMPLE.total * rate) / (100 + rate));
const PAID: Record<string, string> = { cash: "Nakit ödenen fiş", card: "Kartla ödenen fiş", other: "Başka yolla ödenen fiş" };

const GROUPS: { kind: RuleKind; title: string; text: string; first: string; caption: (r: RuleRow) => string }[] = [
  { kind: "expense", title: "Gider hesapları", text: "Fiş türüne göre borç satırına yazılan hesap.", first: "meal", caption: (r) => `${r.label} fişi` },
  { kind: "vat", title: "İndirilecek KDV", text: "Fişteki KDV oranına göre 191 hesabı. KDV yeniden hesaplanmaz, fişteki tutar yazılır.", first: "10", caption: (r) => `${r.label} içeren fiş` },
  { kind: "payment", title: "Ödeme ve alacak", text: "Ödeme şekline göre alacak satırına yazılan hesap. Fiş ekranında fiş başına değiştirilebilir.", first: "card", caption: (r) => PAID[r.key] ?? r.label },
  { kind: "setting", title: "Belge türü", text: "Luca'daki BT sütununa yazılır. Yazar kasa fişi için ÖK.", first: "documentType", caption: (r) => `Her satırın BT sütunu ${r.accountCode}` },
];

const invalid = (r: RuleRow) => (r.kind === "setting" ? !r.accountCode.trim() || r.accountCode.length > 10 : !ACCOUNT_CODE_PATTERN.test(r.accountCode));
const same = (a: RuleRow, b: RuleRow) => a.kind === b.kind && a.key === b.key;

/** Settings in two columns: each group is a row with its own Save; a Save sends only its group's edits. */
export function RulesEditor({ rows: initial }: { rows: RuleRow[] }) {
  const [rows, setRows] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [note, setNote] = useState<{ kind: RuleKind; text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState<RuleKind | null>(null);
  // The rule under the pointer or in focus; the preview beside its group follows it.
  const [active, setActive] = useState<RuleRow | null>(null);

  const update = (r: RuleRow, patch: Partial<RuleRow>) => setRows((rs) => rs.map((x) => (same(x, r) ? { ...x, ...patch } : x)));
  const dirty = (kind: RuleKind) => rows.some((r) => r.kind === kind && JSON.stringify(r) !== JSON.stringify(saved.find((s) => same(s, r))));

  useLeaveGuard(GROUPS.some((g) => dirty(g.kind)));

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
        const shown = groupRows.find((r) => active && same(r, active)) ?? groupRows.find((r) => r.key === g.first) ?? groupRows[0];
        // The sample receipt's three Luca lines under the current rules; this group's line is lit, and it follows the rule in focus.
        const pick = (kind: RuleKind, key: string) => (kind === g.kind ? shown : undefined) ?? rows.find((r) => r.kind === kind && r.key === key);
        const vatRow = pick("vat", "10");
        const rate = Number(vatRow?.key ?? 10);
        const vat = rate === 10 ? SAMPLE.vat : vatAt(rate);
        const lines = [
          { kind: "expense", row: pick("expense", "meal"), side: "Borç", amount: SAMPLE.total - vat },
          { kind: "vat", row: vatRow, side: "Borç", amount: vat },
          { kind: "payment", row: pick("payment", "card"), side: "Alacak", amount: SAMPLE.total },
        ];
        const setting = g.kind === "setting";
        return (
          <section key={g.kind} id={`kural-${g.kind}`} className="setting-row" aria-labelledby={`grp-${g.kind}`}>
            <div className="setting-label">
              <h2 id={`grp-${g.kind}`}>{g.title}</h2>
              <p className="muted small">{g.text}</p>
              <figure className="setting-preview">
                <figcaption><span>{shown ? g.caption(shown) : ""}</span><span className="muted">Toplam {formatTrAmount(SAMPLE.total)}</span></figcaption>
                <table className="preview-lines">
                  <caption className="visually-hidden">Örnek fişin Luca satırları</caption>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.kind} data-traced={l.kind === g.kind ? "" : undefined}>
                        <td><span className="tnum" translate="no">{l.row?.accountCode}</span> <span className="muted">{l.row?.accountName}</span></td>
                        <td className="num to-luca">{l.side} {formatTrAmount(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </figure>
            </div>
            <div className="setting-panel">
              <table className="rules-table">
                <thead><tr><th>Kural</th><th className="col-code">{setting ? "Değer" : "Hesap kodu"}</th>{setting ? null : <th>Hesap adı</th>}</tr></thead>
                <tbody>
                  {groupRows.map((r) => (
                    <tr key={r.key} onMouseEnter={() => setActive(r)} onFocus={() => setActive(r)}>
                      <td className="rule-label">{r.label}</td>
                      <td className="rule-code"><input autoComplete="off" spellCheck={false} translate="no" className="field tnum" placeholder={setting ? "ÖK…" : "770.08…"} aria-label={`${r.label} ${setting ? "değeri" : "hesap kodu"}`} aria-invalid={invalid(r)} value={r.accountCode} onChange={(e) => update(r, { accountCode: e.target.value.trim() })} /></td>
                      {/* The name is for people only (Luca matches the code), so it reads as text until pointed at or focused. */}
                      {setting ? null : <td className="rule-name"><input autoComplete="off" className="field field-quiet" aria-label={`${r.label} hesap adı`} value={r.accountName} onChange={(e) => update(r, { accountName: e.target.value })} /></td>}
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
          <p className="muted small desktop-only">Eklenti onaylı fişin satırlarını Luca&apos;da açık Fiş Detayı ekranına yazar; Kaydet&apos;e siz basarsınız. Anahtar 12 saat geçerlidir ve yalnızca sizin onaylı fişlerinizi okur.</p>
          <p className="muted small desktop-only">Luca&apos;da henüz denenmedi; alanları bulamayabilir. Excel ile aktarım birincil yoldur.</p>
          {/* Luca and Chrome extensions live on the computer; the key is made there. */}
          <p className="muted small phone-only">Eklenti bilgisayardaki Chrome içindir. Anahtarı bilgisayarda bu sayfadan oluşturun.</p>
        </div>
        <div className="setting-panel desktop-only"><ExtensionTokenPanel /></div>
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
