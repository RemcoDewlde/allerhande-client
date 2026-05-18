import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      // Resolve .js extensions in TypeScript source imports to their .ts counterparts
      { find: /^(\.{1,2}\/.+)\.js$/, replacement: "$1" },
    ],
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/recipe/types.ts", "src/search/types.ts"],
      reporter: ["text", "lcov", "html"],
      all: true,
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
