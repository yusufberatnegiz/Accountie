import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { normalizeImage } from "../image";
import { extractReceipt } from "./extract";

// Real API call, skipped unless asked for: SMOKE_RECEIPT=fis.jpg ANTHROPIC_API_KEY=... npx vitest run src/lib/extract/smoke.test.ts
const photo = process.env.SMOKE_RECEIPT;

describe.skipIf(!photo)("gerçek API ile fiş okuma (smoke)", () => {
  it("örnek fişi okur", async () => {
    const result = await extractReceipt(await normalizeImage(await readFile(photo!)));
    // Prints only the parsed fields and token use, never the key.
    console.log(JSON.stringify(result, null, 2));
    expect(result.ok).toBe(true);
  }, 120_000);
});
