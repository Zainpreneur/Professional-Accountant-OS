import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./test/setup.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Ledger tests share one Postgres connection and rely on per-test unique
    // client names for isolation, not parallel workers.
    fileParallelism: false,
  },
});
