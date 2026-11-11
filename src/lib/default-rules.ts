// Defaults from docs/research/hesap-kurallari.md section 8. Copied to account_rules on first login.
// Account names are for people only: the Luca file and the clipboard carry the code, so names are written in plain Turkish.

export type Account = { code: string; name: string };
export type PaymentMethod = "cash" | "card" | "other";
export type WarningKind = "vehicle" | "meal" | "lodging_tax";

export const CATEGORIES: readonly { key: string; label: string; account: Account; warning?: WarningKind }[] = [
  { key: "fuel", label: "Akaryakıt", account: { code: "770.01", name: "Akaryakıt Giderleri" }, warning: "vehicle" },
  { key: "stationery", label: "Kırtasiye", account: { code: "770.02", name: "Kırtasiye Giderleri" } },
  { key: "cargo", label: "Kargo ve posta", account: { code: "770.03", name: "Kargo ve Posta Giderleri" } },
  { key: "parking", label: "Otopark ve yol", account: { code: "770.04", name: "Otopark ve Yol Giderleri" }, warning: "vehicle" },
  { key: "transport", label: "Ulaşım", account: { code: "770.05", name: "Seyahat ve Ulaşım Giderleri" } },
  { key: "cleaning", label: "Temizlik", account: { code: "770.06", name: "Temizlik Giderleri" } },
  { key: "maintenance", label: "Bakım ve onarım", account: { code: "770.07", name: "Bakım ve Onarım Giderleri" }, warning: "vehicle" },
  { key: "meal", label: "Yemek ve ağırlama", account: { code: "770.08", name: "Yeme-İçme ve Ağırlama Giderleri" }, warning: "meal" },
  { key: "telecom", label: "Telefon ve internet", account: { code: "770.09", name: "Haberleşme Giderleri" } },
  { key: "lodging", label: "Konaklama", account: { code: "770.10", name: "Konaklama Giderleri" }, warning: "lodging_tax" },
  { key: "office_supplies", label: "Büro malzemesi", account: { code: "770.11", name: "Büro Malzemesi Giderleri" } },
  { key: "food_grocery", label: "Mutfak ve market", account: { code: "770.12", name: "Mutfak Giderleri" } },
  { key: "other", label: "Diğer", account: { code: "770.99", name: "Diğer Genel Yönetim Giderleri" } },
];

export const CATEGORY_KEYS = [
  "fuel", "stationery", "cargo", "parking", "transport", "cleaning", "maintenance",
  "meal", "telecom", "lodging", "office_supplies", "food_grocery", "other",
] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const LEGACY_VAT_RATES: readonly number[] = [8, 18];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = { cash: "Nakit", card: "Kart", other: "Diğer" };

/** Credit account choices offered on the review screen. */
export const PAYMENT_ALTERNATIVES: readonly (Account & { label: string })[] = [
  { label: "Kasa", code: "100.01", name: "Kasa" },
  { label: "Ortaklara Borçlar", code: "331.01", name: "Ortaklara Borçlar" },
  { label: "Şirket kredi kartı", code: "309.01", name: "Diğer Mali Borçlar" },
  { label: "Banka", code: "102.01", name: "Bankalar" },
  { label: "Personele Borçlar", code: "335.01", name: "Personele Borçlar" },
];

/** A foreign service invoice (Google, Meta...): the expense, and the KDV the buyer pays as the one responsible (sorumlu sıfatıyla). */
export type ForeignRules = { expense: Account; vatIn: Account; vatOut: Account; documentType: string };
/** A Z report booked as the day's sales: what came in (cash, card) and, per KDV rate, the sales and the KDV on them. */
export type SalesRules = { cash: Account; card: Account; revenue: Record<number, Account>; vat: Record<number, Account>; documentType: string };

export type Rules = {
  expense: Record<string, Account>;
  vat: Record<number, Account>;
  payment: Record<PaymentMethod, Account>;
  documentType: string;
  foreign: ForeignRules;
  sales: SalesRules;
};

/** The KDV rate on foreign services when the buyer computes it (the general rate). */
export const FOREIGN_VAT_RATE = 20;
export const SALES_RATES: readonly number[] = [0, 1, 10, 20];

export const DEFAULT_RULES: Rules = {
  expense: Object.fromEntries(CATEGORIES.map((c) => [c.key, c.account])),
  vat: {
    1: { code: "191.03.01", name: "%1 İndirilecek KDV" },
    10: { code: "191.03.10", name: "%10 İndirilecek KDV" },
    20: { code: "191.03.20", name: "%20 İndirilecek KDV" },
  },
  payment: {
    cash: { code: "100.01", name: "Kasa" },
    card: { code: "331.01", name: "Ortaklara Borçlar" },
    other: { code: "331.01", name: "Ortaklara Borçlar" },
  },
  documentType: "ÖK",
  // Codes most Luca plans in use carry (191.04, 600.xx, 391.xx, 108.01); the firm's own plan is picked with "Plandan öner".
  foreign: {
    expense: { code: "760.01", name: "Yurt Dışı Reklam ve Hizmet Giderleri" },
    vatIn: { code: "191.04", name: "Sorumlu Sıfatıyla Ödenen KDV" },
    vatOut: { code: "360.01", name: "Ödenecek KDV (sorumlu sıfatıyla)" },
    documentType: "FT",
  },
  sales: {
    cash: { code: "100.01", name: "Kasa" },
    card: { code: "108.01", name: "Kredi Kartı Satışları" },
    revenue: {
      0: { code: "600.00", name: "KDV'siz Satışlar" },
      1: { code: "600.01", name: "%1 KDV'li Satışlar" },
      10: { code: "600.10", name: "%10 KDV'li Satışlar" },
      20: { code: "600.20", name: "%20 KDV'li Satışlar" },
    },
    vat: {
      1: { code: "391.01", name: "%1 Hesaplanan KDV" },
      10: { code: "391.10", name: "%10 Hesaplanan KDV" },
      20: { code: "391.20", name: "%20 Hesaplanan KDV" },
    },
    documentType: "ÖK",
  },
};

// Luca sub-accounts may carry letters (320.M07), so a segment is letters or digits.
export const ACCOUNT_CODE_PATTERN = /^\d{3}(\.[\p{L}\d]{1,12})*$/u;

export type RuleKind = "expense" | "vat" | "payment" | "setting" | "foreign" | "sales";
export const RULE_KINDS = ["expense", "vat", "payment", "setting", "foreign", "sales"] as const;
export type RuleRow = { kind: RuleKind; key: string; label: string; accountCode: string; accountName: string };

const FOREIGN_LABELS: Record<"expense" | "vatIn" | "vatOut", string> = { expense: "Gider", vatIn: "Sorumlu sıfatıyla KDV (borç)", vatOut: "Ödenecek KDV (alacak)" };

export function rulesToRows(rules: Rules): RuleRow[] {
  const label = (key: string) => CATEGORIES.find((c) => c.key === key)?.label ?? key;
  const row = (kind: RuleKind, key: string, l: string, a: Account): RuleRow => ({ kind, key, label: l, accountCode: a.code, accountName: a.name });
  const { foreign, sales } = rules;
  return [
    ...Object.entries(rules.expense).map(([key, a]) => row("expense", key, label(key), a)),
    ...Object.entries(rules.vat).map(([key, a]) => row("vat", key, `%${key} KDV`, a)),
    ...Object.entries(rules.payment).map(([key, a]) => row("payment", key, PAYMENT_LABELS[key as PaymentMethod], a)),
    { kind: "setting", key: "documentType", label: "Varsayılan BT", accountCode: rules.documentType, accountName: "" },
    { kind: "setting", key: "foreignDocumentType", label: "Yurt dışı fatura BT", accountCode: foreign.documentType, accountName: "" },
    { kind: "setting", key: "salesDocumentType", label: "Z raporu BT", accountCode: sales.documentType, accountName: "" },
    ...(["expense", "vatIn", "vatOut"] as const).map((key) => row("foreign", key, FOREIGN_LABELS[key], foreign[key])),
    row("sales", "cash", "Nakit tahsilat", sales.cash),
    row("sales", "card", "Kartlı tahsilat", sales.card),
    ...Object.entries(sales.revenue).map(([rate, a]) => row("sales", `revenue:${rate}`, rate === "0" ? "KDV'siz satışlar" : `%${rate} satışlar`, a)),
    ...Object.entries(sales.vat).map(([rate, a]) => row("sales", `vat:${rate}`, `%${rate} hesaplanan KDV`, a)),
  ];
}

/** Missing rows fall back to defaults, so a partial table still works. */
export function rulesFromRows(rows: readonly RuleRow[]): Rules {
  const rules: Rules = structuredClone(DEFAULT_RULES);
  for (const r of rows) {
    const account = { code: r.accountCode, name: r.accountName };
    if (r.kind === "expense") rules.expense[r.key] = account;
    else if (r.kind === "vat") rules.vat[Number(r.key)] = account;
    else if (r.kind === "payment" && r.key in rules.payment) rules.payment[r.key as PaymentMethod] = account;
    else if (r.kind === "setting" && r.key === "documentType") rules.documentType = r.accountCode;
    else if (r.kind === "setting" && r.key === "foreignDocumentType") rules.foreign.documentType = r.accountCode;
    else if (r.kind === "setting" && r.key === "salesDocumentType") rules.sales.documentType = r.accountCode;
    else if (r.kind === "foreign" && (r.key === "expense" || r.key === "vatIn" || r.key === "vatOut")) rules.foreign[r.key] = account;
    else if (r.kind === "sales" && (r.key === "cash" || r.key === "card")) rules.sales[r.key] = account;
    else if (r.kind === "sales" && /^(revenue|vat):\d{1,2}$/.test(r.key)) {
      const [part, rate] = r.key.split(":");
      rules.sales[part as "revenue" | "vat"][Number(rate)] = account;
    }
  }
  return rules;
}
