import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getReceipt } from "@/db/queries";
import { AppHeader } from "@/components/AppHeader";
import { ReviewEditor } from "@/components/ReviewEditor";
import { idSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { STATUS_LABELS } from "@/lib/status";

export const metadata: Metadata = { title: "Fiş kontrolü" };
export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) redirect("/giris");
  const id = idSchema.safeParse((await params).id);
  const receipt = id.success ? await getReceipt(userId, id.data) : null;
  if (!receipt) notFound();

  return (
    <>
      <AppHeader current="fisler" />
      <main className="page">
        <div className="page-head">
          <div>
            <p className="muted"><Link href="/">Fişler</Link></p>
            <h1>{receipt.vendorName ?? "Okunamayan fiş"}</h1>
            <p>
              <span className={`status status-${receipt.status}`}>{STATUS_LABELS[receipt.status]}</span>
              {receipt.taxNumber ? <span className="mono"> · VKN {receipt.taxNumber}</span> : null}
            </p>
          </div>
        </div>
        <ReviewEditor receipt={receipt} />
      </main>
    </>
  );
}
