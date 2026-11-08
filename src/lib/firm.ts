import { cookies } from "next/headers";
import { listFirms, type Firm } from "@/db/queries";
import { FIRM_COOKIE } from "./firm-cookie";

/** The cookie's firm when it is one of the user's, else the first by name. */
export async function activeFirm(userId: string): Promise<{ firms: Firm[]; firm: Firm }> {
  const firms = await listFirms(userId);
  const id = (await cookies()).get(FIRM_COOKIE)?.value;
  return { firms, firm: firms.find((f) => f.id === id) ?? firms[0] };
}
