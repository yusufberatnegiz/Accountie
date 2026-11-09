"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PREVIEW_COOKIE } from "./preview-state";

/**
 * Dev previews only: answers the panel's /api calls in the browser so the flow can be played without a session or a database.
 * Upload waits like a real read and opens the first draft; approve, reopen, "entered by hand" and the Luca download change the
 * receipt's status in a session cookie that the preview pages read. ?sifirla=1 clears it.
 */
const FIRST_DRAFT = "00000000-0000-4000-8000-000000000001";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

function statuses(): Record<string, string> {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${PREVIEW_COOKIE}=`))?.slice(PREVIEW_COOKIE.length + 1);
  try {
    return raw ? JSON.parse(decodeURIComponent(raw)) : {};
  } catch {
    return {};
  }
}
const setStatus = (ids: string[], status: string) => {
  const next = { ...statuses(), ...Object.fromEntries(ids.map((id) => [id, status])) };
  document.cookie = `${PREVIEW_COOKIE}=${encodeURIComponent(JSON.stringify(next))}; path=/onizleme; samesite=lax`;
};

export function PreviewApi({ approved }: { approved: string[] }) {
  const router = useRouter();
  const ids = approved.join(",");
  useEffect(() => {
    const url = new URL(location.href);
    if (url.searchParams.has("sifirla")) {
      document.cookie = `${PREVIEW_COOKIE}=; path=/onizleme; max-age=0`;
      url.searchParams.delete("sifirla");
      router.replace(url.pathname + url.search);
    }
  }, [router]);
  useEffect(() => {
    const real = window.fetch;
    const approvedIds = ids ? ids.split(",") : [];
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      const method = (init?.method ?? "GET").toUpperCase();
      if (!url.startsWith("/api/")) return real(input, init);
      await wait(300);
      if (url === "/api/receipts" && method === "POST") {
        await wait(1500);
        return json({ id: FIRST_DRAFT, ids: [FIRST_DRAFT] });
      }
      if (url === "/api/receipts/bulk-approve") {
        const chosen: string[] = JSON.parse(String(init?.body ?? "{}")).ids ?? [];
        setStatus(chosen, "approved");
        return json({ approved: chosen.length, skipped: 0 });
      }
      const action = /^\/api\/receipts\/([^/]+)\/(approve|reopen|exported)$/.exec(url);
      if (action) setStatus([action[1]], { approve: "approved", reopen: "draft", exported: "exported" }[action[2]]!);
      if (url === "/api/exports") {
        const chosen: string[] | undefined = JSON.parse(String(init?.body ?? "{}")).receiptIds;
        setStatus(chosen ?? approvedIds, "exported");
        return new Response("Önizleme: gerçek Luca dosyası yok.", { headers: { "content-disposition": 'attachment; filename="onizleme-luca.txt"' } });
      }
      if (url === "/api/efatura" || url === "/api/gib/earsiv") {
        return json({ created: 3, ids: [], remaining: 0, skipped: [{ file: "a.xml", number: "ABC2026000000398", reason: "Firmanın kendi kestiği fatura (satış); gider olarak alınmadı." }] });
      }
      return json({});
    };
    return () => { window.fetch = real; };
  }, [ids]);
  return null;
}
