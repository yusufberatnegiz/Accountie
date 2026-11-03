/** Loading state of a panel screen: the final layout with flat grey bars at the size of the values they stand for. No shimmer. */
export function PanelLoading() {
  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-list" aria-busy="true">
      <div className="title-row">
        <div className="title-text">
          <p className="crumb" translate="no">Accountie</p>
          <h1><span className="sk sk-title" aria-hidden="true" /><span className="visually-hidden">Yükleniyor…</span></h1>
          <p className="finding" role="status">Yükleniyor…</p>
        </div>
      </div>
      <section className="panel list-panel" aria-hidden="true">
        <div className="tabs"><span className="sk sk-tab" /><span className="sk sk-tab" /><span className="sk sk-tab" /></div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sk-row"><span className="sk sk-wide" /><span className="sk sk-num" /></div>
        ))}
      </section>
      <aside className="side desktop-only" aria-hidden="true"><div className="panel side-block"><span className="sk sk-wide" /><span className="sk sk-bar" /><span className="sk sk-bar" /></div></aside>
    </main>
  );
}
