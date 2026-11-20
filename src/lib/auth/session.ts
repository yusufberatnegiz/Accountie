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

/** Approving an e-Tebligat scan (it unseals clients' GİB logins for the extension) asks for a sign-in within this window. */
export const FRESH_SIGN_IN_MS = 30 * 60_000;
export const SIGN_IN_AGAIN = "Güvenlik için yeniden giriş yapın: Hesap menüsünden çıkış yapıp tekrar girin, sonra bu işlemi yineleyin.";

/**
 * Whether the user signed in (password, e-mailed link) within `maxMs`: refreshing a session keeps its sign-in times, so a
 * cookie stolen weeks ago is not enough for actions on a client's GİB login.
 */
export async function signedInWithin(maxMs: number, now = Date.now()): Promise<boolean> {
  const { data } = await (await getAuth()).getClaims();
  const amr = (data?.claims as { amr?: unknown } | undefined)?.amr;
  // Only a sign-in the user made (password, e-mailed link or code, a reset link): never a refresh or an anonymous session.
  return Array.isArray(amr) && amr.some((e) => e && typeof e === "object" && SIGN_IN_METHODS.includes(String((e as { method?: unknown }).method))
    && typeof (e as { timestamp?: unknown }).timestamp === "number" && now - (e as { timestamp: number }).timestamp * 1000 < maxMs);
}
const SIGN_IN_METHODS = ["password", "otp", "magiclink", "email", "recovery"];
