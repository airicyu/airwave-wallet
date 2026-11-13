import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.config.ts";

const walletDir = path.dirname(fileURLToPath(import.meta.url));

const hasherRsDir = path.resolve(
  walletDir,
  "node_modules/@lightprotocol/hasher.rs",
);
const hasherSlimEntry = path.resolve(
  hasherRsDir,
  "dist/browser-slim/es/index_browser_slim.js",
);
const hasherSimdOnlyEntry = path.resolve(
  walletDir,
  "src/background/privacy/hasher-rs-simd.ts",
);
/** Chrome MV3 targets current Chromium; ship SIMD wasm only (~1.25 MB). */
const hasherWasmName = "hasher_wasm_simd_bg.wasm";

/** Slim Poseidon glue fetches this file next to the hashed assets chunk. */
function copyLightHasherWasm(): Plugin {
  return {
    name: "copy-light-hasher-wasm",
    writeBundle(options) {
      const outDir = options.dir ?? path.resolve(walletDir, "dist");
      const assetsDir = path.join(outDir, "assets");
      fs.mkdirSync(assetsDir, { recursive: true });
      const src = path.join(hasherRsDir, "dist", hasherWasmName);
      if (!fs.existsSync(src)) {
        throw new Error(`copy-light-hasher-wasm: missing ${src}`);
      }
      fs.copyFileSync(src, path.join(assetsDir, hasherWasmName));
    },
  };
}

export default defineConfig({
  resolve: {
    alias: [
      // Keep /slim on the real package; default entry is our SIMD-only wrapper (not browser-fat).
      { find: "@lightprotocol/hasher.rs/slim", replacement: hasherSlimEntry },
      { find: /^@lightprotocol\/hasher\.rs$/, replacement: hasherSimdOnlyEntry },
    ],
  },
  plugins: [
    react(),
    crx({ manifest }),
    copyLightHasherWasm(),
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
