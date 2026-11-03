# Implementation review — 0.54.0 Airwave Wallet

- Date: 2026-11-04 Asia/Hong_Kong
- Round: **re-review 1** (initial text below is unchanged except status labels and the tracker)
- Role: implementation review (does not change code)
- Baseline: decided sentences and acceptance in [`../INDEX.md`](../INDEX.md); [`how.md`](./how.md), [`reasoning.md`](./reasoning.md), [`../HANDOFF.md`](../HANDOFF.md)
- Architecture bans: [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **Verdict:** accept with fixes. No open HIGH. L1 stays open and does not block the main path. Named commands passed. Unpacked-extension acceptance was not walked. Not ready to ship until that walk is done.

## Findings

### HIGH

#### H1 — Unsigned v1 fee summary stays on “estimating” — **closed** (re-review 1)

`hasCuPair()` in `wallet/src/approval/shell/cu.ts` is true only when both `localCuLimit` and `localCuPrice` are set. After a v1 simulate, `sign-tx.ts` sets `localCuPrice` to `null` and `txCuEditable` to true. `refreshFeeTotal` then passes `estimating: true`, and `updateFeeTotalEl` replaces the fee-card total with `approval.estimating`. `feeFrozenForSim` never latches, because that also requires `hasCuPair()`. The same predicate makes `retrySimDisabled()` stay true, so the retry control and `startSignTxAutoSim` do not run again for an unsigned v1.

The expanded fee rows and the two inputs are still filled from `renderFeeCard`. The collapsed total, which is the fee the approval shell keeps refreshing, does not show the lamport total. This is on the main unsigned v1 approval path (`sign-tx-v1`, `sign-tx-v1-no-fee`, `sign-tx-v1-zero-fee`).

### MEDIUM

#### M1 — Close-empty select screen still estimates the 1232-byte pack — **closed** (re-review 1)

`planCloseEmpty` calls `packCloseEmptyAccounts(..., 4096, 64)`, so the built v1 groups follow the INDEX. `CloseEmptyFeature.tsx` still calls `countCloseEmptyTransactions` with `estimateCloseEmptyTxBytes`, and that helper uses the default `CLOSE_EMPTY_MAX_TX_BYTES` (1232). The select screen can still show the old ~22-close split while the plan that is built uses 4096 bytes and 64 addresses.

### LOW

#### L1 — v1 priority fee is copied into the simulate result as a JavaScript number — **open, non-blocking**

`simulate-v1-sign.ts` `fees()` sets `priorityLamports` and `totalFeeLamports` with `Number(priorityFee)`. The config write stays `bigint`. The settings range is at most `1000000000`, which is exact in a JS number. The INDEX still says the fee is not kept as a number.

#### L2 — `sign-tx-v1-signed` sets one non-zero byte in the 64-byte slot — **closed** (re-review 1)

`isTransactionSigned` treats any non-zero byte as signed, which matches “any signature is non-zero”. The test-web fixture sets only the first byte. The acceptance sentence says the slot is 64 non-zero bytes.

## Acceptance cross-check

| INDEX acceptance sentence | Result | Evidence |
|---|---|---|
| `cd wallet && npm run typecheck` | pass | Exit 0, 2026-11-04. `tsc --noEmit`. |
| `cd test/test-web && npm run build` | pass | Exit 0, 2026-11-04. `tsc --noEmit && vite build`. |
| Settings shows Default priority fee under Default CU price. Fresh install stores `"5000"`. Empty edit returns to `5000`. `0` and `1000000000` save. A non-integer does not. | no browser evidence | Code: hub row under CU price; catalog `settings.hub.priorityFee` for zh-Hant, zh-Hans, en; default `"5000"`; `parsePriorityFeeLamports` plus settings-command reject; empty draft writes `"5000"`. Not walked in the extension. |
| test-web `sign-tx-v1`: fee card is CU limit and priority fee lamports; existing fee is kept; Apply writes config; approve returns a packet whose first byte is `0x81`. | fail (fee total) / no browser evidence | Buttons and `buildV1SelfTransferTx` exist. v1 branch uses config read/write, not CU price. **H1:** unsigned fee summary stays “estimating”. Signing and `0x81` were not walked. |
| `sign-tx-v1-signed`: both inputs disabled; approve signs the original bytes. | no browser evidence | `isTransactionSigned` disables `cuEditable`. Fixture is **L2**. Not walked. |
| `sign-tx-v1-no-fee` shows the stored default. `sign-tx-v1-zero-fee` shows `0`. | no browser evidence | Omitted fee is filled from `defaultPriorityFeeLamports`; a present `0n` is not null, so it is not rewritten. Display of that fill is blocked by **H1**. Not walked. |
| `sign-tx-v1-no-cu`: existing simulation failure notice; Approve stays enabled; no `ComputeBudget` instruction is added. | no browser evidence | Omitted CU limit is not written. `applyApproveFromSimulation` leaves Approve enabled unless the message is unparseable, dirty, busy, or blockhash-blocked. v1 writes use `setTransactionMessageConfig`. Not walked. |
| Legacy or v0 still shows CU limit and CU price and still receives the default CU price when the price is absent. | no browser evidence | `simulateSignTransaction` keeps the legacy/v0 branch when `version !== 1`. Fee card label stays “CU price” off v1. Not walked. |
| In-wallet token send and close-empty are v1. Each config has a CU limit, a loaded-accounts data size that is a positive multiple of 32768, and the default priority fee. Close-empty packs past ~22 closes of the same owner and token program, and never more than 64 addresses. | partial / no browser evidence | `createTransactionMessage({ version: 1 })`, provisional CU `1400000` and data size `67108864`, then `computeCloseEmptyUnitLimit` and `roundLoadedAccountsDataSize`. Plan pack is 4096 and 64. Select-screen count is **M1**. Not walked. |
| If the pre-build simulation fails, send and close-empty do not open the approval. | no browser evidence | Send returns `SIM_FAILED` before `addPending`. Close-empty returns `CU_ESTIMATE_FAILED` before `putClosePlan`. Not walked. |
| `host-tools.ts` requests `getTransaction` with `maxSupportedTransactionVersion: 1`. | pass | `host-tools.ts` passes `1`. No other wallet `getTransaction` or `getBlock` passes a max version. |

No full-suite test command. The INDEX names the two commands above plus hand checks. The extension was not loaded. Every acceptance row except the two commands and the `host-tools.ts` line has no browser evidence.

## Test results

- `cd wallet && npm run typecheck` — pass (exit 0).
- `cd test/test-web && npm run build` — pass (exit 0).
- no full-suite test command.
- Manual checks: not run. HANDOFF already records that the extension was not loaded.

## Fix tracker

| ID | Grade | Status | Where it closed |
|----|-------|--------|-----------------|
| H1 | HIGH | closed | Re-review 1. `feePairReady()` in `wallet/src/approval/shell/cu.ts`. |
| M1 | MEDIUM | closed | Re-review 1. `CloseEmptyFeature.tsx` passes `4096` and `64`. |
| L1 | LOW | open, non-blocking | |
| L2 | LOW | closed | Re-review 1. `buildV1SelfTransferTx` `slot.fill(1)`. |

## Re-review 1

Date: 2026-11-04 Asia/Hong_Kong. Working tree. Product code was not changed in this review.

### H1 — closed

`feePairReady()` returns true for `txMessageVersion === 1` when `sess.localPriorityFee != null`, and otherwise calls `hasCuPair()`. `refreshFeeTotal` sets `estimating` from `!feePairReady()`. `renderSignTransactionBody` latches `feeFrozenForSim` when `!loading && feePairReady()`. `retrySimDisabled` uses `feePairReady()`, so an unsigned v1 whose priority fee is already set can retry. After a successful simulate, `sign-tx.ts` writes `localPriorityFee` from `priorityFeeLamports` and clears `localCuPrice`. `txCuEditable` starts false, so the first auto-sim is not blocked by the missing pair. `localTotalFeeLamports` still prices a CU pair only when both `localCuLimit` and `localCuPrice` are set; on v1 `localCuPrice` is null, so the collapsed total falls through to `sim.totalFeeLamports`.

### M1 — closed

`CloseEmptyFeature.tsx` calls `countCloseEmptyTransactions(..., estimateCloseEmptyTxBytes, 4096, 64)`. `plan-close-empty.ts` still packs with `4096, 64`. The select-screen count and the built plan use the same caps.

### L2 — closed

`test/test-web/src/main.ts` `buildV1SelfTransferTx` allocates `new Uint8Array(64)` and `slot.fill(1)` when `signedSlot` is set. That is 64 non-zero bytes, which matches the acceptance sentence and `isTransactionSigned`.

### L1 — open, non-blocking

`simulate-v1-sign.ts` `fees()` still sets `priorityLamports` and `totalFeeLamports` with `Number(priorityFee)`. `SimulatePendingTxResult` still types those fields as `number | null`. The config write stays `bigint` via `writeV1Budget`, and the simulate result also keeps `priorityFeeLamports` as a decimal string. Settings parse stays `parsePriorityFeeLamports` → `bigint`, stored as a string. The inclusive maximum is `1000000000` (`PRIORITY_FEE_LAMPORTS_MAX`), which is exact in a JavaScript number. This does not block the unsigned v1 fee total, Apply, or settings save. The INDEX sentence that the fee is not kept as a number is still unmet for the display fields.

### Commands and browser

| Check | Result |
|---|---|
| `cd wallet && npm run typecheck` | pass (exit 0, 2026-11-04). `tsc --noEmit`. |
| `cd test/test-web && npm run build` | pass (exit 0, 2026-11-04). `tsc --noEmit && vite build`. |
| Unpacked extension | not walked. No browser evidence for settings, fee card, Apply, `0x81`, signed inputs, send, or close-empty. |

No open MEDIUM remains. No full-suite test command.

## Prior rounds

| Round | Date | Conclusion |
|-------|------|------------|
| initial | 2026-11-04 | Open H1. Named commands passed. Browser acceptance not walked. |
| re-review 1 | 2026-11-04 | H1, M1, and L2 closed. L1 open and non-blocking. Named commands passed. Extension still not walked. |

## User walk

2026-11-04. The user reported a full manual pass of test-web, including the v1 sign buttons and `sign-and-send-tx-v1`. Those INDEX rows are checked. Settings, in-wallet send, and close-empty were not part of that report.
