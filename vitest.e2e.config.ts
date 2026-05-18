import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [{ find: /^(\.{1,2}\/.+)\.js$/, replacement: "$1" }],
  },
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 15_000,
    // Sequential — avoid hammering the API with parallel requests
    fileParallelism: false,
  },
});
