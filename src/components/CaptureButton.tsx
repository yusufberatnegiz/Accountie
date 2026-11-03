"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { setPhoto } from "@/lib/photo-store";

const MAX_EDGE = 1600;
const TIMEOUT_MS = 60_000;
const SLOW_MS = 10_000;

/** Shrinks to ~1600px JPEG and applies EXIF orientation. Falls back to the original file if the browser cannot decode it. */
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

export function CaptureButton() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [notice, setNotice] = useState("");

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
    // Each photo becomes its own receipt; files are copied out of the input first because iOS replaces them on the next capture.
    for (const [i, file] of list.entries()) {
      setSlow(false);
      setStatus(list.length > 1 ? `Fiş okunuyor (${i + 1}/${list.length})` : "Fiş okunuyor");
      const blob = await shrink(file);
      const form = new FormData();
      form.set("image", blob, "fis.jpg");
      let failure = "Bağlantı kurulamadı. Tekrar deneyin.";
      const res = await fetch("/api/receipts", { method: "POST", body: form, signal: AbortSignal.timeout(TIMEOUT_MS) }).catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "TimeoutError") failure = "Fiş bir dakikada okunamadı. Bağlantınızı kontrol edip tekrar deneyin.";
        return null;
      });
      if (!res?.ok) {
        const body = res ? await res.json().catch(() => null) : null;
        const msg = body?.error ?? failure;
        setError(list.length > 1 ? `${added}/${list.length} fiş eklendi, kalanlar gönderilmedi. ${msg}` : msg);
        break;
      }
      const { id } = await res.json();
      setPhoto(id, blob);
      lastId = id;
      added++;
    }
    setBusy(false);
    setStatus("");
    if (list.length > 1 && added === list.length) setNotice(`${added} fiş eklendi.`);
    if (lastId && list.length === 1) router.push(`/fis/${lastId}`);
    else router.refresh();
  }

  const picker = (text: string, capture: boolean, primary: boolean) => (
    <label className={primary ? "btn btn-primary btn-lg" : "btn btn-lg"} aria-disabled={busy}>
      {text}
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
    </label>
  );

  return (
    <div className="capture">
      {/* The status region stays mounted so screen readers announce its text changes. */}
      <div role="status" className={busy ? "reading" : notice ? "" : "visually-hidden"}>
        {busy ? (
          <p>{status}… Sayfadan ayrılmayın.{slow ? <><br /><span className="small">Hâlâ okunuyor, fiş uzunsa biraz sürebilir.</span></> : null}</p>
        ) : notice ? <p className="alert">{notice}</p> : null}
      </div>
      {busy ? null : (
        <div className="capture-buttons">
          {picker("Fiş çek", true, true)}
          {picker("Galeriden seç", false, false)}
        </div>
      )}
      {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
    </div>
  );
}
