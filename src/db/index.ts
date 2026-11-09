import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let instance: ReturnType<typeof create> | undefined;

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ortam değişkeni eksik.");
  // Supabase's transaction pooler (port 6543) does not keep prepared statements between transactions; a few connections per
  // serverless instance are enough.
  // TLS on every connection; with Supabase's CA (DATABASE_CA_CERT, PEM) the server certificate is verified too.
  const ca = process.env[`DATABASE_${"CA_CERT"}`];
  return drizzle(postgres(url, { prepare: false, max: 5, ssl: ca ? { ca, rejectUnauthorized: true } : "require" }), { schema });
}

// Lazy so `next build` works without secrets in the environment.
export const getDb = () => (instance ??= create());
