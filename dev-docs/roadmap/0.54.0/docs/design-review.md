# Design review — 0.54.0 Airwave Wallet

- Date: 2026-11-04 (Asia/Hong_Kong)
- Round: **initial**
- Role: design review (does not edit INDEX / HOW / reasoning / HANDOFF / code; this file is not the contract)
- Baseline: decided sentences and acceptance in [`../INDEX.md`](../INDEX.md); [`reasoning.md`](./reasoning.md); [`how.md`](./how.md); [`../HANDOFF.md`](../HANDOFF.md). Upstream shipped contract: [`../../0.53.0/INDEX.md`](../../0.53.0/INDEX.md). Idea record only: [`../../backlog/v1-transaction.md`](../../backlog/v1-transaction.md). Format note: [`../../../research/solana-tx-versions.md`](../../../research/solana-tx-versions.md).
- Architecture bans: [`../../GUIDELINES.md`](../../GUIDELINES.md) section 4. This INDEX does not replace any ban. Pending stays in the service worker, the new fee is a `chrome.storage` settings string, signing stays in the extension UI, and no new Wallet Standard method is declared.
- Current-code sample: anchor files in the INDEX. The v1 fee path is not implemented. That absence is not a design HIGH.
- **Verdict:** no open HIGH. The review gate passes. The proposal is feasible. Fix M1–M4 in INDEX / HOW before implementation so the track does not invent product numbers or a second reserve rule.

## Load-bearing decisions

`reasoning.md` names the approach: read and write the v1 message config; a new lamport total (`defaultPriorityFeeLamports`, factory `"5000"`) instead of reusing `defaultCuPrice`; leave dapp CU limit and loaded-accounts data size unset when omitted; build send and close-empty as v1 with one provisional simulation; pack close-empty to 4096 bytes and 64 addresses; advertise `1` without making the list a byte gate. Dropped alternatives are stated: a second signer, fetching lookup tables for v1, appending `ComputeBudget` instructions, filling missing dapp resource limits, and keeping the 1232-byte close-empty cap. `how.md` is one track and matches that scope. It does not pull in the e2e harness, SIMD-0596, or v1 address lookup tables.

Omitted versus explicit `0` is representable. The v1 `config_mask` has one bit per present config value (`solana-tx-versions.md`). Kit 8.4.0 already exposes `setTransactionMessagePriorityFeeLamports` (test-web `buildV1SelfTransferTx`). Simulate and send already pass `encoding: "base64"`.

## Findings (this round)

Closed = written into INDEX / HOW / HANDOFF. Open = the contract still diverges. Non-blocking = record only.

### HIGH

None.

### MEDIUM

#### M1 — Hand checks for the non-default v1 fixtures have no control — **open**

INDEX acceptance requires an unsigned v1 that omits the priority fee, one with explicit `0`, one that omits CU limit, and one with any non-zero signature. `test/test-web/src/main.ts` `sign-tx-v1` always sets CU limit `5000`, loaded-accounts data size `32768`, and priority fee `5000n`. HOW says to use that button for the dapp path and does not name another button or fixture file. A human cannot perform those four rows from the written steps.

Write into the INDEX acceptance (and a HOW checks sentence): add test-web actions, or name committed fixture bytes, for (1) unsigned v1 with the priority-fee config bit clear, (2) unsigned v1 with priority fee present and `0`, (3) unsigned v1 with the CU-limit config bit clear, (4) v1 whose first signature slot is non-zero. `sign-tx-v1` remains the case that already has a priority fee and must not be overwritten.

#### M2 — Provisional resource limits and the 32 KiB round are not locked — **open**

INDEX and HOW say to simulate once with provisional maximum CU limit and loaded-accounts data size, then round loaded-accounts data size up to the next 32 KiB, and that the stored size is a positive multiple of 32768. They do not give the two provisional integers. "Before compile" (INDEX) and "compile version 1. Simulate once" (HOW step 5) disagree, and a simulate RPC needs a compiled packet. A measured size of 0 rounded by integer division stays 0, which misses "positive multiple".

Write into the INDEX decided "Wallet-built" cell and HOW step 5: compile a provisional v1 with CU limit `1400000` and loaded-accounts data size `67108864`, simulate that packet once, then compile the message the user approves. CU limit is `computeCloseEmptyUnitLimit(unitsConsumed)`. Loaded-accounts data size is the smallest positive multiple of `32768` that is greater than or equal to the measured size, so `0` becomes `32768`.

#### M3 — Send and close-empty still reserve a CU-price priority fee — **open**

Decided text writes `defaultPriorityFeeLamports` into every wallet-built v1 config. It never says what happens to the lamport reserve. Current `solReserveLamports` is `5000 + ceil(200000 × defaultCuPrice / 1000000)`. Close-empty totals use `priorityFeeLamportsFromCu(cuLimit, defaultCuPrice)`. The factory `"5000"` matches today's default price on a 200,000 CU transaction, so the default setting still lines up. A legal stored fee up to `"1000000000"` does not. The pre-build simulation then fails, and the decided rule refuses to open the approval.

Write into the INDEX decided "Wallet-built" cell: the in-wallet send reserve and the close-empty fee total use `BigInt` of the stored `defaultPriorityFeeLamports` as the priority term. They do not use `defaultCuPrice` for that term. The signature fee stays 5000 lamports per signer.

#### M4 — v1 priority total, apply payload, and settings load path — **open**

HOW step 3 changes the second input and the apply value. `attachFees` in `sign-tx-simulate.ts` still sets `priorityLamports` to `ceil(cuLimit × cuPrice / 1000000)`. Left unchanged, a v1 fee of 5000 lamports with CU limit 5000 displays as 25 lamports. HOW also says "Apply sends the lamport total" without a type. The standing numbers rule requires the fee as `BigInt` from a string, not a JSON `number`. HOW step 1 adds the settings field and the hub row. It does not name `normalizeSettings` in `storage-io.ts` or the settings fingerprint in `popup/settings/settings-logic.ts`, which is how `defaultCuPrice` actually loads and repaints.

Write into HOW steps 1–3: normalizing the settings object maps a missing or blank `defaultPriorityFeeLamports` to `"5000"` and rejects a non-integer or out-of-range edit without writing it. The settings fingerprint includes that string. For a v1 message, `priorityLamports` is the config priority fee in lamports, and the fee total is the signature fee plus that value. Apply sends the priority fee as a decimal string.

### LOW

| ID | Status | Note |
|----|--------|------|
| L1 | non-blocking | INDEX status is `in progress` while HANDOFF says no v1 fee code has been written. Design review expected `draft`. Product behavior is unchanged by this label. |
| L2 | non-blocking | `computeCloseEmptyUnitLimit` adds 6000 CU for two `ComputeBudget` instructions this version does not append. The INDEX locks that function. Do not drop the headroom unless the decided sentence changes. |

## Acceptance cross-check

| Acceptance sentence | Testable at design level | Gap |
|---------------------|--------------------------|-----|
| `cd wallet && npm run typecheck` | Yes | None |
| `cd test/test-web && npm run build` | Yes | None |
| Settings row, factory `"5000"`, empty edit, `0`, `1000000000`, non-integer rejected | Yes, on the existing settings hub | HOW should name normalize and the fingerprint (M4) |
| test-web `sign-tx-v1`: CU limit and priority fee, default not overwritten, Apply, first byte `0x81` | Yes | Fee SOL total formula (M4) |
| Non-zero signature: inputs disabled, original bytes signed | Product rule is clear | No named fixture (M1) |
| Omitted priority fee gets the stored default; explicit `0` stays | Product rule is clear; mask bit can represent both | No named fixture (M1) |
| Omitted CU limit: existing simulation failure, Approve stays enabled, no `ComputeBudget` instruction | Product rule is clear | No named fixture (M1) |
| Legacy and v0 still show CU limit and CU price and still receive the default CU price | Yes, current path kept | None |
| In-wallet send and close-empty are v1 with CU limit, a positive multiple of 32768, and the default priority fee; close-empty exceeds ~22 closes and stops at 64 addresses | Rule is clear | Provisional integers, zero-size rounding, compile order (M2); reserve (M3) |
| Failed pre-build simulation does not open the approval | Yes | A mismatched reserve makes this the common path for a non-default fee (M3) |
| `host-tools.ts` `getTransaction` uses `maxSupportedTransactionVersion: 1` | Yes | None. No other `getTransaction` or `getBlock` in `wallet/src` passes a max version today, so the "any other call" sentence is vacuous until one appears |

## Current-code sample

Current code still implements legacy and v0. That is expected. It does not contradict a v1 path that is specified beside it.

| Anchor | Current behavior | Conflict with the proposal |
|--------|------------------|----------------------------|
| `wallet/src/inject/wallet.ts` | `supportedTransactionVersions` is `[0, "legacy"]` on both sign features | No. Advertisement is this version's step |
| `wallet/src/shared/protocol/storage-keys.ts` | `defaultCuPrice: number`, factory `25_000`. No priority-fee field | No |
| `wallet/src/popup/settings/settings-hub.tsx` | Shows Default CU price | No |
| `wallet/src/approval/dom/fee-details.ts` | CU limit and CU price; Apply parses both with `parseCuFieldInput` (`number`) | No, until the v1 branch. M4 locks the v1 apply type |
| `wallet/src/background/simulate/compute-budget-tx.ts` | Writes `ComputeBudget` instructions | No. v1 must branch off this |
| `wallet/src/background/simulate/sign-tx-simulate.ts` | Fills a missing CU price from `defaultCuPrice`. `priorityLamports` is `limit × price / 1e6` | Display formula is the M4 gap, not a second product |
| `wallet/src/background/tx-ai/local-flags.ts` | `message.version === 1` returns no accounts and zero signers | Proposal replaces this. Not a design HIGH |
| `wallet/src/background/simulate/resolve-account-keys.ts` | Non-legacy messages go through the v0 lookup fetch | Proposal skips version 1. Not a design HIGH |
| `wallet/src/background/send/wallet-begin-send.ts` | Reserve uses `solReserveLamports(defaultCuPrice)` | M3 |
| `wallet/src/background/close-empty/build-close-txs.ts` | Builds today's close transactions (v0 path via the close-empty planner) | No, aside from M3's fee total |
| `wallet/src/shared/close-empty/close-empty-pack.ts` | Default cap `CLOSE_EMPTY_MAX_TX_BYTES` (1232). No address cap of 64 | Proposal adds a 4096-byte, 64-address pack for these v1 transactions and leaves the 1232 constant unused for them |
| `wallet/src/background/tx-ai/host-tools.ts` | `getTransaction` with `maxSupportedTransactionVersion: 0`, `encoding: "json"` | Version bump is in scope. Encoding is not required to change for this read |
| `test/test-web/src/main.ts` | `sign-tx-v1` builds a v1 self-transfer whose first byte is `0x81`, with all three config fields set | M1 for the other fixtures |

`0.53.0` (blockhash probe, Devnet strip, result memory only in the sign shell) stays in force. This version does not retarget that probe or store it. Backlog sentences that INDEX already copied are decided; backlog sentences INDEX does not repeat are not in force.

## Fix tracker

| ID | Grade | Status | Where it closes |
|----|-------|--------|-----------------|
| M1 | MEDIUM | open | INDEX acceptance; HOW Checks |
| M2 | MEDIUM | open | INDEX "Wallet-built"; HOW step 5 |
| M3 | MEDIUM | open | INDEX "Wallet-built" |
| M4 | MEDIUM | open | HOW steps 1–3 |
| L1 | LOW | non-blocking | — |
| L2 | LOW | non-blocking | — |

## Prior rounds

| Round | Date | Conclusion |
|-------|------|------------|
| initial | 2026-11-04 | No HIGH. Proposal is feasible. Gate passes. M1–M4 should be written into the contract before implementation. |

## Waiver

None.

---

# Design review — 0.54.0 Airwave Wallet

- Date: 2026-11-04 (Asia/Hong_Kong)
- Round: **re-review 1**
- Role: design review (does not edit INDEX / HOW / reasoning / HANDOFF / code; this file is not the contract)
- Baseline: decided sentences and acceptance in [`../INDEX.md`](../INDEX.md); [`reasoning.md`](./reasoning.md); [`how.md`](./how.md); [`../HANDOFF.md`](../HANDOFF.md)
- Architecture bans: [`../../GUIDELINES.md`](../../GUIDELINES.md) section 4. Unchanged. This INDEX does not replace a ban.
- Current-code sample: same anchors as the initial round. v1 fee behavior is still not implemented. That absence is not a design HIGH.
- **Verdict:** no open HIGH. The review gate passes. The proposal is feasible. M1–M4 are closed in INDEX and HOW. Write M5 into HOW step 5 before implementation so the popup spend cap and the close-empty fee total do not keep the CU-price formula.

## Load-bearing decisions

Unchanged from the initial round. `reasoning.md` now also names the provisional packet (CU limit 1400000, loaded-accounts data size 67108864) and the lamport reserve that uses the stored priority fee. Dropped alternatives are unchanged. One track. No scope leak into address lookup tables, SIMD-0596, or the e2e harness.

## Findings (this round)

Closed = the sentence the initial round asked for is in INDEX or HOW. HANDOFF was not a required landing place for M1–M4; it does not contradict those sentences. Open = the contract still diverges.

### HIGH

None.

### MEDIUM

#### M1 — Hand checks for the non-default v1 fixtures have no control — **closed**

INDEX acceptance names `sign-tx-v1-no-fee`, `sign-tx-v1-zero-fee`, `sign-tx-v1-no-cu`, and `sign-tx-v1-signed`, and states what each fixture asserts. The test-web decided cell and the anchors list the same four ids. HOW Checks names them and leaves `sign-tx-v1` as the sample that already has a priority fee.

#### M2 — Provisional resource limits and the 32 KiB round are not locked — **closed**

INDEX "Wallet-built" and HOW step 5 both say: compile a provisional v1 with CU limit `1400000` and loaded-accounts data size `67108864`, simulate that packet once, then compile the message the user approves. Loaded-accounts data size is the smallest positive multiple of `32768` at least as large as the measured size, so `0` becomes `32768`. `reasoning.md` repeats the two provisional integers.

#### M3 — Send and close-empty still reserve a CU-price priority fee — **closed**

INDEX "Wallet-built" and HOW step 5 say the in-wallet send reserve and the close-empty fee total use `BigInt` of the stored `defaultPriorityFeeLamports` as the priority term, and the signature fee stays 5000 lamports per signer. They do not use `defaultCuPrice` for that term. `reasoning.md` states the same reserve rule. Which functions still call the old formula is M5, not a second product rule.

#### M4 — v1 priority total, apply payload, and settings load path — **closed**

HOW step 1 names `normalizeSettings` (missing or blank becomes `"5000"`; a non-integer or out-of-range edit is not written) and the settings fingerprint in `popup/settings/settings-logic.ts`. HOW step 2 says that for a v1 message `priorityLamports` is the config fee in lamports and the fee total is the signature fee plus that value. HOW step 3 says Apply sends the priority fee as a decimal string. INDEX "Priority fee setting" locks the same normalize bounds and `BigInt` parsing.

#### M5 — Popup spend cap and close-empty fee totals sit outside the HOW file list — **open**

The reserve rule is locked (M3). HOW step 5 names `wallet-begin-send.ts` and `build-close-txs.ts` only. The spend cap the user sees is `solReserveLamports(settings.defaultCuPrice)` in `wallet/src/popup/send/TokenSendForm.tsx` and `wallet/src/popup/send/send-logic.ts`. The close-empty fee total is `priorityFeeLamportsFromCu` in `wallet/src/background/close-empty/plan-close-empty.ts` and `wallet/src/background/close-empty/commit-close-empty.ts`. Following the file list leaves those four on the CU-price formula while the built v1 config uses the flat lamport setting. `HomeTokenList.tsx` lists `defaultCuPrice` only as a reload dependency.

Write into HOW step 5: `solReserveLamports` callers in `TokenSendForm.tsx` and `send-logic.ts`, and the close-empty fee totals in `plan-close-empty.ts` and `commit-close-empty.ts`, use `BigInt` of stored `defaultPriorityFeeLamports` as the priority term and 5000 lamports per signer. Do not change the `HomeTokenList.tsx` reload dependency for this version.

### LOW

| ID | Status | Note |
|----|--------|------|
| L1 | non-blocking | INDEX status is still `in progress`. HANDOFF still says no v1 fee code has been written. The label does not change product behavior. |
| L2 | non-blocking | `computeCloseEmptyUnitLimit` still adds 6000 CU for two `ComputeBudget` instructions this version does not append. INDEX still locks that function for wallet-built CU limit, including token send. |

## Acceptance cross-check

| Acceptance sentence | Testable at design level | Gap |
|---------------------|--------------------------|-----|
| `cd wallet && npm run typecheck` | Yes | None |
| `cd test/test-web && npm run build` | Yes | None |
| Settings row, factory `"5000"`, empty edit, `0`, `1000000000`, non-integer rejected | Yes | None (M4) |
| test-web `sign-tx-v1`: CU limit and priority fee, default not overwritten, Apply, first byte `0x81` | Yes | None (M4) |
| `sign-tx-v1-signed`: inputs disabled, original bytes signed | Yes | None (M1) |
| `sign-tx-v1-no-fee` shows the stored default; `sign-tx-v1-zero-fee` shows `0` | Yes | None (M1) |
| `sign-tx-v1-no-cu`: existing simulation failure, Approve stays enabled, no `ComputeBudget` instruction | Yes | None (M1) |
| Legacy and v0 still show CU limit and CU price and still receive the default CU price | Yes | None |
| In-wallet send and close-empty are v1 with CU limit, a positive multiple of 32768, and the default priority fee; close-empty exceeds ~22 closes and stops at 64 addresses | Yes | Popup cap and plan/commit fee totals are unnamed (M5) |
| Failed pre-build simulation does not open the approval | Yes | None (M2, M3) |
| `host-tools.ts` `getTransaction` uses `maxSupportedTransactionVersion: 1` | Yes | None |

## Current-code sample

No new contradiction. Current code still uses the CU-price reserve and fee total. That is the work M3 and M5 describe, not a second product.

| Anchor | Current behavior | Conflict with the proposal |
|--------|------------------|----------------------------|
| `TokenSendForm.tsx`, `send-logic.ts`, `wallet-begin-send.ts` | `solReserveLamports(defaultCuPrice)` = `5000 + ceil(200000 × price / 1000000)` | Rule is M3. Popup files are M5 |
| `plan-close-empty.ts`, `commit-close-empty.ts` | Priority term is `priorityFeeLamportsFromCu(cuLimit, defaultCuPrice)` per transaction, then summed | Rule is M3. These files are M5 |
| `HomeTokenList.tsx` | `defaultCuPrice` is a `useEffect` dependency for holdings reload | Not a reserve. Leave it |
| `test/test-web/src/main.ts` | Only `sign-tx-v1` | The four new buttons are this version's work (M1 closed as a contract) |

`0.53.0` stays in force. This version does not retarget the blockhash probe.

## Fix tracker

| ID | Grade | Status | Where it closes |
|----|-------|--------|-----------------|
| M1 | MEDIUM | closed | INDEX acceptance and test-web cell; HOW Checks |
| M2 | MEDIUM | closed | INDEX "Wallet-built"; HOW step 5; reasoning provisional packet |
| M3 | MEDIUM | closed | INDEX "Wallet-built"; HOW step 5; reasoning reserve sentence |
| M4 | MEDIUM | closed | HOW steps 1–3; INDEX "Priority fee setting" |
| M5 | MEDIUM | open | HOW step 5 |
| L1 | LOW | non-blocking | — |
| L2 | LOW | non-blocking | — |

## Prior rounds

| Round | Date | Conclusion |
|-------|------|------------|
| initial | 2026-11-04 | No HIGH. Proposal is feasible. Gate passes. M1–M4 should be written into the contract before implementation. |
| re-review 1 | 2026-11-04 | No HIGH. M1–M4 are in INDEX and HOW. Gate passes. Proposal is feasible. M5 should be written into HOW step 5 before implementation. |

## Waiver

None.

---

# Design review — 0.54.0 Airwave Wallet

- Date: 2026-11-04 (Asia/Hong_Kong)
- Round: **re-review 2**
- Role: design review (does not edit INDEX / HOW / reasoning / HANDOFF / code; this file is not the contract)
- Baseline: decided sentences and acceptance in [`../INDEX.md`](../INDEX.md); [`reasoning.md`](./reasoning.md); [`how.md`](./how.md); [`../HANDOFF.md`](../HANDOFF.md)
- Architecture bans: [`../../GUIDELINES.md`](../../GUIDELINES.md) section 4. Unchanged. This INDEX does not replace a ban.
- Current-code sample: same anchors as re-review 1. v1 fee behavior is still not implemented. That absence is not a design HIGH.
- **Verdict:** no open HIGH. The review gate passes. The proposal is feasible. M5 is closed in INDEX "Wallet-built" and HOW step 5. No MEDIUM remains that should be fixed before implementation.

## Load-bearing decisions

Unchanged from re-review 1. `reasoning.md` still names the provisional packet and the lamport reserve that uses the stored priority fee. Dropped alternatives are unchanged. One track. No scope leak into address lookup tables, SIMD-0596, or the e2e harness.

## Findings (this round)

Closed = the sentence re-review 1 asked for is in INDEX or HOW. Open = the contract still diverges.

### HIGH

None.

### MEDIUM

#### M1 — Hand checks for the non-default v1 fixtures have no control — **closed**

Unchanged. INDEX acceptance and HOW Checks still name the four fixtures.

#### M2 — Provisional resource limits and the 32 KiB round are not locked — **closed**

Unchanged. INDEX "Wallet-built" and HOW step 5 still lock CU limit `1400000`, loaded-accounts data size `67108864`, one simulation, then the approved compile, and `0` rounds to `32768`.

#### M3 — Send and close-empty still reserve a CU-price priority fee — **closed**

Unchanged. The priority term is `BigInt` of stored `defaultPriorityFeeLamports`. The signature fee stays 5000 lamports per signer.

#### M4 — v1 priority total, apply payload, and settings load path — **closed**

Unchanged. HOW steps 1–3 and INDEX "Priority fee setting" still name normalize, the fingerprint, the v1 fee total, and Apply as a decimal string.

#### M5 — Popup spend cap and close-empty fee totals sit outside the HOW file list — **closed**

INDEX "Wallet-built" names the in-wallet send reserve in `TokenSendForm.tsx`, `send-logic.ts`, and `wallet-begin-send.ts`, and the close-empty fee total in `plan-close-empty.ts`, `commit-close-empty.ts`, and `build-close-txs.ts`. Those use `BigInt` of stored `defaultPriorityFeeLamports` as the priority term and do not use `defaultCuPrice` for that term. The signature fee stays 5000 lamports per signer. `HomeTokenList.tsx` keeps `defaultCuPrice` only as a reload dependency.

HOW step 5 names the same rule for `solReserveLamports` callers in `wallet/src/popup/send/TokenSendForm.tsx` and `wallet/src/popup/send/send-logic.ts`, and for the close-empty fee totals in `wallet/src/background/close-empty/plan-close-empty.ts` and `wallet/src/background/close-empty/commit-close-empty.ts`. It says not to change the `HomeTokenList.tsx` reload dependency.

### LOW

| ID | Status | Note |
|----|--------|------|
| L1 | non-blocking | INDEX status is still `in progress`. HANDOFF still says no v1 fee code has been written. The label does not change product behavior. |
| L2 | non-blocking | `computeCloseEmptyUnitLimit` still adds 6000 CU for two `ComputeBudget` instructions this version does not append. INDEX still locks that function. |

## Acceptance cross-check

| Acceptance sentence | Testable at design level | Gap |
|---------------------|--------------------------|-----|
| `cd wallet && npm run typecheck` | Yes | None |
| `cd test/test-web && npm run build` | Yes | None |
| Settings row, factory `"5000"`, empty edit, `0`, `1000000000`, non-integer rejected | Yes | None |
| test-web `sign-tx-v1`: CU limit and priority fee, default not overwritten, Apply, first byte `0x81` | Yes | None |
| `sign-tx-v1-signed`: inputs disabled, original bytes signed | Yes | None |
| `sign-tx-v1-no-fee` shows the stored default; `sign-tx-v1-zero-fee` shows `0` | Yes | None |
| `sign-tx-v1-no-cu`: existing simulation failure, Approve stays enabled, no `ComputeBudget` instruction | Yes | None |
| Legacy and v0 still show CU limit and CU price and still receive the default CU price | Yes | None |
| In-wallet send and close-empty are v1 with CU limit, a positive multiple of 32768, and the default priority fee; close-empty exceeds ~22 closes and stops at 64 addresses | Yes | None (M5) |
| Failed pre-build simulation does not open the approval | Yes | None |
| `host-tools.ts` `getTransaction` uses `maxSupportedTransactionVersion: 1` | Yes | None |

## Current-code sample

No new contradiction. Current code still uses the CU-price reserve and fee total. That is the implementation of M3 and M5, not a second product. `HomeTokenList.tsx` is still only a reload dependency.

`0.53.0` stays in force. This version does not retarget the blockhash probe.

## Fix tracker

| ID | Grade | Status | Where it closes |
|----|-------|--------|-----------------|
| M1 | MEDIUM | closed | INDEX acceptance and test-web cell; HOW Checks |
| M2 | MEDIUM | closed | INDEX "Wallet-built"; HOW step 5; reasoning provisional packet |
| M3 | MEDIUM | closed | INDEX "Wallet-built"; HOW step 5; reasoning reserve sentence |
| M4 | MEDIUM | closed | HOW steps 1–3; INDEX "Priority fee setting" |
| M5 | MEDIUM | closed | INDEX "Wallet-built"; HOW step 5 |
| L1 | LOW | non-blocking | — |
| L2 | LOW | non-blocking | — |

## Prior rounds

| Round | Date | Conclusion |
|-------|------|------------|
| initial | 2026-11-04 | No HIGH. Proposal is feasible. Gate passes. M1–M4 should be written into the contract before implementation. |
| re-review 1 | 2026-11-04 | No HIGH. M1–M4 are in INDEX and HOW. Gate passes. Proposal is feasible. M5 should be written into HOW step 5 before implementation. |
| re-review 2 | 2026-11-04 | No HIGH. M5 is in INDEX "Wallet-built" and HOW step 5. Gate passes. Proposal is feasible. No MEDIUM remains open. |

## Waiver

None.
