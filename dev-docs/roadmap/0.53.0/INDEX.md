# 0.53.0 — Sign-screen Devnet strip and blockhash cluster check

- **Status:** `shipped`
- **Upstream:** [0.52.0](../0.52.0/INDEX.md) shipped. [0.47.1](../0.47.1/INDEX.md) still resolves a missing `chain`. [0.29.0](../0.29.0/INDEX.md) still refuses the official Mainnet node for simulate, balances, and send. This version allows that node for one `isBlockhashValid` probe, and only then.
- **Changelog:** one paragraph under `0.53.0` (2026-10-31). The cleanup that was in [`unversioned.md`](../unversioned.md) is included.
- **Layout:** [`dev-docs/design-demos/unversioned/sign-cluster-mismatch-ux.html`](../../design-demos/unversioned/sign-cluster-mismatch-ux.html). Informal. This INDEX wins.

## Product

On a transaction approval, a wallet that is on Devnet shows the same thin Devnet strip as Home. Opening that approval asks Devnet and Mainnet whether the transaction blockhash is still recent. If only the other network says it is, the approval shows a network-mismatch card and the Approve button stays disabled.

## Docs

1. This file
2. [docs/reasoning.md](./docs/reasoning.md)
3. [docs/how.md](./docs/how.md)

## Decided

| Topic | Decision |
|-------|----------|
| Which screens | The shared sign-transaction approval: `signTransaction`, `signAndSendTransaction`, and `walletSend`. Not connect, not `signMessage`, not the send-status card. Popup, side panel, and popout use the same strip and the same card. |
| Devnet strip | When `settings.cluster` is `devnet`, paint `cluster-strip` with the literal text `Devnet`, the same word Home already shows. It sits under the account row and does not scroll away. Mainnet paints no strip. |
| When to probe | Once, when that approval first shows the sign body. Not on the 3-second resimulate, and not again after Apply CU. |
| Bytes | The unsigned transaction already on the pending record. Do not read `workingTx`. A message that cannot be decoded does not probe. |
| Question | JSON-RPC `isBlockhashValid` on each side, commitment `confirmed`. Do not compare the hash to `getLatestBlockhash`. Read the boolean at `result.value`. `true` is `valid`, `false` is `invalid`. A missing `result.value`, a non-boolean, a JSON-RPC `error`, an HTTP failure, or a timeout is `unknown`. The HTTP body itself is not that boolean. |
| Devnet URL | The Devnet RPC the wallet already uses (`effectiveRpcUrl` for devnet, including the official Devnet node). |
| Mainnet URL | If `isMainnetRpcReady` is true, that custom Mainnet RPC. If it is not, the fallback below. A configured Mainnet RPC is never replaced by the fallback. |
| Fallback | `https://api.mainnet-beta.solana.com`. Debug off ignores any stored override. Debug on uses `mainnetBlockhashRpcUrl` when that string passes the same http(s) base check as a Jupiter base; empty or illegal still uses the official URL. |
| 0.29 exception | The service worker may `fetch` the official Mainnet URL only for this probe. Simulate, balances, activity, and send still must not. |
| Timeout | Each side waits at most 8 seconds. A timeout, HTTP failure, or unreadable answer is `unknown`, not `invalid`. |
| Mismatch | One side is `valid` and the other is `invalid`, and the `valid` side is not `settings.cluster`. Then show the mismatch card and keep Approve disabled. Reject stays enabled. A side that is `unknown` is never a mismatch. |
| Not a mismatch | Both `valid`, both `invalid`, or either side `unknown`. No mismatch card. Approve then follows the rules already shipped (including approve before a successful simulation, and approve disabled when the transaction is unparseable). |
| While the probe runs | Approve stays disabled. After a non-mismatch result, the existing approve rules apply, including the 700ms hold after unlock. |
| Card | First block in the sign body, above expected changes. It does not replace the simulation notice. Gold warning, not the red failure card. |
| Card copy | Catalog keys, not hard-coded in the shell. Title `sign.clusterMismatch.title`: zh-Hant「網路不符」, zh-Hans「网络不符」, en「Network mismatch」. Body when the wallet is on Devnet, `sign.clusterMismatch.devnetWallet`: 「錢包目前是 Devnet，這筆交易的 blockhash 在 Mainnet 仍有效。」/「钱包目前是 Devnet，这笔交易的 blockhash 在 Mainnet 仍有效。」/「This wallet is on Devnet. This transaction's blockhash is still valid on Mainnet.」Body when the wallet is on Mainnet, `sign.clusterMismatch.mainnetWallet`: 「錢包目前是 Mainnet，這筆交易的 blockhash 在 Devnet 仍有效。」/「钱包目前是 Mainnet，这笔交易的 blockhash 在 Devnet 仍有效。」/「This wallet is on Mainnet. This transaction's blockhash is still valid on Devnet.」 |
| Command | `ui.probeSignBlockhash` with the pending `requestId`. The service worker reads `payload.transaction` and returns `{ devnet, mainnet }`, each `valid`, `invalid`, or `unknown`. The UI paints from that. A missing pending record, or a kind that is not one of the three, returns the existing `NOT_FOUND` error. The sign shell then shows the same expired screen simulation already uses, and does not show the mismatch card. No new Wallet Standard method. |
| Result memory | The probe result lives only in that sign-shell mount. It is not written to `chrome.storage`, not stored in Zustand, and not written onto the pending record. When the sign body is rebuilt, paint the card again from that memory. Do not send the command again. |
| Settings field | `mainnetBlockhashRpcUrl` on the existing settings object. Missing or blank normalizes to `""`. No `schemaGeneration` bump. Debug settings shows one more URL row, label `Mainnet blockhash RPC`, placeholder the official Mainnet URL, only while debug is on. Same confirm and discard row as the Jupiter URL. |
| Chain string | Unchanged. [0.47.1](../0.47.1/INDEX.md) still applies. This probe does not read `chain`. |
| First-install cluster | A settings record with no `cluster`, or a value other than `devnet`, normalizes to `mainnet`. `rpcUrl` for that record is `""` until a custom Mainnet RPC is ready. A stored `cluster` of `devnet` stays `devnet`. This replaces the [0.1.0](../0.1.0/INDEX.md) default of devnet for new installs only. The first-run RPC guide and the blocked Mainnet Home are unchanged. |
| RPC confirm | On the RPC screen, a successful tick or Enter on a new or edited URL closes the editor. The saved URL stays in the list. A failed save leaves the editor open. |
| Folded cleanup | The batch that had been unversioned ships in this version. Behavior and class names are unchanged. Unused re-exports are gone: `ApprovalFeeDetails`, the popup send `approval-host` barrel, the unused close-empty loader and view type, and the popup `home/` barrel. Popup token helpers import `shared/home`. Jupiter mint fetch and the home-token service wait with `sleepAbort`. Combined create and manage share one member-sheet drag; create still writes the draft, and manage still calls `wallet.reorderCombinedSubs`. `popup/styles/settings.css` is split into screen sheets imported in the same order from `popup/style.css`. Connect-consent rules live in `approval/connect-consent.css`, imported by the popup and popout catalogs. |

## Out of scope

- Treating both-invalid as expired, or blocking approve for that result
- Detecting a durable nonce, or reading a nonce account
- Re-checking after the first probe
- Using this fallback for any RPC other than `isBlockhashValid`
- Changing connect, `signMessage`, or the `chain` mismatch errors
- A Mainnet strip

## Tracks

### Track 1 — Devnet strip

- **Does:** paint the strip on the three sign-transaction approvals; add the same `cluster-strip` rule to the popout catalog
- **Does not:** the probe, the card, or the debug field
- **Acceptance:** strip rows below

### Track 2 — Probe, card, debug URL

- **Does:** the command, the one-shot probe, the card, Approve gating, the debug URL row, and the test-web other-cluster blockhash action
- **Does not:** Track 1's strip, and the out-of-scope list
- **Acceptance:** probe rows below; `cd wallet && npm run typecheck`

## Acceptance

- [x] Wallet on Devnet: `signTransaction`, `signAndSendTransaction`, and an in-wallet send each show the Devnet strip under the account row. Wallet on Mainnet: those screens show no strip
- [x] The strip does not show on connect, `signMessage`, or the send-status card
- [x] Hand sample: test-web omits `chain`, and the unsigned transaction's blockhash comes from `getLatestBlockhash` on the other cluster (`https://api.mainnet-beta.solana.com` when the wallet is on Devnet, `https://api.devnet.solana.com` when the wallet is on Mainnet). The page does not broadcast that transaction. A Devnet wallet then shows the Devnet sentence; Reject works; Approve stays disabled, including after simulation returns and after Apply CU rebuilds the body
- [x] The same sample with the wallet on Mainnet: no strip, the Mainnet sentence, Approve stays disabled
- [x] A blockhash that is `valid` on the wallet's cluster and `invalid` on the other: no card, Approve follows today's simulation rules
- [x] Both sides `invalid`, or either side `unknown`: no card, Approve follows today's simulation rules. `unknown` includes a timeout, an HTTP failure, and a body with no boolean `result.value`
- [x] The probe runs once per approval. Apply CU and the 3-second refresh do not send it again
- [x] With no custom Mainnet RPC and debug off, the Mainnet half of the probe uses `https://api.mainnet-beta.solana.com`. A simulated transfer still does not
- [x] Debug on shows `Mainnet blockhash RPC`. An empty value still uses the official URL. Debug off ignores a saved value. A ready custom Mainnet RPC is still the URL the probe uses
- [x] A fresh settings record (no stored `cluster`) opens on Mainnet. An already stored `devnet` stays Devnet
- [x] RPC screen: after a successful tick, the URL editor closes and the saved row remains. A failed save keeps the editor open
- [x] `cd wallet && npm run typecheck`

## Anchors

| Path | Role |
|------|------|
| `wallet/src/popup/PopupMarkup.tsx` | Home strip to match |
| `wallet/src/popup/styles/base.css` | Existing `.cluster-strip` |
| `wallet/src/approval/components/ApprovalSign.tsx` | Sign shell |
| `wallet/src/approval/shell/flow.ts` | When the sign body opens |
| `wallet/src/background/handlers/dapp-sign-chain.ts` | Unchanged chain check |
| `wallet/src/shared/protocol/storage-keys.ts` | New settings field |
| `wallet/src/popup/settings/DebugSettingsScreen.tsx` | Debug URL row |
| `wallet/src/background/handlers/probe-sign-blockhash.ts` | `ui.probeSignBlockhash` |
| `wallet/src/approval/shell/blockhash-probe.ts` | Sign-shell probe memory and mismatch card |

## Still to decide

(none)
