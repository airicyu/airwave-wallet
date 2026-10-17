# 0.47.1 — Missing dApp sign chain

- **Status:** `shipped`
- **Parent:** [0.47.0](../0.47.0/INDEX.md). Patch only. No new feature
- **Changelog:** [`changelog.md`](../../../changelog.md) under `0.47.1`

## Product

When a dApp calls Wallet Standard `signTransaction` or `signAndSendTransaction` without `chain`, the service worker treats the request as the cluster selected in settings: `solana:mainnet` or `solana:devnet`. The pending payload stores that id. A chain the dApp did send must still be one of those two ids and must match the selected cluster.

## Decided

| Topic | Decision |
|-------|----------|
| Missing chain | `null`, omitted, or a blank string uses `settings.cluster` via `resolveDappSignChain` |
| Present chain | `solana:devnet` and `solana:mainnet` only. A mismatch is still `CHAIN_MISMATCH`. Anything else is still `INVALID_CHAIN` / `Unsupported chain` |
| Where | Service worker, both `dapp.signTransaction` and `dapp.signAndSendTransaction`. The page inject still forwards `input.chain` as the dApp sent it |
| Stored payload | The pending record's `chain` is the resolved id, including when the dApp omitted it |

## Out of scope

- Changing cluster from the dApp
- `signMessage`
- New screens

## Acceptance

1. Wallet on Devnet. A sign request with no `chain` is enqueued with `chain: "solana:devnet"` and does not return `Unsupported chain`.
2. Wallet on Mainnet. The same omission enqueues `solana:mainnet`.
3. A request that sends `solana:mainnet` while the wallet is on Devnet still returns `CHAIN_MISMATCH`.
4. `signAndSendTransaction` follows the same two rules.

Narrow check from `wallet/`:

```text
npx esbuild src/background/handlers/dapp-sign-chain.test.ts --bundle --platform=node --format=esm --outfile=dapp-sign-chain.test.mjs
node --test dapp-sign-chain.test.mjs
```

Delete `dapp-sign-chain.test.mjs` after the run. Also `npm run typecheck`.
