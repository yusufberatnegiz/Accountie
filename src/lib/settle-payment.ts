import "server-only";
import { getPaymentStatus, markPaymentFailed, markPaymentPaid, paidPaymentForMail } from "@/db/queries";
import { sendMail } from "./mail";
import { paymentMail, type PaidForMail } from "./payment-mail";
import { checkoutResult, type IyzicoConfig } from "./iyzico";

/** What the buyer is told (CreditsView OUTCOME keys). */
export type Settled = "tamam" | "hata" | "inceleme" | "bekliyor";

const DAY = 86_400_000;
// A checkout still unanswered after this long was abandoned (the page closed); it is closed so its details do not linger.
const ABANDONED_MS = 7 * DAY;

/**
 * Asks iyzico for a checkout's result and records it once: paid adds the credits (markPaymentPaid, pending -> paid only),
 * failed closes it, anything unclear stays pending to be asked again (the callback, then each visit to the Kontör page).
 */
export async function settlePayment(cfg: IyzicoConfig, p: { id: string; amountKurus: number; status: string; token: string | null; createdAt?: Date }, now = Date.now()): Promise<Settled> {
  if (p.status === "paid") return "tamam";
  if (p.status === "failed" || !p.token) return "hata";
  const result = await checkoutResult(cfg, p.token, { paymentId: p.id, amountKurus: p.amountKurus }).catch((err) => {
    console.error("iyzico result failed", { error: err instanceof Error ? err.name : "unknown" });
    return null;
  });
  if (result?.state === "paid") {
    if (await markPaymentPaid(p.id, result.providerPaymentId)) {
      await confirmByMail(p.id);
      return "tamam";
    }
    // Settled by a parallel request a moment ago: tell what it became, never "added" when it was not.
    return (await getPaymentStatus(p.id)) === "paid" ? "tamam" : "hata";
  }
  if (result?.state === "failed") {
    await markPaymentFailed(p.id);
    return "hata";
  }
  if (result?.state === "pending" && result.review) return "inceleme";
  if (p.createdAt && now - p.createdAt.getTime() > ABANDONED_MS) {
    await markPaymentFailed(p.id);
    return "hata";
  }
  return "bekliyor";
}

/**
 * The order confirmation, sent once: only right after this request turned the checkout paid. A failed send is logged and
 * never undoes the purchase (the Kontör page and the purchase history show it either way).
 */
async function confirmByMail(paymentId: string): Promise<void> {
  try {
    const row = await paidPaymentForMail(paymentId);
    if (!row?.email || !row.paidAt) return;
    const sent = await sendMail(paymentMail({ ...row, email: row.email, paidAt: row.paidAt, billing: (row.billing ?? {}) as PaidForMail["billing"] }));
    if (!sent && process.env.RESEND_API_KEY) console.error("payment mail not sent", { paymentId });
  } catch (err) {
    console.error("payment mail failed", { error: err instanceof Error ? err.name : "unknown" });
  }
}
