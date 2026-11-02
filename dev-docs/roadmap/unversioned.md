# Unversioned changes

When the latest version is `shipped` and the next version is not opened yet, write **code** changes here and add one sentence under `Next` at the top of the root [`changelog.md`](../../changelog.md). Both places are the same batch.

Docs, privacy policy, and terms are not tracked here.

After the user assigns the batch, move the items into that version's INDEX and changelog heading, and set this file back to none.

## Current

- e2e harness under `test/e2e` (scenarios, mock server, in-repo `fixtures/`, `e2e-validator` / `e2e-preflight` scripts) and `.agents/skills/e2e-wallet`. Runtime mock data is sanitized under `test/e2e/fixtures`. Helius settings accept `http://127.0.0.1` and `http://localhost`. The manual dApp lives at `test/test-web` and reads `rpc` and `otherRpc` query params. Preflight and mock server are Bun TypeScript (`test/e2e/*.ts`) with `test/e2e/package.json` and `tsconfig.json`, not `.mjs`.
