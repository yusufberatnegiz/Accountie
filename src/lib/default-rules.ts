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

export type Rules = {
  expense: Record<string, Account>;
  vat: Record<number, Account>;
  payment: Record<PaymentMethod, Account>;
  documentType: string;
};

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
};

// Luca sub-accounts may carry letters (320.M07), so a segment is letters or digits.
export const ACCOUNT_CODE_PATTERN = /^\d{3}(\.[\p{L}\d]{1,12})*$/u;

export type RuleKind = "expense" | "vat" | "payment" | "setting";
export type RuleRow = { kind: RuleKind; key: string; label: string; accountCode: string; accountName: string };

export function rulesToRows(rules: Rules): RuleRow[] {
  const label = (key: string) => CATEGORIES.find((c) => c.key === key)?.label ?? key;
  return [
    ...Object.entries(rules.expense).map(([key, a]) => ({ kind: "expense" as const, key, label: label(key), accountCode: a.code, accountName: a.name })),
    ...Object.entries(rules.vat).map(([key, a]) => ({ kind: "vat" as const, key, label: `%${key} KDV`, accountCode: a.code, accountName: a.name })),
    ...Object.entries(rules.payment).map(([key, a]) => ({ kind: "payment" as const, key, label: PAYMENT_LABELS[key as PaymentMethod], accountCode: a.code, accountName: a.name })),
    { kind: "setting", key: "documentType", label: "Varsayılan BT", accountCode: rules.documentType, accountName: "" },
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
  }
  return rules;
}
