import { defineConfig } from "vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  publicDir: false,
  plugins: [nitro()],
  build: {
    rollupOptions: {
      input: "client-entry.js"
    }
  }
});
