import { defineConfig } from "nitro";

export default defineConfig({
  compatibilityDate: "2026-07-10",
  serverDir: "./server",
  modules: ["workflow/nitro"],
  publicAssets: [{ dir: "./public", baseURL: "/" }],
  routeRules: {
    "/woodstock/sw.js": {
      headers: {
        "cache-control": "no-cache, no-store, must-revalidate",
        "service-worker-allowed": "/woodstock/"
      }
    },
    "/woodstock/manifest.webmanifest": {
      headers: { "content-type": "application/manifest+json" }
    }
  }
});
