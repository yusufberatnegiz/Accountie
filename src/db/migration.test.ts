import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(process.cwd(), "drizzle");
// The one drop allowed, after the user chose to remove e-Fatura/e-Arşiv: the table of sealed GİB logins, and nothing else.
const ALLOWED_DROPS: Record<string, RegExp> = {
  "20261111181256_drop_gib_credentials.sql": /^DROP POLICY "gib_credentials_owner" ON "gib_credentials";--> statement-breakpoint\s*DROP TABLE "gib_credentials";\s*$/,
};
const NEW_TABLES = ["firms", "vendor_rules", "gib_credentials", "receipts", "journal_lines", "account_rules", "extension_tokens", "rate_limit_hits", "firm_accounts", "firm_rules"];

describe("migration dosyaları", () => {
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
  it("en az bir migration var", () => expect(files.length).toBeGreaterThan(0));
  for (const f of files) {
    const sql = readFileSync(join(dir, f), "utf8");
    it(`${f}: DROP, RENAME ve TRUNCATE içermez (izinli tek silme dışında)`, () => {
      if (ALLOWED_DROPS[f]) expect(sql).toMatch(ALLOWED_DROPS[f]);
      else expect(sql).not.toMatch(/\b(DROP|RENAME|TRUNCATE)\b/i);
    });
    it(`${f}: her yeni tabloda RLS açık ve en az bir politika var`, () => {
      for (const [, table] of sql.matchAll(/CREATE TABLE "([^"]+)"/g)) {
        expect(sql).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
        expect(sql).toMatch(new RegExp(`CREATE POLICY "[^"]+" ON "${table}"`));
      }
    });
    it(`${f}: ALTER yalnızca yeni tablolarda`, () => {
      for (const [, table] of sql.matchAll(/ALTER TABLE "([^"]+)"/g)) expect(NEW_TABLES).toContain(table);
    });
  }
});
