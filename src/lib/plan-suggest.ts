import type { Account, RuleRow } from "./default-rules";

/**
 * Account names compared in one form: Turkish lower case with the dotless ı read as i, so a plan typed without Turkish letters
 * ("ITHALDE ODENEN KDV", "TASIT YAKIT") matches the same words as one typed with them. Every word and pattern here is written in it.
 */
export const fold = (s: string) => s.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");
// Folds the letters of a pattern, never its escapes (\p{L}, \d stay as they are).
const F = (re: RegExp) => new RegExp(re.source.replace(/\\p\{[^}]*\}|\\.|[^\\]/gu, (m) => (m.startsWith("\\") ? m : fold(m))), re.flags);

// Words that name each receipt category in a Luca chart of accounts, most telling first.
const EXPENSE_WORDS: Record<string, readonly string[]> = Object.fromEntries(Object.entries({
  fuel: ["akaryakıt", "motorin", "benzin", "yakıt", "taşıt gider"],
  stationery: ["kırtasiye"],
  cargo: ["kargo", "kurye", "posta", "nakliye"],
  // "Taşıt" alone would also find the motor vehicle tax (MTV); a car's running costs are named with yakıt or gider.
  parking: ["otopark", "köprü", "otoyol", "taşıt yakıt", "taşıt gider"],
  transport: ["ulaşım", "seyahat", "taksi", "yol gider"],
  cleaning: ["temizlik"],
  // The workplace's repairs; a vehicle's go to vehicle_maintenance.
  maintenance: ["bina bakım", "demirbaş tamir", "bakım", "tamir", "onarım"],
  vehicle_maintenance: ["taşıt bakım", "taşıt tamir", "taşıt yakıt ve tamir", "araç bakım", "araç tamir", "oto bakım", "taşıt gider"],
  meal: ["ağırlama", "temsil ve", "yeme-içme", "yeme içme", "yeme"],
  telecom: ["haberleşme", "iletişim", "telefon", "gsm", "ptt"],
  lodging: ["konaklama", "otel"],
  office_supplies: ["büro malzeme", "ofis malzeme", "küçük demirbaş", "demirbaş alım", "büro", "ofis"],
  // A plan with no kitchen account books tea and nuts with yeme-içme, never with fixtures.
  food_grocery: ["mutfak", "çay ocağı", "gıda", "market", "yeme", "ikram"],
  other: ["diğer çeşitli", "çeşitli", "muhtelif", "diğer gider", "diğer"],
}).map(([k, ws]) => [k, ws.map(fold)]));

// Accounts no receipt category is booked to: fixtures (only office supplies), taxes, finance, depreciation, extraordinary items,
// and an account kept for KKEG (a receipt's expense is never all KKEG: binek splits 30% there itself).
const NOT_AN_EXPENSE = F(/küçük demirbaş|demirbaş alım|vergi|harç|finansman|faiz|kur fark|olağan|amortisman|kanunen kabul|kkeg|personel/);
/** A vehicle's account: "Taşıt", "Araç" (not "araç gereç" / "araç ve gereç", equipment), "Oto". */
const VEHICLE_WORD = F(/taşıt|araç(?![ -]*(ve )?gereç)|(^|[^\p{L}])oto([^\p{L}]|$)/u);
const WORKPLACE_WORD = F(/bina|demirbaş|işyeri|makine|gereç|büro/);
const SKIP: Record<string, (n: string) => boolean> = {
  office_supplies: (n) => F(/vergi|harç|finansman|faiz|kur fark|olağan|amortisman|kanunen kabul|kkeg|kira|temizlik/).test(n),
  // A notary's fee (harç) sits with stationery in many plans ("Kırtasiye Noter Harç").
  stationery: (n) => F(/küçük demirbaş|demirbaş alım|vergi|finansman|faiz|kur fark|olağan|amortisman|kanunen kabul|kkeg/).test(n),
  fuel: (n) => NOT_AN_EXPENSE.test(n) || F(/ısınma|kalorifer|doğalgaz|doğal gaz/).test(n),
  maintenance: (n) => NOT_AN_EXPENSE.test(n) || VEHICLE_WORD.test(n),
  vehicle_maintenance: (n) => NOT_AN_EXPENSE.test(n) || F(/bina/).test(n) || !VEHICLE_WORD.test(n),
  transport: (n) => NOT_AN_EXPENSE.test(n) || F(/nakliye|taşımacılık/).test(n),
};
const skipFor = (key: string) => SKIP[key] ?? ((n: string) => NOT_AN_EXPENSE.test(n));
/** A foreign-currency or gold till: never the receipt's Kasa. "Altındağ Kasa" is a lira till. */
const FOREIGN_TILL = F(/(^|[^\p{L}])(usd|eur|avro|dolar|döviz|gbp|sterlin|chf|frank|yen|jpy|riyal|ruble|yabancı para)|(^|[^\p{L}])altın([^\p{L}]|$)/u);
/** KDV accounts that are not a receipt's own deductible KDV: withholding, reverse charge, abroad, import, customs, refund, non-deductible. */
const OTHER_VAT = F(/sorumlu|ithal|gümrük|iade|tevk(?!ifatsız)|yurt ?dışı|indirilemeyecek|kanunen kabul|kkeg/);
/** Sales accounts that are not a till's day: returns, exports, withholding, tax-free, fixtures, wholesale. */
const OTHER_SALES = F(/iade|ihracat|ihraç|tevk|tax ?free|demirbaş|ilave|toptan/);
/** The KDV a foreign service is reverse-charged on (sorumlu sıfatıyla), and the 360 it is owed in. */
const REVERSE_IN = F(/sorumlu|yurt ?dışı|kdv ?2/);
const REVERSE_OUT = F(/kdv ?2|sorumlu/);
/** A rule the plan has a family of accounts for but none that can be told apart by name (each partner's own 331): left to the user. */
const BLANK: Account = { code: "", name: "" };

type Leaf = Account & { lower: string; path: string };

/**
 * The plan's accounts that can be posted to (no sub-account under them), sorted by code, with folded names; `path` adds the names
 * of the accounts above ("191.110 İthalde Ödenen KDV" makes every account under it import KDV, whatever its own name says).
 */
export function leavesOf(plan: readonly Account[]): Leaf[] {
  const parents = new Set<string>();
  const byCode = new Map(plan.map((a) => [a.code, a.name]));
  for (const a of plan) for (let i = a.code.lastIndexOf("."); i > 0; i = a.code.lastIndexOf(".", i - 1)) parents.add(a.code.slice(0, i));
  const above = (code: string) => {
    const names: string[] = [];
    for (let i = code.lastIndexOf("."); i > 0; i = code.lastIndexOf(".", i - 1)) names.push(byCode.get(code.slice(0, i)) ?? "");
    return names.join(" ");
  };
  return plan.filter((a) => !parents.has(a.code))
    .map((a) => ({ ...a, lower: fold(a.name), path: fold(`${above(a.code)} ${a.name}`) }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/** Whether an account name carries the KDV rate as a number of its own ("% 01 Li" is 1, "%10" is not 1); dates do not count. */
const hasRate = (name: string, rate: number) => new RegExp(`(^|\\D)0*${rate}(\\D|$)`).test(name.replace(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g, " "));

/**
 * The rows with each rule moved onto the firm's own Luca account where the plan names one, or onto 770/191/309 when that main
 * account has no sub-accounts; any other rule with no match is left as it is (the same object).
 * Only accounts that can be posted to (no sub-account under them) are offered.
 */
export function suggestRules(rows: readonly RuleRow[], plan: readonly Account[]): RuleRow[] {
  const leaves = leavesOf(plan);
  const under = (prefix: string) => leaves.filter((a) => a.code === prefix || a.code.startsWith(`${prefix}.`));
  const find = (prefix: string, test: (a: Leaf) => boolean) => leaves.find((a) => a.code.startsWith(prefix) && test(a));
  const byWords = (prefixes: readonly string[], words: readonly string[], skip: (n: string) => boolean) => {
    for (const prefix of prefixes) for (const w of words) { const hit = find(prefix, (a) => a.lower.includes(w) && !skip(a.lower)); if (hit) return hit; }
  };
  /** One account of a kind, or BLANK when the plan has several that cannot be told apart (one per partner, per bank). */
  const onlyOne = (hits: readonly Leaf[]) => (hits.length > 1 ? BLANK : hits[0]);
  const partner = (key: string) => {
    // Several 331 sub-accounts are one per partner ("ORTAK AHMET YILMAZ"): which partner paid is the user's to say.
    const subs = leaves.filter((a) => a.code.startsWith("331."));
    if (subs.length) return onlyOne(subs);
    if (find("331", (a) => a.lower.includes("ortak"))) return find("331", (a) => a.lower.includes("ortak"));
    // No partner account: a company card account, unless the plan has one per bank.
    return key === "card" ? onlyOne(leaves.filter((a) => /^3(00|09)/.test(a.code) && a.lower.includes("kredi kart"))) : undefined;
  };
  const pick = (r: RuleRow): Account | undefined => {
    if (r.kind === "expense" && r.key === "kkeg") {
      return byWords(["689"], ["binek", "kanunen kabul", "kkeg"].map(fold), () => false) ?? byWords(["770"], ["kanunen kabul", "kkeg"].map(fold), () => false);
    }
    // Operating expenses (770, 7/A) first, then marketing (760), then the 7/B plan's 79x; never cost (740) or finance (780).
    if (r.kind === "expense") {
      // 79x only in a 7/B plan (one with 79x sub-accounts); Luca's bare template carries both 770 and 794 and books to 770.
      const sevenB = leaves.some((a) => /^79\d\./.test(a.code)) ? ["79"] : [];
      const prefixes = r.key === "other" ? ["770", ...sevenB] : ["770", "760", ...sevenB];
      const hit = byWords(prefixes, EXPENSE_WORDS[r.key] ?? [], skipFor(r.key));
      if (hit || (r.key !== "maintenance" && r.key !== "vehicle_maintenance")) return hit;
      // Repairs: an account shared by both kinds ("Bina ve Taşıt Bakım") is better than none, but never one only for the other kind.
      const shared = r.key === "maintenance" ? (n: string) => VEHICLE_WORD.test(n) && !WORKPLACE_WORD.test(n) : (n: string) => !VEHICLE_WORD.test(n);
      return byWords(prefixes, EXPENSE_WORDS[r.key], (n) => NOT_AN_EXPENSE.test(n) || shared(n));
    }
    // "% 20 Li İndirilecek Kdv": the rate as a number of its own. Real plans also hold the same rate as withholding (sorumlu
    // sıfatıyla, tevkifatlı), import and refund KDV; a receipt's KDV is none of those ("tevkifatsız" is the plain one).
    if (r.kind === "vat") {
      const hits = leaves.filter((a) => a.code.startsWith("191") && hasRate(a.lower, Number(r.key)) && !OTHER_VAT.test(a.path));
      // Two accounts may name the same rate (191.03.0 and 191.03.20); the one numbered after the rate is the usual one.
      return hits.find((a) => a.code.endsWith(`.${r.key.padStart(2, "0")}`)) ?? hits[0];
    }
    if (r.kind === "payment" && (r.key === "card" || r.key === "other")) return partner(r.key);
    if ((r.kind === "payment" || r.kind === "sales") && r.key === "cash") return find("100", (a) => !FOREIGN_TILL.test(a.lower));
    // Foreign services: the expense under 760/770 that names abroad or digital; a domestic advertising account is not one.
    if (r.kind === "foreign" && r.key === "expense") return byWords(["760", "770"], ["yurt dışı", "yurtdışı", "dijital", "internet reklam", "sosyal medya"].map(fold), (n) => F(/tevkifat|seyahat|seyehat|konaklama/).test(n));
    // The KDV on a foreign service is computed at the general rate: the reverse-charge account of that rate, not the plan's first.
    if (r.kind === "foreign" && r.key === "vatIn") return find("191", (a) => REVERSE_IN.test(a.path) && hasRate(a.lower.replace(/kdv ?2/, ""), 20)) ?? find("191", (a) => REVERSE_IN.test(a.path) && !/\d/.test(a.lower.replace(/kdv ?2/, "")));
    if (r.kind === "foreign" && r.key === "vatOut") return find("360", (a) => REVERSE_OUT.test(a.path));
    // Sales: card takings (one POS or card account, not one per bank), and per rate the 600 sales and 391 KDV.
    if (r.kind === "sales" && r.key === "card") {
      const named = under("108").filter((a) => F(/kredi kart|pos/).test(a.lower));
      return named.length ? onlyOne(named) : under("108").length === 1 ? under("108")[0] : undefined;
    }
    if (r.kind === "sales") {
      const [part, rate] = r.key.split(":");
      // A till's day is retail: perakende first when the plan splits it from wholesale.
      const named = (prefix: string) => leaves.filter((a) => a.code.startsWith(prefix) && !OTHER_SALES.test(a.path))
        .sort((a, b) => Number(b.lower.includes("perakende")) - Number(a.lower.includes("perakende")));
      if (part === "revenue" && rate === "0") return named("600").find((a) => /kdv\W?siz|%\s?0(\D|$)/.test(a.lower));
      const hit = (prefix: string) => named(prefix).find((a) => hasRate(a.lower, Number(rate)));
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

/** The KDV rate a rule is about (vat:20, sales revenue:10), or null. */
const ruleRate = (r: RuleRow) => (r.kind === "vat" ? Number(r.key) : r.kind === "sales" && /:\d+$/.test(r.key) ? Number(r.key.split(":")[1]) : null);

// Words too common in account names to say two accounts are the same ("Diğer Genel Yönetim" and "Diğer Küçük Demirbaşlar";
// "Ödenecek Gelir Vergisi" and "Ödenecek KDV"; "Nakliye Hizmet" and "Yurt Dışı Hizmet"; "Temizlik Malzemesi" and "Büro Malzemesi").
const STOP_WORDS = new Set(["gider", "gideri", "giderleri", "giderler", "hesabi", "hesap", "alimlar", "alimlari", "icin", "odenen",
  "diger", "genel", "yonetim", "cesitli", "odenecek", "hizmet", "hizmeti", "hizmetleri", "malzeme", "malzemesi", "malzemeleri",
  "borclar", "borclari", "satislar", "satislari", "satis"]);
const words = (name: string) => new Set(fold(name).split(/[^\p{L}\d%]+/u).filter((w) => w.length >= 4 && !STOP_WORDS.has(w)));
const plain = (name: string) => fold(name).replace(/[^\p{L}\d%]+/gu, " ").trim();
/** Whether two account names mean the same account: the same name, or a shared telling word ("Mutfak" and "Küçük Demirbaş" do not). */
function sameMeaning(a: string, b: string): boolean {
  if (plain(a) === plain(b)) return true;
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
  const leaves = new Map(leavesOf(plan).map((a) => [a.code, a]));
  // One pass over the plan for every rule, not one per rule: a plan may hold thousands of accounts.
  const suggestions = suggestRules(rows, plan);
  const partnerSubs = [...leaves.keys()].filter((c) => c.startsWith("331.")).length;
  return rows.map((r, i) => {
    if (own(r)) return r;
    const lucaName = byCode.get(r.accountCode) ?? "";
    const named = lucaName ? { ...r, accountName: lucaName } : r;
    if (r.kind === "setting") return named;
    const leaf = leaves.get(r.accountCode);
    const lower = leaf?.lower ?? "", path = leaf?.path ?? "";
    // A rate in the plan's name must be the rule's rate: "600.20 % 10 Kdv Li Satışlar" is not the %20 sales account.
    const rate = ruleRate(r);
    const rateOk = rate === null || !/\d/.test(lower.replace(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g, "")) || hasRate(lower, rate);
    // The same name may still be the wrong kind: the same filters a suggestion goes through.
    const kindOk = !(r.kind === "vat" && OTHER_VAT.test(path)) && !(r.key === "cash" && FOREIGN_TILL.test(lower))
      && !(r.kind === "expense" && r.key !== "kkeg" && skipFor(r.key)(lower))
      && !(r.kind === "sales" && r.key !== "cash" && r.key !== "card" && OTHER_SALES.test(path))
      && !(r.kind === "foreign" && r.key === "vatIn" && !REVERSE_IN.test(path))
      && !(r.kind === "foreign" && r.key === "vatOut" && !REVERSE_OUT.test(path))
      && !(r.kind === "foreign" && r.key === "expense" && F(/tevkifat/).test(lower))
      && !(r.kind === "payment" && (r.key === "card" || r.key === "other") && partnerSubs > 1);
    if (leaf && rateOk && kindOk && sameMeaning(r.accountName, lucaName)) return named;
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
