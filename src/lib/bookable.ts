import { listFirmAccounts } from "@/db/queries";
import { approvalProblem } from "./journal";
import { planIndex, type PlanIndex } from "./plan-suggest";

/**
 * Approved receipts split by whether they may leave for Luca or a file: their lines pass the approval check against their firm's
 * plan (read once per firm). One approved before the plan came, or whose plan changed since, waits until reopened and rebuilt.
 */
export async function bookable<R extends { firmId: string | null; lines: Parameters<typeof approvalProblem>[0] }>(userId: string, list: readonly R[]): Promise<{ ok: R[]; off: R[] }> {
  const plans = new Map<string, PlanIndex>();
  for (const id of new Set(list.flatMap((r) => (r.firmId ? [r.firmId] : [])))) plans.set(id, planIndex(await listFirmAccounts(userId, id)));
  const ok: R[] = [], off: R[] = [];
  for (const r of list) (r.firmId && !approvalProblem(r.lines, plans.get(r.firmId)!) ? ok : off).push(r);
  return { ok, off };
}
