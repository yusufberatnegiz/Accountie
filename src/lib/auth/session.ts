import { getAuth } from "./server";

/** Current user's id from the server-side session, or null. Never trust a client-sent id. */
export async function getUserId(): Promise<string | null> {
  const { data } = await getAuth().getSession();
  return data?.user?.id ?? null;
}
