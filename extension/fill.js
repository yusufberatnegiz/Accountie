// Fills Luca "Fiş Detayı" rows. Pure apart from the DOM it is handed; tested in src/lib/luca/extension-fill.test.ts.
// Never presses Kaydet: the user reviews and saves.
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
    if (grid.length === 0) return { gridFound: false, filled: 0, missing: [] };
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
        if (!values[field]) continue;
        const el = sel.cells[field] ? row.querySelector(sel.cells[field]) : null;
        if (!el) missing.push({ row: i + 1, field });
        else { setValue(el, values[field]); filled++; }
      }
    });
    return { gridFound: true, filled, missing };
  }

  /** Picks the frame that found the grid and turns its result into one Turkish message. */
  function summarize(results, rowCount) {
    const best = results.filter((r) => r && r.gridFound).sort((a, b) => b.filled - a.filled)[0];
    if (!best) return { ok: false, message: "Fiş Detayı tablosu bulunamadı. Luca'da Fiş Detayı ekranını açın; açıksa extension/selectors.js içindeki seçicileri güncelleyin." };
    if (best.missing.length) {
      const list = best.missing.map((m) => `${m.row}. satır ${FIELD_LABELS[m.field] || m.field}`).join(", ");
      return { ok: false, message: `Alan bulunamadı: ${list}. Bu alanları elle doldurun, sonra Kaydet'e siz basın.` };
    }
    return { ok: true, message: `${rowCount} satır dolduruldu. Luca'da kontrol edip Kaydet'e siz basın.` };
  }

  root.AccountieFill = { FIELDS, FIELD_LABELS, fillReceipt, summarize };
})(globalThis);
