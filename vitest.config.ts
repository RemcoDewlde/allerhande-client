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
  },
});
