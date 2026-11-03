import { TABS } from "@/components/ReceiptListView";

/**
 * Loading state of the list: the real title, buttons, tabs and table header, ten rows (the list then reaches the Luca column's foot, as a filled list does) at the size of the values
 * they stand for and one line saying what is happening. No shimmer, no layout shift when data lands.
 */
export function PanelLoading() {
  const rows = [62, 48, 70, 55, 66, 44, 58, 72, 50, 64];
  return (
    <main id="icerik" tabIndex={-1} className="canvas canvas-list" aria-busy="true">
      <div className="title-row">
        <div className="title-text">
          <h1>Fişler</h1>
          <p className="finding" role="status">Fişler yükleniyor…</p>
        </div>
        <div className="capture capture-head desktop-only" aria-hidden="true">
          <div className="capture-buttons"><span className="btn btn-primary capture-camera" aria-disabled="true">Fiş çek</span><span className="btn capture-gallery" aria-disabled="true">Galeriden seç</span></div>
        </div>
      </div>
      <section className="panel list-panel" aria-hidden="true">
        <div className="tabs">{TABS.map((t) => <span key={t.slug} className="tab-static">{t.label}</span>)}</div>
        <table className="receipts">
          <thead>
            <tr><th className="col-vendor">Satıcı</th><th className="num col-no">Evrak No</th><th className="num col-date">Tarih</th><th className="num col-code">Gider hesabı</th><th className="num col-total">Toplam</th><th className="col-status">Durum</th></tr>
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
        <section className="panel side-block">
          <div className="side-head"><p className="sk-label">Luca dosyası</p><p className="muted small">Onaylı fişler sayılıyor…</p></div>
          {["Fiş", "Satır"].map((l) => (
            <div key={l} className="meter"><div className="meter-head"><span>{l}</span><span className="sk sk-cell" /></div><span className="meter-track" /></div>
          ))}
          {/* The filled card's button and folded steps at their real size, so the column ends where the filled screen's does. */}
          <span className="btn" aria-disabled="true" style={{ justifySelf: "start" }}>Luca için indir</span>
          <p className="small">Luca&apos;da yükleme adımları</p>
        </section>
        <section className="panel side-block">
          <div className="side-head side-head-stack"><p className="sk-label">Gider hesaplarına göre</p><p className="muted small">Onaylı ve aktarılan fişler, matrah</p></div>
          <ul className="by-account">
            {[70, 52, 40, 28, 18].map((w) => <li key={w}><span className="sk" style={{ width: `${w + 20}%` }} /><span className="sk sk-num" /><span className="acc-track" /></li>)}
          </ul>
          <span className="sk" style={{ width: "30%" }} />
          {/* The filled card's foot: the 191 VAT line under the expense accounts. */}
          <p className="by-account-foot"><span><span className="tnum">191</span> <span className="muted">İndirilecek KDV</span></span><span className="sk sk-num" /></p>
        </section>
      </aside>
    </main>
  );
}
