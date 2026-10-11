# Developer setup

Build the wallet extension locally and exercise Wallet Standard with `test-web`. End-user steps: [docs/user-guide.md](../docs/user-guide.md). Agent workflow and architecture constraints: [AGENTS.md](../AGENTS.md).

Current version: [`version.md`](../version.md). When implementing a scheduled release, follow that version’s [`INDEX.md`](./roadmap/). Do not start from this file or chat memory alone.

This folder: [README.md](README.md).

---

## Prerequisites

- A recent Node.js and npm (`wallet/` uses Vite 8 and TypeScript 7)
- Google Chrome (Manifest V3)

---

## Build the wallet

```bash
cd wallet
npm install
npm run build
```

Output is `wallet/dist`.

Chrome → **Extensions** → turn on **Developer mode** → **Load unpacked** → choose `wallet/dist`.

```bash
cd wallet
npm run dev
```

Vite + CRXJS rebuilds the extension. Reload the unpacked extension in Chrome after a change.

---

## test-web

```bash
cd test-web
npm install
npm run dev
```

Open the printed local URL. Connect with Airwave and exercise sign / send against the loaded extension.

---

## Typecheck

```bash
cd wallet
npm run typecheck
```

A scheduled version’s INDEX may name extra commands. Follow that INDEX when shipping that version.
