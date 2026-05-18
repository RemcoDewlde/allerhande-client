import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Rewrites /api/ah/* → https://api.ah.nl/* to work around browser CORS.
      // The client.ts module injects a fetch that rewrites URLs to this path.
      "/api/ah": {
        target: "https://api.ah.nl",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ah/, ""),
      },
    },
  },
});
