import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config.ts";

const walletDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    {
      name: "extension-relative-assets",
      transformIndexHtml: {
        order: "post",
        handler(html, ctx) {
          const filename = ctx.filename?.replace(/\\/g, "/") ?? "";
          if (!/\/src\/[^/]+\/[^/]+\.html$/.test(filename)) return html;
          return html
            .replaceAll('="/assets/', '="../../assets/')
            .replaceAll(" crossorigin", "");
        },
      },
    },
  ],
  server: {
    fs: {
      allow: [walletDir, path.resolve(walletDir, "../docs/legal")],
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: "src/popup/index.html",
        sidepanel: "src/sidepanel/index.html",
        popout: "src/popout/index.html",
        offscreen: "src/offscreen/index.html",
        sandbox: "src/sandbox/index.html",
      },
    },
  },
});
