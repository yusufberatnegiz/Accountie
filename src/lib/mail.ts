import "server-only";

/**
 * Transactional e-mail through Resend's HTTP API (the same account Supabase Auth sends through, its domain already verified).
 * RESEND_API_KEY unset: nothing is sent and false comes back, so a missing key never fails the action that triggered it.
 * MAIL_FROM must be an address on the verified domain.
 */
export type Mail = { to: string; subject: string; text: string; html: string };

export async function sendMail(mail: Mail, fetcher: typeof fetch = fetch): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const res = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || "Accountie <bildirim@accountie.app>",
      to: [mail.to],
      reply_to: "destek@accountie.app",
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  return Boolean(res?.ok);
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
/** For anything a user typed (an invoice title, an address) before it goes into the HTML part. */
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);
