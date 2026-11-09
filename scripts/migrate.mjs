// Applies drizzle/*.sql to DATABASE_URL in order (drizzle's own journal table) and lists the tables with their RLS state.
// Prints no secrets: a connection string in an error message is masked. Run: npm run db:migrate
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "");
if (!url) {
  console.log("HATA: DATABASE_URL yok. .env.local dosyasında tanımlı olmalı.");
  process.exit(1);
}
const sql = postgres(url, { prepare: false, max: 1, ssl: "require", onnotice: () => {} });
try {
  await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
  const t = await sql`select tablename, rowsecurity from pg_tables where schemaname = 'public' order by 1`;
  console.log("TAMAM. TABLOLAR:", t.map((r) => `${r.tablename}${r.rowsecurity ? " (RLS)" : " (RLS YOK!)"}`).join(", "));
} catch (e) {
  console.log("HATA:", e.code || "", String(e.message).replace(/postgres(ql)?:\/\/\S+/g, "postgres://***"));
  process.exitCode = 1;
} finally {
  await sql.end();
}
