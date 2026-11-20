import { z } from "zod";
import { isValidTaxNumber } from "./checks";
import { ACCOUNT_CODE_PATTERN, DEFAULT_RULES, DEPARTMENT_KEY, departmentLabel, RULE_KINDS, rulesToRows } from "./default-rules";

// Client-writable fields only. status, user_id, model, token counts and timestamps are never accepted.
export const LineInputSchema = z.object({
  accountCode: z.string().trim().refine((c) => c === "" || ACCOUNT_CODE_PATTERN.test(c), "Hesap kodu biçimi hatalı"),
  accountName: z.string().trim().max(120),
  debitKurus: z.number().int().min(0).max(1e12),
  creditKurus: z.number().int().min(0).max(1e12),
  description: z.string().trim().max(200),
  documentNo: z.string().trim().max(40),
  documentDate: z.iso.date().nullable(),
  documentType: z.string().trim().max(10),
  quantity: z.number().int().min(0).max(1_000_000),
  babs: z.boolean(),
});

// The invoice details a checkout needs (iyzico asks for an identity number, a phone and an address too).
export const BillingSchema = z.object({
  name: z.string().trim().min(3, "Ad soyad ya da unvan yazın.").max(200),
  taxNumber: z.string().trim().refine(isValidTaxNumber, "VKN (10 hane) ya da TCKN (11 hane) geçerli değil."),
  taxOffice: z.string().trim().max(80).transform((v) => v || null),
  phone: z.string().trim().refine((v) => /^(\+?90|0)?5\d{9}$/.test(v.replace(/[\s()-]/g, "")), "Cep telefonunu 05xx xxx xx xx biçiminde yazın."),
  address: z.string().trim().min(10, "Fatura adresini yazın.").max(300),
  city: z.string().trim().min(2, "İli yazın.").max(60),
});

export const CheckoutSchema = z.object({ packageId: z.string().max(20), billing: BillingSchema });

// Lines, the vehicle choice made on the review screen, or both.
export const PatchReceiptSchema = z.object({
  lines: z.array(LineInputSchema).min(1).max(100).optional(),
  vehicle: z.enum(["ticari", "binek"]).optional(),
}).refine((b) => b.lines || b.vehicle);

export const ExportSchema = z.object({ receiptIds: z.array(z.uuid()).max(500).optional(), firmId: z.uuid().optional(), month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional() });

const ALLOWED_RULE_KEYS = new Map(
  [...rulesToRows(DEFAULT_RULES), { kind: "vat", key: "8", label: "%8 KDV" }, { kind: "vat", key: "18", label: "%18 KDV" }]
    .map((r) => [`${r.kind}:${r.key}`, r.label]),
);

export const RulesPutSchema = z.object({
  // The firm the page was opened for, not the one the cookie names now (another tab may have switched it).
  firmId: z.uuid().optional(),
  rows: z.array(z.object({
    kind: z.enum(RULE_KINDS),
    key: z.string().max(40),
    // Luca takes codes up to 60 characters (src/lib/api-schemas.ts firm accounts); a rule can use any of them.
    accountCode: z.string().trim().min(1).max(60),
    accountName: z.string().trim().max(120),
  })).max(100),
}).transform(({ firmId, rows }, ctx) => ({ firmId, rows: rows.flatMap((r) => {
  // A Z report department (src/lib/default-rules.ts departmentKey) is a sales rule of its own, named after the department.
  const label = ALLOWED_RULE_KEYS.get(`${r.kind}:${r.key}`) ?? (r.kind === "sales" && DEPARTMENT_KEY.test(r.key) ? departmentLabel(r.key) : undefined);
  const codeOk = r.kind === "setting" ? r.accountCode.length <= 10 : ACCOUNT_CODE_PATTERN.test(r.accountCode);
  if (!label || !codeOk) {
    ctx.addIssue({ code: "custom", message: `Geçersiz kural: ${r.key}` });
    return [];
  }
  return [{ ...r, label }];
}) }));

export const RulesDeleteSchema = z.object({ firmId: z.uuid() });

export const idSchema = z.uuid();

/** The largest Luca chart of accounts taken in one import (big holding plans run to a few thousand sub-accounts). */
export const MAX_PLAN_ACCOUNTS = 20_000;
// What the extension read in Luca for one firm. Names are cut to the lengths the app keeps.
export const LucaFirmSchema = z.object({
  lucaId: z.string().regex(/^\d{1,20}$/),
  name: z.string().trim().min(2).max(400).transform((s) => s.slice(0, 120)),
  taxNumber: z.string().regex(/^\d{10,11}$/).nullable(),
  accounts: z.array(z.object({
    code: z.string().trim().max(60).regex(ACCOUNT_CODE_PATTERN),
    name: z.string().trim().max(400).transform((s) => s.slice(0, 120)),
  })).min(1).max(MAX_PLAN_ACCOUNTS),
});
export const FirmActiveSchema = z.object({ id: z.uuid() });

// One firm's e-Tebligat list from the extension (extension/gib-notices.js). Text comes from GİB through the user's browser: capped, never trusted.
const noticeText = (max: number) => z.string().trim().max(400).transform((s) => s.slice(0, max) || null).nullable();
export const MAX_NOTICES = 2000;
export const NoticesSchema = z.object({
  // The session's VKN and/or TCKN (a sole trader's firm may be kept under either).
  idNumbers: z.array(z.string().regex(/^\d{10,11}$/)).min(1).max(2),
  notices: z.array(z.object({
    gibId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
    institution: z.string().trim().min(1).max(400).transform((s) => s.slice(0, 160)),
    subUnit: noticeText(160),
    docType: noticeText(160),
    docNo: noticeText(80),
    sentAt: noticeText(40),
    servedAt: noticeText(40),
    readOnGib: z.boolean(),
  })).max(MAX_NOTICES),
});
export const NoticesSeenSchema = z.object({ ids: z.array(z.uuid()).min(1).max(500) });
