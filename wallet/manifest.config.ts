import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Airwave Wallet",
  version: "0.37.0",
  description: "Non-custodial Solana wallet. Keys stay on this device.",
  action: {
    default_popup: "src/popup/index.html",
    default_title: "Airwave",
    default_icon: {
      "16": "public/icon16.png",
      "32": "public/icon32.png",
      "48": "public/icon48.png",
      "128": "public/icon128.png",
    },
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  permissions: ["storage", "tabs", "sidePanel", "offscreen"],
  sandbox: {
    pages: ["src/sandbox/index.html"],
  },
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    sandbox: "sandbox allow-scripts; script-src 'self'; object-src 'none'; connect-src 'none'",
  },
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  host_permissions: ["<all_urls>"],
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/content-script.ts"],
      run_at: "document_start",
    },
  ],
  web_accessible_resources: [
    {
      resources: ["src/inject/inject.ts"],
      matches: ["<all_urls>"],
    },
  ],
  icons: {
    "16": "public/icon16.png",
    "48": "public/icon48.png",
    "128": "public/icon128.png",
  },
});
