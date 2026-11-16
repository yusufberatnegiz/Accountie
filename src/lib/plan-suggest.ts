import type { Account, RuleRow } from "./default-rules";

// Words that name each receipt category in a Luca chart of accounts, most telling first.
const EXPENSE_WORDS: Record<string, readonly string[]> = {
  fuel: ["akaryakıt", "yakıt"],
  stationery: ["kırtasiye"],
  cargo: ["kargo", "nakliye"],
  // "Taşıt" alone would also find the motor vehicle tax (MTV); a car's running costs are named with yakıt or gider.
  parking: ["otopark", "köprü", "otoyol", "taşıt yakıt", "taşıt gider"],
  transport: ["ulaşım", "taşıma", "seyahat"],
  cleaning: ["temizlik"],
  maintenance: ["bakım", "tamir", "onarım"],
  meal: ["yeme", "ağırlama"],
  telecom: ["haberleşme", "telefon", "internet", "ptt"],
  lodging: ["konaklama"],
  office_supplies: ["büro", "ofis", "küçük demirbaş", "demirbaş alım"],
  // A plan with no kitchen account books tea and nuts with yeme-içme, never with fixtures.
  food_grocery: ["mutfak", "gıda", "market", "yeme", "ikram"],
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
  const byWords = (prefixes: readonly string[], words: readonly string[], skip?: RegExp) => {
    for (const prefix of prefixes) for (const w of words) { const hit = find(prefix, (n) => n.includes(w) && !skip?.test(n)); if (hit) return hit; }
  };
  const pick = (r: RuleRow) => {
    if (r.kind === "expense" && r.key === "kkeg") return byWords(["689", "6"], ["binek araç gider", "kanunen kabul", "kkeg"]);
    // A fixture account ("Diğer Küçük Demirbaşlar") is only ever office supplies; "diğer" must not land a market receipt there.
    if (r.kind === "expense") return byWords(["770", "7"], EXPENSE_WORDS[r.key] ?? [], r.key === "office_supplies" ? undefined : /demirbaş/);
    // "% 20 Li İndirilecek Kdv": the rate as a number of its own. Real plans also hold the same rate as withholding (sorumlu
    // sıfatıyla, tevkifatlı), import and refund KDV; a receipt's KDV is none of those ("tevkifatsız" is the plain one).
    if (r.kind === "vat") {
      const hits = leaves.filter((a) => a.code.startsWith("191") && new RegExp(`(^|\\D)0*${Number(r.key)}(\\D|$)`).test(a.lower) && !/sorumlu|ithal|iade|tevkifatlı/.test(a.lower));
      // Two accounts may name the same rate (191.03.0 and 191.03.20); the one numbered after the rate is the usual one.
      return hits.find((a) => a.code.endsWith(`.${r.key.padStart(2, "0")}`)) ?? hits[0];
    }
    // A card (and an unread payment) is the partner's by default: the plan's Ortaklara Borçlar first, a company card account only without one.
    if (r.kind === "payment" && (r.key === "card" || r.key === "other")) return find("331", (n) => n.includes("ortak")) ?? find("3", (n) => n.includes("kredi kart"));
    if (r.kind === "payment" && r.key === "cash") return find("100", () => true);
    // Foreign services: the expense under 760/770 that names abroad or advertising; the KDV pair the plan calls "sorumlu" or KDV 2.
    if (r.kind === "foreign" && r.key === "expense") return byWords(["760", "770"], ["yurt dışı", "yurtdışı", "dijital", "reklam"]);
    // The KDV on a foreign service is computed at the general rate: the sorumlu account of that rate, not the plan's first.
    if (r.kind === "foreign" && r.key === "vatIn") return find("191", (n) => n.includes("sorumlu") && hasRate(n, 20)) ?? find("191", (n) => n.includes("sorumlu") && !/\d/.test(n));
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
    const code = r.kind === "expense" ? (r.key === "kkeg" ? "689" : "770") : r.kind === "vat" ? "191"
      : r.kind === "sales" ? (r.key.startsWith("revenue") ? "600" : r.key.startsWith("vat") ? "391" : r.key === "card" ? "108" : "100") : null;
    if (r.kind === "payment" && (r.key === "card" || r.key === "other")) return leaves.find((a) => a.code === "331") ?? (r.key === "card" ? leaves.find((a) => a.code === "309") : undefined);
    return code ? leaves.find((a) => a.code === code) : undefined;
  };
  return rows.map((r) => { const hit = pick(r) ?? main(r); return hit ? { ...r, accountCode: hit.code, accountName: hit.name } : r; });
}

/** Whether an account name carries the KDV rate as a number of its own ("% 01 Li" is 1, "%10" is not 1). */
const hasRate = (name: string, rate: number) => new RegExp(`(^|\\D)0*${rate}(\\D|$)`).test(name);
/** The KDV rate a rule is about (vat:20, sales revenue:10), or null. */
const ruleRate = (r: RuleRow) => (r.kind === "vat" ? Number(r.key) : r.kind === "sales" && /:\d+$/.test(r.key) ? Number(r.key.split(":")[1]) : null);

const STOP_WORDS = new Set(["gider", "gideri", "giderleri", "giderler", "hesabı", "hesap", "alımlar", "alımları", "için", "ödenen"]);
const words = (name: string) => new Set(name.toLocaleLowerCase("tr").split(/[^\p{L}\d%]+/u).filter((w) => w.length >= 4 && !STOP_WORDS.has(w)));
/** Whether two account names mean the same account: they share a telling word ("Mutfak Giderleri" and "Küçük Demirbaş Alımları" do not). */
export function sameMeaning(a: string, b: string): boolean {
  const left = words(a);
  return [...words(b)].some((w) => left.has(w));
}

/**
 * The rules as they apply to a firm whose Luca plan is imported, with nothing saved: a rule whose code is a postable account of
 * the plan with a name of the same meaning stays; otherwise the plan's matching account takes its place; with none, the code is
 * left empty so the receipt waits for the user instead of going to an account that means something else. `own` rules (saved for
 * this firm) are the user's choice and stay. Every code found in the plan carries the plan's own name, as Luca shows it.
 */
export function fitRulesToPlan(rows: readonly RuleRow[], plan: readonly Account[], own: (r: RuleRow) => boolean = () => false): RuleRow[] {
  if (plan.length === 0) return [...rows];
  const byCode = new Map(plan.map((a) => [a.code, a.name]));
  const postable = (code: string) => byCode.has(code) && !plan.some((b) => b.code.startsWith(`${code}.`));
  return rows.map((r) => {
    const named = byCode.has(r.accountCode) ? { ...r, accountName: byCode.get(r.accountCode)! } : r;
    if (r.kind === "setting" || own(r)) return named;
    const lucaName = byCode.get(r.accountCode) ?? "";
    // A rate in the plan's name must be the rule's rate: "600.20 % 10 Kdv Li Satışlar" is not the %20 sales account.
    const rate = ruleRate(r);
    const rateOk = rate === null || !/\d/.test(lucaName) || hasRate(lucaName.toLocaleLowerCase("tr"), rate);
    if (postable(r.accountCode) && rateOk && sameMeaning(r.accountName, lucaName)) return named;
    const [suggested] = suggestRules([r], plan);
    return suggested === r ? { ...r, accountCode: "", accountName: "" } : suggested;
  });
}

/**
 * Lines whose account means something else in the firm's Luca plan than the name the line carries (a draft built before the rules
 * followed the plan: "Mutfak Giderleri" on 770.12, which the plan calls "Küçük Demirbaş Alımları"). Luca books by code alone.
 */
export function planMismatches(lines: readonly { accountCode: string; accountName: string }[], plan: readonly Account[]): { code: string; ours: string; luca: string }[] {
  const byCode = new Map(plan.map((a) => [a.code, a.name]));
  const out: { code: string; ours: string; luca: string }[] = [];
  for (const l of lines) {
    const luca = byCode.get(l.accountCode);
    if (luca && l.accountName.trim() && !sameMeaning(l.accountName, luca) && !out.some((o) => o.code === l.accountCode)) out.push({ code: l.accountCode, ours: l.accountName, luca });
  }
  return out;
}

/** The warning a draft with such lines carries on its screen. */
export const planMismatchWarning = (m: readonly { code: string; ours: string; luca: string }[]) => ({
  code: "plan_name",
  message: `${m.map((x) => `${x.code} Luca planında "${x.luca}" (satırda "${x.ours}" yazıyor)`).join("; ")}. Luca'ya bu hesap yazılır; hesap kodunu kontrol edin.`,
});
