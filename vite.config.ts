import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: {
    format: "es",
    rollupOptions: {
      output: {
        // A STABLE, unhashed name on purpose. The lab worker is the only file
        // allowed 'unsafe-eval' (it runs reader-written code through
        // `new Function`), and CloudFront grants that via a path-matched
        // response-headers policy — which needs a path it can match.
        // Cache-busting is handled by invalidating this exact path on deploy.
        entryFileNames: "assets/lab-worker.js",
        chunkFileNames: "assets/lab-worker-[hash].js",
      },
    },
  },
  server: {
    // Honour an externally assigned port so the preview harness can place
    // the dev server wherever it likes.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
});
