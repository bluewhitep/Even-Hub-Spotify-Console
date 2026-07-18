import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appJson = JSON.parse(readFileSync(resolve(__dirname, "..", "app.json"), "utf8"));
const appVersion = String(appJson.version || "0.0.0");
const buildVersion = process.env.VITE_BUILD_VERSION || new Date().toISOString();

export default defineConfig(({ command }) => ({
  // evenhub pack resolves local files from dist; use relative asset URLs.
  base: "./",
  // Release builds must not embed values from ignored local environment files.
  envDir: command === "build" ? false : undefined,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    // Tailscale Serve proxies optional phone-side development to this loopback listener.
    // Vite blocks unknown Host headers by default.
    allowedHosts: [".ts.net"],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        callback: resolve(__dirname, "callback.html"),
      },
    },
  },
}));
