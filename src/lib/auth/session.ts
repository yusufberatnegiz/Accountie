import { getAuth } from "./server";

/** Current user's id, e-mail and sign-up time from the server-side session, or null. Never trust a client-sent id. */
export async function getSessionUser(): Promise<{ id: string; email: string; createdAt: Date } | null> {
  const { data } = await getAuth().getSession();
  return data?.user ? { id: data.user.id, email: data.user.email, createdAt: new Date(data.user.createdAt) } : null;
}

export async function getUserId(): Promise<string | null> {
  return (await getSessionUser())?.id ?? null;
}
