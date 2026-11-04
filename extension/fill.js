// Fills Luca "Fiş Detayı" rows. Pure apart from the DOM it is handed; tested in src/lib/luca/extension-fill.test.ts.
// Never presses Kaydet itself; popup.js does, in the auto mode only, after checkGrid finds the grid matching.
(function (root) {
  const FIELDS = ["accountCode", "documentNo", "documentDate", "documentType", "description", "debit", "credit"];
  const FIELD_LABELS = {
    accountCode: "Hesap Kodu", documentNo: "Evrak No", documentDate: "Evrak Tarihi", documentType: "BT",
    description: "Açıklama", debit: "Borç", credit: "Alacak", row: "(satır yok)",
  };

  function setValue(el, value) {
    if (el.focus) el.focus();
    // Native setter so framework-controlled inputs notice the change.
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    for (const type of ["input", "change", "blur"]) el.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function fillReceipt(doc, rows, sel) {
    let grid = Array.from(doc.querySelectorAll(sel.row));
    if (grid.length === 0) return { gridFound: false, filled: 0, missing: [], extraRows: 0 };
    const missing = [];
    let filled = 0;
    rows.forEach((values, i) => {
      if (!grid[i] && sel.addRow) {
        const button = doc.querySelector(sel.addRow);
        // shortcut: assumes the grid adds the row synchronously; add a wait if Luca renders it later.
        if (button && !/kaydet/i.test(button.textContent || "")) {
          button.click();
          grid = Array.from(doc.querySelectorAll(sel.row));
        }
      }
      const row = grid[i];
      if (!row) return missing.push({ row: i + 1, field: "row" });
      for (const field of FIELDS) {
        const el = sel.cells[field] ? row.querySelector(sel.cells[field]) : null;
        // Empty values still clear the cell so an old Borç/Alacak left in a reused row cannot survive.
        if (el) { setValue(el, values[field] || ""); if (values[field]) filled++; }
        else if (values[field]) missing.push({ row: i + 1, field });
      }
    });
    // Rows below ours that still hold values would be saved with this entry; we only warn, never clear them.
    const extraRows = grid.slice(rows.length).filter((row) =>
      FIELDS.some((f) => { const el = sel.cells[f] ? row.querySelector(sel.cells[f]) : null; return !!(el && String(el.value || "").trim()); })).length;
    return { gridFound: true, filled, missing, extraRows };
  }

  /** Picks the frame that found the grid and turns its result into one Turkish message. */
  function summarize(results, rowCount) {
    const best = results.filter((r) => r && r.gridFound).sort((a, b) => b.filled - a.filled)[0];
    if (!best) return { ok: false, gridFound: false, message: "Fiş Detayı tablosu bulunamadı. Luca'da Fiş Detayı ekranını açın; açıksa extension/selectors.js içindeki seçicileri güncelleyin." };
    const extra = best.extraRows
      ? ` Dikkat: tabloda bu kayda ait olmayan ${best.extraRows} dolu satır daha var; Kaydet'ten önce silin.`
      : "";
    if (best.missing.length) {
      const list = best.missing.map((m) => `${m.row}. satır ${FIELD_LABELS[m.field] || m.field}`).join(", ");
      const rowHint = best.missing.some((m) => m.field === "row")
        ? " Satır eksikse Luca'da + ile boş satır ekleyip Fiş Detayına yaz'a tekrar basabilirsiniz."
        : "";
      return { ok: false, gridFound: true, message: `Alan bulunamadı: ${list}. Bu alanları elle doldurun, sonra Kaydet'e siz basın.${rowHint}${extra} Kaydettikten sonra eklentiyi yeniden açıp Luca'da kaydettim'e basın.` };
    }
    return { ok: !extra, gridFound: true, message: `${rowCount} satır dolduruldu.${extra} Luca'da kontrol edip Kaydet'e siz basın, sonra eklentiyi yeniden açıp Luca'da kaydettim'e basın.` };
  }

  // "7.931,82", "7931,82" and "7931.82" (how a grid may echo it back) are the same kuruş.
  function kurus(text) {
    const t = String(text || "").replace(/\s|TL/g, "");
    if (!t) return 0;
    const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
    const n = Number(normal);
    return Number.isFinite(n) ? Math.round(n * 100) : NaN;
  }

  /** What the grid holds now: every row with a value in any of our cells, top to bottom. */
  function readGrid(doc, sel) {
    const grid = Array.from(doc.querySelectorAll(sel.row));
    if (grid.length === 0) return null;
    return grid.map((row) => Object.fromEntries(FIELDS.map((f) => {
      const el = sel.cells[f] ? row.querySelector(sel.cells[f]) : null;
      return [f, el ? String(el.value || "").trim() : ""];
    }))).filter((r) => FIELDS.some((f) => r[f]));
  }

  /** Differences between what was sent and what the grid shows, in Turkish; empty when Kaydet is safe. */
  function checkGrid(expected, actual) {
    if (!actual) return ["Fiş Detayı tablosu okunamadı."];
    const problems = [];
    if (actual.length !== expected.length) problems.push(`Ekranda ${actual.length} satır var, ${expected.length} satır bekleniyordu.`);
    expected.forEach((want, i) => {
      const got = actual[i];
      if (!got) return;
      if (got.accountCode !== want.accountCode) problems.push(`${i + 1}. satır hesap kodu ${got.accountCode || "boş"}, ${want.accountCode} bekleniyordu.`);
      for (const f of ["debit", "credit"]) {
        if (kurus(got[f]) !== kurus(want[f])) problems.push(`${i + 1}. satır ${FIELD_LABELS[f]} ${got[f] || "boş"}, ${want[f] || "boş"} bekleniyordu.`);
      }
    });
    const sum = (rows, f) => rows.reduce((s, r) => s + kurus(r[f]), 0);
    const debit = sum(actual, "debit");
    const credit = sum(actual, "credit");
    if (Number.isNaN(debit) || Number.isNaN(credit) || debit !== credit) problems.push("Ekrandaki borç ve alacak toplamları eşit değil.");
    else if (debit !== sum(expected, "debit")) problems.push("Ekrandaki toplam Accountie'deki fişin toplamıyla aynı değil.");
    return problems;
  }

  root.AccountieFill = { FIELDS, FIELD_LABELS, fillReceipt, summarize, readGrid, checkGrid };
})(globalThis);
