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
  // The workplace's repairs; a vehicle's go to vehicle_maintenance.
  maintenance: ["bina bakım", "demirbaş tamir", "bakım", "tamir", "onarım"],
  vehicle_maintenance: ["taşıt bakım", "taşıt tamir", "taşıt yakıt ve tamir", "araç bakım", "araç tamir", "taşıt gider"],
  meal: ["ağırlama", "temsil", "yeme-içme", "yeme içme", "yeme"],
  telecom: ["haberleşme", "telefon", "internet", "ptt"],
  lodging: ["konaklama"],
  office_supplies: ["büro", "ofis", "küçük demirbaş", "demirbaş alım"],
  // A plan with no kitchen account books tea and nuts with yeme-içme, never with fixtures.
  food_grocery: ["mutfak", "gıda", "market", "yeme", "ikram"],
  other: ["diğer çeşitli", "çeşitli", "diğer gider", "diğer"],
};
// Accounts no receipt category is booked to: fixtures (only office supplies), taxes, finance, depreciation, extraordinary items.
const NOT_AN_EXPENSE = /küçük demirbaş|demirbaş alım|vergi|harç|finansman|faiz|kur fark|olağan|amortisman/;
const SKIP: Record<string, RegExp> = {
  office_supplies: /vergi|harç|finansman|faiz|kur fark|olağan|amortisman/,
  // A notary's fee (harç) sits with stationery in many plans ("Kırtasiye Noter Harç").
  stationery: /küçük demirbaş|demirbaş alım|vergi|finansman|faiz|kur fark|olağan|amortisman/,
  maintenance: new RegExp(`${NOT_AN_EXPENSE.source}|taşıt|araç`),
  vehicle_maintenance: new RegExp(`${NOT_AN_EXPENSE.source}|bina`),
  meal: new RegExp(`${NOT_AN_EXPENSE.source}|personel`),
  food_grocery: new RegExp(`${NOT_AN_EXPENSE.source}|personel`),
};
/** A foreign-currency or gold till: never the receipt's Kasa. Whole words: "Altındağ Kasa" is a lira till. */
const FOREIGN_TILL = /(^|[^\p{L}])(usd|eur|euro|avro|dolar|döviz|gbp|sterlin|altın)([^\p{L}]|$)/u;
/** KDV accounts that are not a receipt's own deductible KDV: withholding (tevkifat, TEVK.), reverse charge, import, refund. */
const OTHER_VAT = /sorumlu|ithal|iade|tevk(?!ifatsız)/;
/** A rule the plan has a family of accounts for but none that can be told apart by name (each partner's own 331): left to the user. */
const BLANK: Account = { code: "", name: "" };

/** The plan's accounts that can be posted to (no sub-account under them), sorted by code, with lower-case names. */
export function leavesOf(plan: readonly Account[]) {
  const parents = new Set<string>();
  for (const a of plan) for (let i = a.code.lastIndexOf("."); i > 0; i = a.code.lastIndexOf(".", i - 1)) parents.add(a.code.slice(0, i));
  return plan.filter((a) => !parents.has(a.code)).map((a) => ({ ...a, lower: a.name.toLocaleLowerCase("tr") })).sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * The rows with each rule moved onto the firm's own Luca account where the plan names one, or onto 770/191/309 when that main
 * account has no sub-accounts; any other rule with no match is left as it is (the same object).
 * Only accounts that can be posted to (no sub-account under them) are offered.
 */
export function suggestRules(rows: readonly RuleRow[], plan: readonly Account[]): RuleRow[] {
  const leaves = leavesOf(plan);
  const find = (prefix: string, test: (name: string) => boolean) => leaves.find((a) => a.code.startsWith(prefix) && test(a.lower));
  const byWords = (prefixes: readonly string[], words: readonly string[], skip?: RegExp) => {
    for (const prefix of prefixes) for (const w of words) { const hit = find(prefix, (n) => n.includes(w) && !skip?.test(n)); if (hit) return hit; }
  };
  const partner = (key: string) => {
    // Several 331 sub-accounts are one per partner ("ORTAK AHMET YILMAZ"): which partner paid is the user's to say.
    const subs = leaves.filter((a) => a.code.startsWith("331."));
    if (subs.length > 1) return BLANK;
    if (subs.length === 1) return subs[0];
    // No sub-accounts: 331 itself when it is there, a company card account only without it.
    return find("331", (n) => n.includes("ortak")) ?? (key === "card" ? find("3", (n) => n.includes("kredi kart")) : undefined);
  };
  const pick = (r: RuleRow): Account | undefined => {
    if (r.kind === "expense" && r.key === "kkeg") return byWords(["689"], ["binek araç gider", "kanunen kabul", "kkeg"]);
    // Operating expenses (770) first, then marketing (760); never cost (740) or finance (780) accounts. "Diğer" only under 770.
    if (r.kind === "expense") return byWords(r.key === "other" ? ["770"] : ["770", "760"], EXPENSE_WORDS[r.key] ?? [], SKIP[r.key] ?? NOT_AN_EXPENSE);
    // "% 20 Li İndirilecek Kdv": the rate as a number of its own. Real plans also hold the same rate as withholding (sorumlu
    // sıfatıyla, tevkifatlı), import and refund KDV; a receipt's KDV is none of those ("tevkifatsız" is the plain one).
    if (r.kind === "vat") {
      const hits = leaves.filter((a) => a.code.startsWith("191") && hasRate(a.lower, Number(r.key)) && !OTHER_VAT.test(a.lower));
      // Two accounts may name the same rate (191.03.0 and 191.03.20); the one numbered after the rate is the usual one.
      return hits.find((a) => a.code.endsWith(`.${r.key.padStart(2, "0")}`)) ?? hits[0];
    }
    // A card (and an unread payment) is the partner's by default: the plan's Ortaklara Borçlar first, a company card account only without one.
    if (r.kind === "payment" && (r.key === "card" || r.key === "other")) return partner(r.key);
    if ((r.kind === "payment" || r.kind === "sales") && r.key === "cash") return find("100", (n) => !FOREIGN_TILL.test(n));
    // Foreign services: the expense under 760/770 that names abroad or advertising; the KDV pair the plan calls "sorumlu" or KDV 2.
    // A domestic withholding account ("Tevkifatlı Reklam Giderleri") is not a foreign service.
    if (r.kind === "foreign" && r.key === "expense") return byWords(["760", "770"], ["yurt dışı", "yurtdışı", "dijital", "reklam"], /tevkifat/);
    // The KDV on a foreign service is computed at the general rate: the sorumlu account of that rate, not the plan's first.
    if (r.kind === "foreign" && r.key === "vatIn") return find("191", (n) => n.includes("sorumlu") && hasRate(n, 20)) ?? find("191", (n) => n.includes("sorumlu") && !/\d/.test(n));
    if (r.kind === "foreign" && r.key === "vatOut") return find("360", (n) => /kdv ?2|sorumlu/.test(n));
    // Sales: card takings, and per rate the 600 sales and 391 KDV that name the rate as a number of their own.
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
    // Only a bare template plan (770 itself postable): a plan with 770 sub-accounts but no matching one leaves the code to the user.
    if (r.kind === "foreign") return leaves.find((a) => a.code === (r.key === "expense" ? "770" : r.key === "vatIn" ? "191" : "360"));
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

// Words too common in account names to say two accounts are the same ("Diğer Genel Yönetim" and "Diğer Küçük Demirbaşlar").
const STOP_WORDS = new Set(["gider", "gideri", "giderleri", "giderler", "hesabı", "hesap", "alımlar", "alımları", "için", "ödenen", "diğer", "genel", "yönetim", "çeşitli"]);
const words = (name: string) => new Set(name.toLocaleLowerCase("tr").split(/[^\p{L}\d%]+/u).filter((w) => w.length >= 4 && !STOP_WORDS.has(w)));
/** Whether two account names mean the same account: they share a telling word ("Mutfak Giderleri" and "Küçük Demirbaş Alımları" do not). */
function sameMeaning(a: string, b: string): boolean {
  const left = words(a);
  return [...words(b)].some((w) => left.has(w));
}

/**
 * The rules as they apply to a firm whose Luca plan is imported, with nothing saved: a rule whose code is a postable account of
 * the plan with a name of the same meaning stays; otherwise the plan's matching account takes its place; with none, the code is
 * left empty so the receipt waits for the user instead of going to an account that means something else. Every code found in the
 * plan carries the plan's own name, as Luca shows it. `own` rules (saved for this firm) are the user's choice and stay exactly as
 * saved, name included, so a saved code that means something else in Luca still shows as a mismatch (planMismatches).
 */
export function fitRulesToPlan(rows: readonly RuleRow[], plan: readonly Account[], own: (r: RuleRow) => boolean = () => false): RuleRow[] {
  if (plan.length === 0) return [...rows];
  const byCode = new Map(plan.map((a) => [a.code, a.name]));
  const postable = new Set(leavesOf(plan).map((a) => a.code));
  // One pass over the plan for every rule, not one per rule: a plan may hold thousands of accounts.
  const suggestions = suggestRules(rows, plan);
  const partnerSubs = [...postable].filter((c) => c.startsWith("331.")).length;
  return rows.map((r, i) => {
    if (own(r)) return r;
    const lucaName = byCode.get(r.accountCode) ?? "";
    const named = lucaName ? { ...r, accountName: lucaName } : r;
    if (r.kind === "setting") return named;
    const lower = lucaName.toLocaleLowerCase("tr");
    // A rate in the plan's name must be the rule's rate: "600.20 % 10 Kdv Li Satışlar" is not the %20 sales account.
    const rate = ruleRate(r);
    const rateOk = rate === null || !/\d/.test(lucaName) || hasRate(lower, rate);
    // The same name may still be the wrong kind: a withholding KDV account, a dollar till.
    const kindOk = !(r.kind === "vat" && OTHER_VAT.test(lower)) && !(r.key === "cash" && FOREIGN_TILL.test(lower))
      && !(r.kind === "expense" && r.key !== "kkeg" && (SKIP[r.key] ?? NOT_AN_EXPENSE).test(lower))
      && !(r.kind === "payment" && (r.key === "card" || r.key === "other") && partnerSubs > 1);
    if (postable.has(r.accountCode) && rateOk && kindOk && sameMeaning(r.accountName, lucaName)) return named;
    const suggested = suggestions[i];
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

/** The warning a draft with such lines carries on its screen and in the list. */
export const planMismatchWarning = (m: readonly { code: string; ours: string; luca: string }[]) => ({
  code: "plan_name",
  message: `${m.map((x) => `${x.code} Luca planında “${x.luca}” (satırda “${x.ours}” yazıyor)`).join("; ")}. Luca'ya bu hesap yazılır; hesap kodunu kontrol edin.`,
});
