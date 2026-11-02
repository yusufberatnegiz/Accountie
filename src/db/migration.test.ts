import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(process.cwd(), "drizzle");
const NEW_TABLES = ["receipts", "journal_lines", "account_rules", "extension_tokens"];

describe("migration dosyaları", () => {
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
  it("en az bir migration var", () => expect(files.length).toBeGreaterThan(0));
  for (const f of files) {
    const sql = readFileSync(join(dir, f), "utf8");
    it(`${f}: DROP, RENAME ve TRUNCATE içermez`, () => {
      expect(sql).not.toMatch(/\b(DROP|RENAME|TRUNCATE)\b/i);
    });
    it(`${f}: ALTER yalnızca yeni tablolarda`, () => {
      for (const [, table] of sql.matchAll(/ALTER TABLE "([^"]+)"/g)) expect(NEW_TABLES).toContain(table);
    });
  }
});
