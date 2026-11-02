import { defineConfig } from "drizzle-kit";

// `npm run db:generate` only writes SQL files; it needs no database connection.
// Applying migrations to the live database is a separate step that needs explicit approval.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // Timestamp names avoid clashing with the old app's 0000_/0001_ migrations already applied to the live DB.
  migrations: { prefix: "timestamp" },
  strict: true,
  verbose: true,
});
