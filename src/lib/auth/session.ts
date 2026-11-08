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
