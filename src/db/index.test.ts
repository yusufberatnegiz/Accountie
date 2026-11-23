import postgres from "postgres";
import { afterEach, expect, it, vi } from "vitest";
import { getDb } from "./index";

vi.mock("postgres", () => ({ default: vi.fn() }));
vi.mock("drizzle-orm/postgres-js", () => ({ drizzle: vi.fn() }));

afterEach(() => vi.unstubAllEnvs());

it("Supavisor işlem havuzlayıcısında her bağlantıya aynı anda bir sorgu gönderir", () => {
  const url = "postgresql://test:test@pooler.example.test:6543/postgres";
  vi.stubEnv("DATABASE_URL", url);
  vi.stubEnv("DATABASE_CA_CERT", "");

  getDb();

  expect(postgres).toHaveBeenCalledWith(url, expect.objectContaining({
    max: 5,
    max_pipeline: 1,
    prepare: false,
    ssl: "require",
  }));
});
