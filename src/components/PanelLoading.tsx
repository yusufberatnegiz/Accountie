/**
 * Loading state of a panel screen: the list's final layout with flat bars at the size of the values they stand for.
 * Headers and labels show at once; one status line says it is loading. No shimmer, no layout shift when data lands.
 */
export function PanelLoading() {
  const rows = [62, 48, 70, 40, 56, 66, 44, 52];
  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-list" aria-busy="true">
      <div className="title-row">
        <div className="title-text">
          <p className="crumb" translate="no">Accountie</p>
          <h1 role="status">Yükleniyor…</h1>
          <p className="finding" aria-hidden="true"><span className="sk sk-finding" /></p>
        </div>
      </div>
      <section className="panel list-panel" aria-hidden="true">
        <div className="tabs"><span className="sk sk-tab" /><span className="sk sk-tab" /><span className="sk sk-tab" /><span className="sk sk-tab" /></div>
        <div className="sk-head"><span>Satıcı</span><span>Toplam</span></div>
        {rows.map((w, i) => (
          <div key={i} className="sk-row"><span className="sk" style={{ width: `${w}%` }} /><span className="sk sk-num" /></div>
        ))}
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
