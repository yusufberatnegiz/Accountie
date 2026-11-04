"use client";

import { useRouter } from "next/navigation";
import { addTransitionType, startTransition, useEffect, useState } from "react";
import { setPhoto } from "@/lib/photo-store";

// Large enough that each of several receipts in one photo is still readable once the server cuts it out.
const MAX_EDGE = 3200;
const TIMEOUT_MS = 60_000;
const SLOW_MS = 10_000;
// The real stages of one photo: shrunk on this device, read on the server, lines back.
const STAGES = ["Fotoğraf hazırlanıyor", "", "Satırlar hazır"];

/** Shrinks to ~3200px JPEG and applies EXIF orientation. Falls back to the original file if the browser cannot decode it. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85));
  } catch {
    return file;
  }
}

type Picker = "camera" | "gallery";

/** `head`: the screen's title-row buttons. `rail`: the camera button in the phone's bottom bar (hidden on desktop). */
export function CaptureButton({ pickers = ["camera", "gallery"], variant = "head", primary = true, base = "/panel" }: { pickers?: Picker[]; variant?: "head" | "rail" | "bar"; primary?: boolean; base?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [slow, setSlow] = useState(false);
  const [notice, setNotice] = useState("");
  // The photo being read, shown small in the reading card; its object URL is released when the next one replaces it.
  const [thumb, setThumb] = useState("");
  useEffect(() => () => { if (thumb) URL.revokeObjectURL(thumb); }, [thumb]);

  // Timer restarts per photo (status changes per file); setSlow(false) happens in upload().
  useEffect(() => {
    if (!busy) return;
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, [busy, status]);

  async function upload(list: File[]) {
    setBusy(true);
    setError("");
    setNotice("");
    let lastId = "";
    let added = 0;
    let failed = false;
    // Each photo becomes its own receipt; files are copied out of the input first because iOS replaces them on the next capture.
    for (const [i, file] of list.entries()) {
      setSlow(false);
      setStage(0);
      setStatus(list.length > 1 ? `Fiş okunuyor (${i + 1}/${list.length})` : "Fiş okunuyor");
      const blob = await shrink(file);
      setThumb(URL.createObjectURL(blob));
      setStage(1);
      const form = new FormData();
      form.set("image", blob, "fis.jpg");
      let failure = "Bağlantı kurulamadı. Tekrar deneyin.";
      const res = await fetch("/api/receipts", { method: "POST", body: form, signal: AbortSignal.timeout(TIMEOUT_MS) }).catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "TimeoutError") failure = "Fiş bir dakikada okunamadı. Bağlantınızı kontrol edip tekrar deneyin.";
        return null;
      });
      if (!res?.ok) {
        const body = res ? await res.json().catch(() => null) : null;
        // A response without a message means the connection worked and the server failed; only no response is a connection problem.
        const msg = body?.error ?? (res ? "Sunucu fişi işleyemedi. Tekrar deneyin." : failure);
        setError(list.length > 1 ? `${added} fiş eklendi, kalan fotoğraflar gönderilmedi. ${msg}` : msg);
        failed = true;
        break;
      }
      // One photo may hold several receipts side by side; each gets the photo for its review screen.
      const { ids } = (await res.json()) as { ids: string[] };
      setStage(2);
      for (const id of ids) setPhoto(id, blob);
      lastId = ids[0];
      added += ids.length;
    }
    // One photo goes straight to its review; the reading card stays until that screen replaces it.
    if (lastId && list.length === 1 && added === 1) return router.push(`${base}/fis/${lastId}`);
    setBusy(false);
    setStatus("");
    if (added > 1 && !failed) setNotice(`${added} fiş eklendi.`);
    // The type lets the new rows rise in at the top of the list (ReceiptListView).
    startTransition(() => { addTransitionType("fis-eklendi"); router.refresh(); });
  }

  const input = (capture: boolean) => (
    <input
      className="visually-hidden"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
      capture={capture ? "environment" : undefined}
      multiple={!capture}
      disabled={busy}
      onChange={(e) => {
        const files = e.target.files?.length ? [...e.target.files] : [];
        e.target.value = "";
        if (files.length) upload(files);
      }}
    />
  );
  const picker = (kind: Picker) => kind === "camera"
    ? <label key={kind} className={primary ? "btn btn-primary capture-camera" : "btn capture-camera"} aria-disabled={busy}>Fiş çek{input(true)}</label>
    : <label key={kind} className="btn capture-gallery" aria-disabled={busy}>Galeriden seç{input(false)}</label>;

  return (
    <div className={`capture capture-${variant}`}>
      {/* The status region stays mounted so screen readers announce its text changes. */}
      <div role="status" className={busy ? "reading" : notice ? "" : "visually-hidden"}>
        {busy ? (
          <>
            {/* The photo itself, a scan line passing over it while the server reads; it means "working", not a percentage. */}
            <span className="feed" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL from this device, next/image cannot optimize it */}
              {thumb ? <img src={thumb} alt="" /> : null}
            </span>
            <div className="reading-text">
              <ol className="stages">
                {STAGES.slice(0, stage + 1).map((s, i) => <li key={i} data-done={i < stage || undefined}>{s || status}{i === stage && i < 2 ? "…" : ""}</li>)}
              </ol>
              <p className="small">Sayfadan ayrılmayın.{slow ? " Hâlâ okunuyor, fiş uzunsa biraz sürebilir." : ""}</p>
            </div>
          </>
        ) : notice ? <p className="alert">{notice}</p> : null}
      </div>
      {variant === "rail" ? (
        <label className="rail-item rail-capture" aria-disabled={busy}>
          <svg className="rail-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2 5.25h2.5l1.25-1.75h4.5l1.25 1.75H14v7.5H2z" /><circle cx="8" cy="8.75" r="2.25" /></svg>
          <span className="rail-label">Fiş çek</span>
          {input(true)}
        </label>
      ) : (
        // The buttons keep their slot while a receipt is read, so nothing below moves; the reading card lies over them.
        <div className="capture-buttons" inert={busy || undefined}>{pickers.map(picker)}</div>
      )}
      {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
    </div>
  );
}
