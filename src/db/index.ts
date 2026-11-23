import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let instance: ReturnType<typeof create> | undefined;

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ortam değişkeni eksik.");
  // Supavisor transaction mode does not keep prepared statements between transactions. Older releases can also drop replies
  // when requests are pipelined on one connection. The five connections can still run queries concurrently.
  // TLS on every connection; with Supabase's CA (DATABASE_CA_CERT, PEM) the server certificate is verified too.
  const ca = process.env[`DATABASE_${"CA_CERT"}`];
  return drizzle(postgres(url, { prepare: false, max: 5, max_pipeline: 1, ssl: ca ? { ca, rejectUnauthorized: true } : "require" }), { schema });
}

// Lazy so `next build` works without secrets in the environment.
export const getDb = () => (instance ??= create());
