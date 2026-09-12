import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Overridden to "/pulse-gaia/" when built for GitHub Pages (see
// .github/workflows/pages.yml) — the Docker/Railway single-origin deploy
// (server.ts serving this at the root) keeps the default "/".
const basePath = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png"],
      manifest: {
        name: "PULSE Agent Surface",
        short_name: "PULSE",
        description: "The context layer for proactive AI — Agent Surface",
        start_url: basePath,
        scope: basePath,
        display: "standalone",
        background_color: "#0b0c10",
        theme_color: "#0b0c10",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // doc §17: the surface should still show last-known state across a
        // device switch even on a flaky connection — cache the core's
        // read endpoints, never POST /events/*.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === "/health" || url.pathname === "/work-graph",
            handler: "NetworkFirst",
            options: { cacheName: "pulse-core-reads", networkTimeoutSeconds: 3 },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
