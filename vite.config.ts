import { defineConfig } from "vite";
import { portfolioUpdate } from "./portfolio-update/plugin";

// FineTune — local development server.
// `npm run dev` (or start.bat on Windows) starts it and opens the browser.
// BASE_PATH lets the same build run at a sub-path (GitHub Pages: "/finetune/").
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  // Portfolio Update (dev only): content editor API at /__portfolio — see portfolio-update/plugin.ts
  plugins: [portfolioUpdate()],
  server: {
    port: 5173,
    strictPort: false,
    open: true,
  },
  preview: {
    port: 4173,
  },
  build: {
    target: "es2020",
    assetsInlineLimit: 0,
  },
});
