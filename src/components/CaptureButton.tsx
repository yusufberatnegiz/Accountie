"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { setPhoto } from "@/lib/photo-store";

const MAX_EDGE = 1600;

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
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList) {
    setBusy(true);
    setError("");
    let lastId = "";
    // Each photo becomes its own receipt; iOS replaces the input's file on the next capture, so we copy them first.
    const list = [...files];
    for (const [i, file] of list.entries()) {
      setStatus(list.length > 1 ? `Fiş okunuyor (${i + 1}/${list.length})` : "Fiş okunuyor");
      const blob = await shrink(file);
      const form = new FormData();
      form.set("image", blob, "fis.jpg");
      const res = await fetch("/api/receipts", { method: "POST", body: form }).catch(() => null);
      if (!res?.ok) {
        const body = res ? await res.json().catch(() => null) : null;
        setError(body?.error ?? "Bağlantı kurulamadı. Tekrar deneyin.");
        break;
      }
      const { id } = await res.json();
      setPhoto(id, blob);
      lastId = id;
    }
    setBusy(false);
    setStatus("");
    if (input.current) input.current.value = "";
    if (lastId && list.length === 1) router.push(`/fis/${lastId}`);
    else router.refresh();
  }

  return (
    <div className="actions">
      <label className="btn btn-primary btn-lg" aria-disabled={busy}>
        {busy ? status : "Fiş çek"}
        <input
          ref={input}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          capture="environment"
          disabled={busy}
          onChange={(e) => e.target.files?.length && upload(e.target.files)}
        />
      </label>
      <p aria-live="polite" className="visually-hidden">{status}</p>
      {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
    </div>
  );
}
