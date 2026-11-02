// Shown while force-dynamic pages wait for the database; no animation, so nothing to reduce for reduced-motion.
export default function Loading() {
  return (
    <main className="page" aria-busy="true">
      <p className="reading" role="status">Yükleniyor…</p>
      <div className="panel skeleton" />
    </main>
  );
}
