# 0.54.0 — Solana v1 transactions

- **Status:** `in progress`
- **Upstream:** [0.53.0](../0.53.0/INDEX.md) shipped. Idea text: [backlog/v1-transaction.md](../backlog/v1-transaction.md). This INDEX wins. Format notes: [solana-tx-versions.md](../../research/solana-tx-versions.md).
- **Changelog:** one paragraph under `0.54.0`. The test-web v1 button and the e2e harness that were unversioned are included. They ship with this version.

## Product

The wallet signs, simulates, and sends v1 transactions, and builds its own send and close-empty transactions as v1. Settings gains a default priority fee in lamports. The approval fee card for a v1 message shows CU limit and that priority fee, not CU price.

## Docs

1. This file
2. [docs/reasoning.md](./docs/reasoning.md)
3. [docs/how.md](./docs/how.md)

## Decided

| Topic | Decision |
|-------|----------|
| Versions | Legacy and v0 keep today's behavior, including the default CU price in micro-lamports per CU. v1 is an additional path. |
| Advertisement | `signTransaction` and `signAndSendTransaction` in `wallet/src/inject/wallet.ts` include `1` in `supportedTransactionVersions`. The list is not a gate. Bytes still arrive when a dapp ignores it. |
| Kit | Stay on `@solana/kit` 8.4.0. It already decodes and partial-signs v1. Do not add a second signer. |
| Accounts | v1 addresses are the inline list and the same 3-byte header. Do not fetch address lookup tables for version 1. v0 lookup expansion is unchanged. |
| Risk flags | `local-flags.ts` reads those inline addresses. Signer and writable flags follow the header. A v1 message is not an empty account list. |
| Priority fee setting | New settings field `defaultPriorityFeeLamports`, a decimal string of lamports. Missing or blank normalizes to `"5000"`. The field accepts `0` through `1000000000` inclusive. A non-integer or out-of-range edit is rejected and the stored value stays. No `schemaGeneration` bump. Code that uses the fee parses the string with `BigInt`. It does not keep the fee as a JavaScript `number`. |
| Where it shows | Settings hub, directly under Default CU price. Catalog key `settings.hub.priorityFee`: zh-Hant「預設優先費」, zh-Hans「预设优先费」, en「Default priority fee」. The existing CU price row is unchanged. |
| Who gets the default | An unsigned v1 whose config omits the priority-fee field. A field that is present, including an explicit 0, stays. A v1 with any non-zero signature is not rewritten. Every v1 transaction this wallet builds writes the setting into the config before the user sees the approval. |
| Dapp resource limits | This wallet does not fill CU limit or loaded-accounts data size on a dapp v1. It does not add a setting or an editor for loaded-accounts data size. `ComputeBudget` instructions are not appended to a v1 message. |
| Cannot run | When a dapp v1 omits CU limit or loaded-accounts data size, simulate it as written. The existing simulation failure notice is enough. Do not add a second card. Approve stays available, same as today's failed simulation. |
| Fee card | For a v1 message the two inputs are CU limit and priority fee in lamports. There is no CU price input. The priority-fee input label reuses `approval.priorityFee`. Both inputs stay editable while every signature slot is empty, and `disabled` when any signature is non-zero, same as today's `cuEditable` flag. Apply writes the config. It does not insert `ComputeBudget` instructions. |
| Legacy fee card | Legacy and v0 still show CU limit and CU price. Their default price patch is unchanged. |
| Wallet-built | Token send (`wallet/src/background/send/wallet-begin-send.ts`) and close-empty (`wallet/src/background/close-empty/build-close-txs.ts`) use `createTransactionMessage({ version: 1 })`. Compile a provisional packet with CU limit `1400000` and loaded-accounts data size `67108864`, simulate that packet once, then compile the message the user approves. CU limit is `computeCloseEmptyUnitLimit(unitsConsumed)`. Loaded-accounts data size is the smallest positive multiple of `32768` that is greater than or equal to the measured size, so a measured `0` becomes `32768`. Write `defaultPriorityFeeLamports` into the config. Do not insert `ComputeBudget` instructions. If that simulation fails, do not open the approval and do not send. The in-wallet send reserve (`TokenSendForm.tsx`, `send-logic.ts`, `wallet-begin-send.ts`) and the close-empty fee total (`plan-close-empty.ts`, `commit-close-empty.ts`, `build-close-txs.ts`) use `BigInt` of the stored `defaultPriorityFeeLamports` as the priority term. They do not use `defaultCuPrice` for that term. The signature fee stays 5000 lamports per signer. `HomeTokenList.tsx` keeps `defaultCuPrice` only as a reload dependency. |
| Close-empty packing | Pack against 4096 bytes and stop at 64 addresses. `CLOSE_EMPTY_MAX_TX_BYTES` (1232) does not apply to these v1 transactions. |
| Read path | `getTransaction` in `wallet/src/background/tx-ai/host-tools.ts` uses `maxSupportedTransactionVersion: 1`. Any other wallet `getTransaction` or `getBlock` that passes a max version also uses `1`. |
| Folded work | The e2e harness already in the tree ships with this version: `test/e2e` fixtures, the Bun preflight and mock, the e2e-wallet skill, and `test/test-web`. Helius settings accept a localhost HTTP origin. This version adds `test/e2e/scenarios/07-v1-sign.md` for the v1 fee card, reject paths, and wallet send. |
| test-web | The existing `sign-tx-v1` button stays. It builds a v1 self-transfer that already has a priority fee. This version also adds `sign-tx-v1-no-fee`, `sign-tx-v1-zero-fee`, `sign-tx-v1-no-cu`, `sign-tx-v1-signed`, and `sign-and-send-tx-v1`. `sign-and-send-tx-v1` calls `signAndSendTransaction` with that same unsigned v1 self-transfer so the wallet sends it. After this version, approving an unsigned sample can return a signed packet whose first byte is `0x81`. |

## Out of scope

- Address lookup tables on v1.
- SIMD-0596 (96 addresses). The cap in this version is 64.
- Rewriting a v1 message that already has any non-zero signature.
- A design demo. The settings row and the fee card keep their current layout.

## Acceptance

- [x] `cd wallet && npm run typecheck`
- [x] `cd test/test-web && npm run build`
- [ ] Settings shows Default priority fee under Default CU price. A fresh install stores `"5000"`. An empty edit returns to `5000`. `0` and `1000000000` save. A non-integer does not.
- [x] test-web `sign-tx-v1` on an unsigned v1 opens the fee card with CU limit and priority fee in lamports, not CU price. The built sample already has a priority fee, so the default is not written over it. Apply changes the config. Approve returns a packet whose first byte is `0x81`. User walk 2026-11-04.
- [x] test-web `sign-and-send-tx-v1` sends that same unsigned v1 through `signAndSendTransaction`. The fee card is the v1 card. Approve lets the wallet broadcast it. User walk 2026-11-04.
- [x] test-web `sign-tx-v1-signed` builds a v1 whose first signature slot is 64 non-zero bytes. Both fee inputs are disabled. Approve signs the original bytes. User walk 2026-11-04.
- [x] test-web `sign-tx-v1-no-fee` builds an unsigned v1 with the priority-fee config bit clear. The fee card shows the stored default. test-web `sign-tx-v1-zero-fee` sets the priority fee to `0`. The fee card shows `0`. User walk 2026-11-04.
- [x] test-web `sign-tx-v1-no-cu` builds an unsigned v1 with the CU-limit config bit clear. The existing simulation failure notice shows. Approve stays enabled. The message gains no `ComputeBudget` instruction. User walk 2026-11-04.
- [x] A legacy or v0 unsigned transaction still shows CU limit and CU price and still receives the default CU price when the price is absent. User walk of test-web 2026-11-04.
- [ ] An in-wallet token send and a close-empty batch are v1. Each config has a CU limit, a loaded-accounts data size that is a positive multiple of 32768, and the default priority fee. Close-empty puts more than the old ~22 closes in one transaction when more than 22 empty accounts of the same owner and token program are selected, and never more than 64 addresses.
- [ ] If the pre-build simulation fails, send and close-empty do not open the approval.
- [ ] `host-tools.ts` requests `getTransaction` with `maxSupportedTransactionVersion: 1`.

## Anchors

| Path | Role |
|------|------|
| `wallet/src/inject/wallet.ts` | Advertises `1` |
| `wallet/src/shared/protocol/storage-keys.ts` | `defaultPriorityFeeLamports` |
| `wallet/src/popup/settings/settings-hub.tsx` | Settings row |
| `wallet/src/approval/dom/fee-details.ts` | Fee inputs |
| `wallet/src/background/simulate/compute-budget-tx.ts` | v1 config read and write. No `ComputeBudget` append |
| `wallet/src/background/simulate/sign-tx-simulate.ts` | Unsigned v1 default fee |
| `wallet/src/background/tx-ai/local-flags.ts` | Inline v1 accounts |
| `wallet/src/background/simulate/resolve-account-keys.ts` | No lookup fetch for v1 |
| `wallet/src/background/send/wallet-begin-send.ts` | v1 send |
| `wallet/src/background/close-empty/build-close-txs.ts` | v1 close-empty |
| `wallet/src/shared/close-empty/close-empty-pack.ts` | 4096 bytes and 64 addresses |
| `wallet/src/background/tx-ai/host-tools.ts` | `maxSupportedTransactionVersion: 1` |
| `test/test-web/src/main.ts` | `sign-tx-v1`, `sign-tx-v1-no-fee`, `sign-tx-v1-zero-fee`, `sign-tx-v1-no-cu`, `sign-tx-v1-signed`, `sign-and-send-tx-v1` |

## Still to decide

(none)
