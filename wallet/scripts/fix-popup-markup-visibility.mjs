import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(dir, "../src/popup/PopupMarkup.tsx");
let s = fs.readFileSync(file, "utf8");

const viewByScreenId = {
  "screen-home-token": "home-token",
  "screen-home-activity": "home-activity",
  "screen-send-approval": "send-approval",
  "screen-accounts": "accounts",
  "screen-add-account": "add-account",
  "screen-add-import": "add-import",
  "screen-add-import-secret": "add-import-secret",
  "screen-add-import-seed": "add-import-seed",
  "screen-add-generate-seed": "add-generate-seed",
  "screen-add-generate": "add-generate",
  "screen-add-watch": "add-watch",
  "screen-add-combined": "add-combined",
  "screen-account-rename": "account-rename",
  "screen-account-manage": "account-manage",
  "screen-account-reveal-key": "account-reveal-key",
  "screen-settings": "settings",
  "screen-settings-network": "settings-network",
  "screen-settings-rpc": "settings-rpc",
  "screen-settings-keys": "settings-keys",
  "screen-settings-cu-price": "settings-cu-price",
  "screen-settings-password": "settings-password",
  "screen-about": "about",
  "screen-about-disclaimer": "about-disclaimer",
  "screen-about-terms": "about-terms",
  "screen-connected-sites": "connected-sites",
  "screen-token-detail": "token-detail",
  "screen-token-send": "token-send",
};

if (!s.includes("type PopupMarkupProps")) {
  s = s.replace(
    `import type { JSX } from "react";

export function PopupMarkup(): JSX.Element {`,
    `import type { JSX } from "react";
import { isHomeView } from "./lib/format";
import type { State, View } from "./types";

export type PopupMarkupProps = {
  wallet: State | null;
  currentView: View;
};

export function PopupMarkup({ wallet, currentView }: PopupMarkupProps): JSX.Element {
  const vaultExists = wallet?.vaultExists ?? false;
  const unlocked = wallet?.unlocked ?? false;
  const isLocked = vaultExists && !unlocked;
  const showShell = vaultExists && unlocked;
  const home = isHomeView(currentView);
`,
  );
}

s = s.replace(
  `<section id="setup" className="flow-screen" hidden={true}>`,
  `<section id="setup" className="flow-screen" hidden={wallet == null || vaultExists}>`,
);
s = s.replace(
  `<section id="locked" className="unlock-screen" hidden={true}>`,
  `<section id="locked" className="unlock-screen" hidden={wallet == null || !isLocked}>`,
);
s = s.replace(
  `<div id="shell" className="shell" hidden={true}>`,
  `<div id="shell" className="shell" hidden={wallet == null || !showShell}>`,
);

for (const [screenId, view] of Object.entries(viewByScreenId)) {
  const re = new RegExp(
    `<section id="${screenId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" className="([^"]*)" hidden=\\{true\\}>`,
    "g",
  );
  s = s.replace(re, `<section id="${screenId}" className="$1" hidden={currentView !== "${view}"}>`);
}

s = s.replace(
  `<div className="bar-home" id="bar-home">`,
  `<div className="bar-home" id="bar-home" hidden={!home}>`,
);
s = s.replace(
  `<div className="bar-subpage" id="bar-subpage" hidden={true}>`,
  `<div className="bar-subpage" id="bar-subpage" hidden={home}>`,
);
s = s.replace(
  `<footer id="shell-dock" className="shell-dock" hidden={true}>`,
  `<footer id="shell-dock" className="shell-dock" hidden={true}>`,
);
s = s.replace(
  `<nav id="home-tab-bar" className="tab-bar" hidden={true}>`,
  `<nav id="home-tab-bar" className="tab-bar" hidden={!home}>`,
);

fs.writeFileSync(file, s);
console.log("updated PopupMarkup visibility");
