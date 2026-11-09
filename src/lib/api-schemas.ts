import { z } from "zod";
import { DEFAULT_RULES, rulesToRows } from "./default-rules";

// Client-writable fields only. status, user_id, model, token counts and timestamps are never accepted.
export const LineInputSchema = z.object({
  accountCode: z.string().trim().regex(/^(\d{3}(\.\d{1,3})*)?$/, "Hesap kodu biçimi hatalı"),
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

export const PatchReceiptSchema = z.object({ lines: z.array(LineInputSchema).min(1).max(100) });

export const ExportSchema = z.object({ receiptIds: z.array(z.uuid()).max(500).optional(), firmId: z.uuid().optional(), month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional() });

const ALLOWED_RULE_KEYS = new Map(
  [...rulesToRows(DEFAULT_RULES), { kind: "vat", key: "8", label: "%8 KDV" }, { kind: "vat", key: "18", label: "%18 KDV" }]
    .map((r) => [`${r.kind}:${r.key}`, r.label]),
);

export const RulesPutSchema = z.object({
  rows: z.array(z.object({
    kind: z.enum(["expense", "vat", "payment", "setting"]),
    key: z.string().max(40),
    accountCode: z.string().trim().min(1).max(20),
    accountName: z.string().trim().max(120),
  })).max(100),
}).transform(({ rows }, ctx) => rows.flatMap((r) => {
  const label = ALLOWED_RULE_KEYS.get(`${r.kind}:${r.key}`);
  const codeOk = r.kind === "setting" ? r.accountCode.length <= 10 : /^\d{3}(\.\d{1,3})*$/.test(r.accountCode);
  if (!label || !codeOk) {
    ctx.addIssue({ code: "custom", message: `Geçersiz kural: ${r.key}` });
    return [];
  }
  return [{ ...r, label }];
}));

export const idSchema = z.uuid();

// A mükellef: its name as the user keeps it, and its VKN/TCKN when given (checked like a receipt's).
export const FirmCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  taxNumber: z.string().trim().regex(/^\d{10,11}$/).optional(),
});
export const FirmActiveSchema = z.object({ id: z.uuid() });
