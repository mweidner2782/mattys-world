import { defineConfig } from "nitro";

export default defineConfig({
  serverDir: "./server",
  modules: ["workflow/nitro"],
  preset: "vercel",
  publicAssets: [
    {
      dir: "./public",
      baseURL: "/"
    }
  ]
});
