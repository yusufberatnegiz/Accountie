import { getAuth } from "./server";

/**
 * Current user's id, e-mail and sign-up time, or null. getUser() asks Supabase to verify the session token (never the
 * unverified cookie payload), and a client-sent id is never trusted.
 */
export async function getSessionUser(): Promise<{ id: string; email: string; createdAt: Date } | null> {
  const { data } = await (await getAuth()).getUser();
  const user = data?.user;
  return user ? { id: user.id, email: user.email ?? "", createdAt: new Date(user.created_at) } : null;
}

export async function getUserId(): Promise<string | null> {
  return (await getSessionUser())?.id ?? null;
}

const RECOVERY_MS = 15 * 60_000;

/**
 * Whether this session was opened by the e-mailed password link in the last 15 minutes (its verified token's amr says
 * "recovery"). Only such a session may set a new password: a stolen everyday session cookie cannot turn into a takeover.
 */
export async function inRecovery(now = Date.now()): Promise<boolean> {
  const { data } = await (await getAuth()).getClaims();
  const amr = (data?.claims as { amr?: unknown } | undefined)?.amr;
  return Array.isArray(amr) && amr.some((e) => e && typeof e === "object" && (e as { method?: unknown }).method === "recovery"
    && typeof (e as { timestamp?: unknown }).timestamp === "number" && now - (e as { timestamp: number }).timestamp * 1000 < RECOVERY_MS);
}
