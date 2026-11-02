import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let instance: ReturnType<typeof create> | undefined;

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ortam değişkeni eksik.");
  return drizzle(neon(url), { schema });
}

// Lazy so `next build` works without secrets in the environment.
export const getDb = () => (instance ??= create());
