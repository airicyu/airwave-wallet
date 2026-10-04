import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config";

const walletDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [crx({ manifest })],
  server: {
    fs: {
      allow: [walletDir, path.resolve(walletDir, "../docs/legal")],
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: "src/popup/index.html",
        popout: "src/popout/index.html",
      },
    },
  },
});
