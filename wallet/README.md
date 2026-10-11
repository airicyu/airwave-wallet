# Airwave Wallet (Chrome extension)

Full local steps: [`dev-docs/setup.md`](../dev-docs/setup.md).

## Build

```bash
npm install
npm run build
```

Chrome → Extensions → Developer mode → **Load unpacked** → select `dist/` in this directory.

## Develop

```bash
npm run dev
```

Vite + CRXJS. When implementing a scheduled version, follow that version’s `dev-docs/roadmap/X.Y.Z/INDEX.md`.
