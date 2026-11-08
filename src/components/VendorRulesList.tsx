"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VendorRule } from "@/db/queries";

/**
 * What the firm's approvals taught (src/lib/vendor-rule.ts): a seller whose expense account was corrected goes to that
 * account from then on. Removing one sends the seller back to its category rule.
 */
export function VendorRulesList({ rules, firmName }: { rules: VendorRule[]; firmName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function remove(rule: VendorRule) {
    if (busy) return;
    setBusy(rule.id);
    setError("");
    const res = await fetch(`/api/vendor-rules/${rule.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(null);
    if (!res?.ok) return setError("Kural kaldırılamadı. Tekrar deneyin.");
    router.refresh();
  }

  return (
    <section className="panel vendor-rules" aria-labelledby="satici-kurallari">
      <h2 id="satici-kurallari">Satıcıya göre öğrenilenler</h2>
      <p className="muted">
        {firmName} için onayladığınız fişlerde bir satıcının gider hesabını değiştirdiyseniz, o satıcının sonraki fişleri bu hesapla gelir.
      </p>
      {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
      {rules.length === 0 ? <p className="muted small">Henüz öğrenilen yok. Bir fişte gider hesabını değiştirip onaylayınca burada görünür.</p> : (
        <ul className="vendor-rules-list">
          {rules.map((r) => (
            <li key={r.id} className="vendor-rules-row">
              <span className="vendor-rules-who">{r.vendorName ?? "Satıcı adı okunamadı"}<span className="tnum">VKN {r.taxNumber}</span></span>
              <span className="vendor-rules-account"><span className="tnum" translate="no">{r.accountCode}</span> {r.accountName}</span>
              <button type="button" className="btn btn-sm" aria-label={`${r.vendorName ?? r.taxNumber} için öğrenileni kaldır`} aria-disabled={busy === r.id || undefined} onClick={() => remove(r)}>
                {busy === r.id ? "Kaldırılıyor…" : "Kaldır"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
