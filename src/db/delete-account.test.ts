import { getTableColumns, getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { expect, it } from "vitest";
import { USER_TABLES } from "./queries";
import * as schema from "./schema";

it("hesap silme, user_id sütunu olan her tabloyu kapsar (yeni tablo eklenince unutulmaz)", () => {
  const withUser = Object.values(schema).filter((t) => is(t, PgTable) && "userId" in getTableColumns(t)).map((t) => getTableName(t as PgTable)).sort();
  expect(USER_TABLES.map((t) => getTableName(t)).sort()).toEqual(withUser);
  // Children before parents: rows that point at a firm or a receipt go first.
  const order = USER_TABLES.map((t) => getTableName(t));
  expect(order.indexOf("journal_lines")).toBeLessThan(order.indexOf("receipts"));
  expect(order.at(-1)).toBe("firms");
});
