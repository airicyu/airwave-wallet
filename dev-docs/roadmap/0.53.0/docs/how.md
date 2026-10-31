# How 0.53.0

INDEX is the contract. This file is the order of work.

## First-install cluster

In `normalizeSettings`, a missing `cluster` or any value other than `devnet` is `mainnet`. `devnet` stays `devnet`. `DEFAULT_SETTINGS` uses `cluster: "mainnet"` and `rpcUrl: ""`. Do not write the public Devnet URL onto a Mainnet default. Do not change the RPC guide or the Mainnet Home block from [0.29.0](../../0.29.0/INDEX.md).

## Track 1 — Strip

In the sign shell used by `signTransaction`, `signAndSendTransaction`, and `walletSend`, when `settings.cluster === "devnet"` and the view is the sign review (not connect, not `signMessage`, not send-status), render:

```html
<div class="cluster-strip" role="status">Devnet</div>
```

Place it under the account row and outside the scrolling body, matching Home in `wallet/src/popup/PopupMarkup.tsx`. When the shell enters `send-status-mode`, hide `.cluster-strip` as well. The existing send-status rules do not hide that class.

Home's rule stays in `wallet/src/popup/styles/base.css`. Copy that same rule into the popout catalog (`wallet/src/popout/styles/chrome.css` or `sign.css`) so the popout, which does not import popup CSS, gets the class. Do not rename it. On the popout `:root` in `wallet/src/popout/styles/base.css`, define the same two variables the popup root already has: `--warn: #e8b84a` and `--warn-bg: #3a2e14`. The side panel already loads popup CSS.

## Track 2 — Probe

Add `ui.probeSignBlockhash`. Payload is `{ requestId }`. Only an extension page may call it. The service worker loads that pending record. If it is missing, or its kind is not one of the three sign-transaction kinds, return the existing `NOT_FOUND` error. The sign shell then shows the same expired screen `ui.simulatePendingTx` already shows for `NOT_FOUND`, and does not show the mismatch card.

If `payload.transaction` (`number[]`) does not decode to a message blockhash, return `{ devnet: "unknown", mainnet: "unknown" }`. Do not read `workingTx`.

Otherwise call `isBlockhashValid` twice, in parallel, commitment `confirmed`, each with an 8 second deadline:

- Devnet: `effectiveRpcUrl("devnet", settings.rpcByCluster.devnet)`.
- Mainnet: `settings.rpcByCluster.mainnet` when `isMainnetRpcReady`. Otherwise the fallback. Debug off, or a blank or illegal `mainnetBlockhashRpcUrl`, uses `https://api.mainnet-beta.solana.com`. Debug on uses a legal stored base. This is the only fetch allowed to that official host.

Parse the JSON-RPC object. `result.value === true` is `valid`. `result.value === false` is `invalid`. A missing `result.value`, a non-boolean, a JSON-RPC `error`, an HTTP failure, or the 8 second timeout is `unknown`. Do not treat the HTTP body as the boolean.

The sign shell calls this once when the sign body is first shown. Keep the result in that mount's memory only. Do not write it to `chrome.storage`, Zustand, or the pending record. Rebuilding the sign body (including Apply CU) paints the card again from that memory and does not send the command again.

Approve stays disabled until the result arrives. Mismatch is one side `valid` and the other `invalid`, with the `valid` side not equal to `settings.cluster`. Then render the card from the catalog keys in the INDEX and leave Approve disabled. While the probe has not returned, and while the result is a mismatch, `applyApproveFromSimulation` and the 700ms post-unlock path must not enable Approve. Reject stays enabled. Any other result clears that gate and then applies the approve rules that already exist. If the 700ms hold has already finished, do not start it again.

The card is the first block inside the sign body, above expected changes. Use warning colors (`--warn`, `--warn-bg`). Do not use the red simulation-failure card.

## Hand sample

test-web's existing sign buttons stay as they are. Add one action that omits `chain` and builds an unsigned transaction whose blockhash is `getLatestBlockhash` from the other cluster: `https://api.mainnet-beta.solana.com` when the wallet is on Devnet, `https://api.devnet.solana.com` when the wallet is on Mainnet. That action does not send the transaction. Use it for the mismatch rows in the INDEX. On Devnet, the three strip checks use the existing sign-transaction, sign-and-send, and in-wallet send paths. On Mainnet, the in-wallet send shows no strip; the two dApp sign screens are opened with this omit-`chain` action, because the existing test-web buttons send `solana:devnet` and [0.47.1](../../0.47.1/INDEX.md) rejects that while the wallet is on Mainnet.

## Settings

Add `mainnetBlockhashRpcUrl: string` to settings. `normalizeSettings` turns a missing value into `""`. Do not bump `schemaGeneration`. Accept a patch only when the string passes the existing vendor-base check (empty allowed). On `DebugSettingsScreen`, under the OpenRouter row, add an `ApiUrlField` labeled `Mainnet blockhash RPC` with the official URL as placeholder. It is visible only while debug is on.

## Copy

Add the three keys from the INDEX Decided table to `wallet/src/shared/i18n/ui-messages.ts`. Do not hard-code those sentences in the shell. The strip's `Devnet` text stays a literal, like Home.
