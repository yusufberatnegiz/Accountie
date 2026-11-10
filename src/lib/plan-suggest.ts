import type { Account, RuleRow } from "./default-rules";

// Words that name each receipt category in a Luca chart of accounts, most telling first.
const EXPENSE_WORDS: Record<string, readonly string[]> = {
  fuel: ["akaryakıt", "yakıt"],
  stationery: ["kırtasiye"],
  cargo: ["kargo", "nakliye"],
  parking: ["otopark"],
  transport: ["ulaşım", "taşıma", "seyahat"],
  cleaning: ["temizlik"],
  maintenance: ["bakım", "tamir", "onarım"],
  meal: ["yeme", "ağırlama"],
  telecom: ["haberleşme", "telefon", "internet", "ptt"],
  lodging: ["konaklama"],
  office_supplies: ["büro", "ofis"],
  food_grocery: ["mutfak", "gıda", "market"],
  other: ["diğer"],
};

/**
 * The rows with each rule moved onto the firm's own Luca account where the plan names one; a rule with no match is left as it is.
 * Only accounts that can be posted to (no sub-account under them) are offered. A suggestion, not a decision: the user saves it.
 */
export function suggestRules(rows: readonly RuleRow[], plan: readonly Account[]): RuleRow[] {
  const leaves = plan.filter((a) => !plan.some((b) => b.code.startsWith(`${a.code}.`)))
    .map((a) => ({ ...a, lower: a.name.toLocaleLowerCase("tr") }))
    .sort((a, b) => a.code.localeCompare(b.code));
  const find = (prefix: string, test: (name: string) => boolean) => leaves.find((a) => a.code.startsWith(prefix) && test(a.lower));
  const byWords = (prefixes: readonly string[], words: readonly string[]) => {
    for (const prefix of prefixes) for (const w of words) { const hit = find(prefix, (n) => n.includes(w)); if (hit) return hit; }
  };
  const pick = (r: RuleRow) => {
    if (r.kind === "expense") return byWords(["770", "7"], EXPENSE_WORDS[r.key] ?? []);
    // "% 20 Li İndirilecek Kdv": the rate as a number of its own. Real plans also hold the same rate as withholding (sorumlu
    // sıfatıyla, tevkifatlı), import and refund KDV; a receipt's KDV is none of those ("tevkifatsız" is the plain one).
    if (r.kind === "vat") {
      const hits = leaves.filter((a) => a.code.startsWith("191") && new RegExp(`(^|\\D)${Number(r.key)}(\\D|$)`).test(a.lower) && !/sorumlu|ithal|iade|tevkifatlı/.test(a.lower));
      // Two accounts may name the same rate (191.03.0 and 191.03.20); the one numbered after the rate is the usual one.
      return hits.find((a) => a.code.endsWith(`.${r.key.padStart(2, "0")}`)) ?? hits[0];
    }
    if (r.kind === "payment" && r.key === "card") return find("3", (n) => n.includes("kredi kart"));
    if (r.kind === "payment" && r.key === "cash") return find("100", () => true);
  };
  return rows.map((r) => { const hit = pick(r); return hit ? { ...r, accountCode: hit.code, accountName: hit.name } : r; });
}
