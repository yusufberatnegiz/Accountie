/**
 * Loading state of a panel screen: the list's final layout (title-row buttons, tabs, the real six-column table with ten rows)
 * with flat bars at the size of the values they stand for. No shimmer, no layout shift when data lands.
 */
export function PanelLoading() {
  const rows = [62, 48, 70, 40, 56, 66, 44, 52, 60, 46];
  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-list" aria-busy="true">
      <div className="title-row">
        <div className="title-text">
          <p className="crumb" translate="no">Accountie</p>
          <h1 role="status">Yükleniyor…</h1>
          <p className="finding" aria-hidden="true"><span className="sk sk-finding" /></p>
        </div>
        <div className="capture capture-head desktop-only" aria-hidden="true">
          <div className="capture-buttons"><span className="sk sk-button sk-capture" /><span className="sk sk-button sk-capture" /></div>
        </div>
      </div>
      <section className="panel list-panel" aria-hidden="true">
        <div className="tabs"><span className="sk sk-tab" /><span className="sk sk-tab" /><span className="sk sk-tab" /><span className="sk sk-tab" /></div>
        <table className="receipts">
          <thead>
            <tr><th className="col-vendor">Satıcı</th><th className="num">Evrak No</th><th className="num">Tarih</th><th className="num">Gider hesabı</th><th className="num">Toplam</th><th className="col-status">Durum</th></tr>
          </thead>
          <tbody>
            {rows.map((w, i) => (
              <tr key={i}>
                <td className="r-vendor"><span className="sk" style={{ width: `${w}%` }} /></td>
                <td className="r-no num"><span className="sk sk-cell" /></td>
                <td className="r-date num"><span className="sk sk-cell" /></td>
                <td className="r-code num"><span className="sk sk-cell" /></td>
                <td className="r-total num"><span className="sk sk-num" /></td>
                <td className="r-status"><span className="sk sk-status" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <aside className="side desktop-only" aria-hidden="true">
        <div className="panel side-block">
          <p className="sk-label">Luca dosyası</p>
          <span className="sk sk-line" /><span className="sk sk-bar" />
          <span className="sk sk-line" /><span className="sk sk-bar" />
          <span className="sk sk-button" />
        </div>
        <div className="panel side-block">
          <p className="sk-label">Gider hesaplarına göre</p>
          {[90, 70, 55, 40, 30].map((w) => <span key={w} className="sk sk-acc" style={{ width: `${w}%` }} />)}
        </div>
      </aside>
    </main>
  );
}
