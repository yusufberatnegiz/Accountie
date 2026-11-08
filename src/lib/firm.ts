import { cookies } from "next/headers";
import { listFirms, type Firm } from "@/db/queries";
import { FIRM_COOKIE } from "./firm-cookie";

/** `wanted` (the page's firm), else the cookie's, when it is one of the user's; else the first by name. */
export async function activeFirm(userId: string, wanted?: string | null): Promise<{ firms: Firm[]; firm: Firm }> {
  const firms = await listFirms(userId);
  const id = (wanted && firms.some((f) => f.id === wanted) ? wanted : null) ?? (await cookies()).get(FIRM_COOKIE)?.value;
  return { firms, firm: firms.find((f) => f.id === id) ?? firms[0] };
}
