import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Airwave Wallet",
  version: "0.15.0",
  description: "Airwave Solana wallet (dev preview)",
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
  permissions: ["storage", "tabs"],
  host_permissions: ["<all_urls>"],
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      run_at: "document_start",
    },
  ],
  web_accessible_resources: [
    {
      resources: ["src/inject/index.ts"],
      matches: ["<all_urls>"],
    },
  ],
  icons: {
    "16": "public/icon16.png",
    "48": "public/icon48.png",
    "128": "public/icon128.png",
  },
});
