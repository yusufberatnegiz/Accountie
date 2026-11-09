import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Tests run outside React's server environment, where "server-only" would throw on import.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)), "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
