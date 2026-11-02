"use client";

import { useState } from "react";
import { ACCOUNT_CODE_PATTERN, type RuleKind, type RuleRow } from "@/lib/default-rules";

const GROUPS: { kind: RuleKind; title: string }[] = [
  { kind: "expense", title: "Gider hesapları (fiş türüne göre)" },
  { kind: "vat", title: "İndirilecek KDV hesapları (orana göre)" },
  { kind: "payment", title: "Alacak hesapları (ödeme şekline göre)" },
  { kind: "setting", title: "Satır varsayılanları" },
];

export function RulesEditor({ rows: initial }: { rows: RuleRow[] }) {
  const [rows, setRows] = useState(initial);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const invalid = (r: RuleRow) => (r.kind === "setting" ? !r.accountCode.trim() || r.accountCode.length > 10 : !ACCOUNT_CODE_PATTERN.test(r.accountCode));
  const update = (r: RuleRow, patch: Partial<RuleRow>) => setRows((rs) => rs.map((x) => (x.kind === r.kind && x.key === r.key ? { ...x, ...patch } : x)));

  async function save() {
    setMessage("");
    setError("");
    if (rows.some(invalid)) {
      setError("Hesap kodu 770.08 biçiminde olmalı.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/account-rules", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) setMessage("Kurallar kaydedildi.");
    else setError((res && (await res.json().catch(() => null))?.error) ?? "Kaydedilemedi. Tekrar deneyin.");
  }

  return (
    <div className="stack-lg">
      {GROUPS.map((g) => (
        <section key={g.kind} className="panel" aria-labelledby={`grp-${g.kind}`}>
          <h2 id={`grp-${g.kind}`} className="panel-pad">{g.title}</h2>
          <table className="rules-table">
              <thead><tr><th>Kural</th><th className="col-code">{g.kind === "setting" ? "Değer" : "Hesap Kodu"}</th>{g.kind === "setting" ? null : <th>Hesap Adı</th>}</tr></thead>
              <tbody>
                {rows.filter((r) => r.kind === g.kind).map((r) => (
                  <tr key={r.key}>
                    <td className="rule-label">{r.label}</td>
                    <td data-label={g.kind === "setting" ? "Değer" : "Hesap Kodu"}><input className="field num-font" aria-label={`${r.label} hesap kodu`} aria-invalid={invalid(r)} value={r.accountCode} onChange={(e) => update(r, { accountCode: e.target.value.trim() })} /></td>
                    {g.kind === "setting" ? null : <td data-label="Hesap Adı"><input className="field" aria-label={`${r.label} hesap adı`} value={r.accountName} onChange={(e) => update(r, { accountName: e.target.value })} /></td>}
                  </tr>
                ))}
              </tbody>
            </table>
        </section>
      ))}
      {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
      {message ? <p role="status" className="muted">{message}</p> : null}
      <div className="action-bar"><p className="muted small">Değişiklik yalnızca yeni fişlere uygulanır.</p><button className="btn btn-primary btn-lg" type="button" onClick={save} disabled={busy}>{busy ? "Kaydediliyor" : "Kuralları kaydet"}</button></div>
    </div>
  );
}
