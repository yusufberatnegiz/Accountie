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
 * The rows with each rule moved onto the firm's own Luca account where the plan names one, or onto 770/191/309 when that main
 * account has no sub-accounts; any other rule with no match is left as it is.
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
    // Foreign services: the expense under 760/770 that names abroad or advertising; the KDV pair the plan calls "sorumlu" or KDV 2.
    if (r.kind === "foreign" && r.key === "expense") return byWords(["760", "770"], ["yurt dışı", "yurtdışı", "dijital", "reklam"]);
    if (r.kind === "foreign" && r.key === "vatIn") return find("191", (n) => n.includes("sorumlu"));
    if (r.kind === "foreign" && r.key === "vatOut") return find("360", (n) => /kdv ?2|sorumlu/.test(n));
    // Sales: cash and card takings, and per rate the 600 sales and 391 KDV that name the rate as a number of their own.
    if (r.kind === "sales" && r.key === "cash") return find("100", () => true);
    if (r.kind === "sales" && r.key === "card") return find("108", (n) => n.includes("kredi kart")) ?? find("108", () => true);
    if (r.kind === "sales") {
      const [part, rate] = r.key.split(":");
      const named = (prefix: string) => leaves.filter((a) => a.code.startsWith(prefix) && !/iade|ihracat|tevkifat|tax free|demirbaş|ilave/.test(a.lower));
      if (part === "revenue" && rate === "0") return named("600").find((a) => /kdv ?siz|%0\b|% 0\b/.test(a.lower));
      const hit = (prefix: string) => named(prefix).find((a) => new RegExp(`(^|\\D)0?${Number(rate)}(\\D|$)`).test(a.lower));
      if (part === "revenue") return hit("600");
      if (part === "vat") return hit("391");
    }
  };
  // A plan with no sub-accounts under these (Luca's bare template) is posted to the main account itself.
  const main = (r: RuleRow) => {
    const code = r.kind === "expense" ? "770" : r.kind === "vat" ? "191" : r.kind === "payment" && r.key === "card" ? "309" : null;
    return code ? leaves.find((a) => a.code === code) : undefined;
  };
  return rows.map((r) => { const hit = pick(r) ?? main(r); return hit ? { ...r, accountCode: hit.code, accountName: hit.name } : r; });
}
