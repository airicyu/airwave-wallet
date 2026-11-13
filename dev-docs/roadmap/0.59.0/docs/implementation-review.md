# Implementation review — 0.59.0

- Date: 2026-11-13 (Asia/Hong_Kong)
- Round: 1
- Role: Implementation review of the privacy spend and merge signing paths. No code changes in this round. This file is not the contract. [`../INDEX.md`](../INDEX.md) wins.
- Reviewed at: working tree on `v0.59.0`
- Scope: `wallet/src` privacy register, private Send, Unshield, and Merge. This is not a full Track walk. Shield, the private-balance list, TSPP rejection, and the catalogs were not re-tested.
- Baseline: decided sentences and acceptance in [`../INDEX.md`](../INDEX.md); direction in [`how.md`](./how.md). Close-empty batch approval is the existing confirm screen in `wallet/src/popup/close-empty/CloseEmptyFeature.tsx` (`CloseEmptyConfirmScreen`) and the commit in `wallet/src/background/close-empty/commit-close-empty.ts`.

**Verdict:** the five findings are fixed in the working tree. This file has not been re-reviewed.

## Match to the contract

| Contract sentence | Result |
|-------------------|--------|
| Private Send and Unshield proofs are bound to the amount, the selected notes, and the recipient. The approval screen opens only after that proof returns. | Different — see 059-M01 and 059-M02 |
| More than 40 selected notes blocks Send and Unshield. The page does not merge by itself. | Popup only — see 059-L01 |
| 52 or fewer merge notes are one transaction and one approval. More than 52 use the same batch approval as closing empty token accounts. Each group is proved while it is built. Groups do not reuse notes. Reject leaves the selection unchanged. | Different — see 059-H01 |
| Register builds one transaction, opens the normal approval screen, and signs only after the user approves. Reject returns to the surface that started it. | Different — see 059-M03 |
| `wallet.*` is accepted only from an extension page | Matches (`wallet/src/background/index.ts`) |
| Lock clears the derived viewing key | Matches (`clearPrivacyKeys` also clears merge batches) |
| A dApp sign of `TSPP/derive/v1` is rejected before approval | Not re-reviewed in this round |

## Findings

| ID | Sev | Status | Notes |
|----|-----|--------|-------|
| 059-H01 | HIGH | Fixed in tree | Merge of more than 52 notes is proved first and signed only from the merge confirm screen. |
| 059-M01 | MEDIUM | Fixed in tree | Private Send sends the selected note ids into the proof. |
| 059-M02 | MEDIUM | Fixed in tree | Unshield sends the selected note ids into the proof. |
| 059-M03 | MEDIUM | Fixed in tree | Register queues the transaction for the normal approval screen. |
| 059-L01 | LOW | Fixed in tree | Both spend handlers reject more than 40 note ids before a proof. |

**Open HIGH:** none in this list.

### 059-H01 — Merge signs groups the user has not seen

INDEX: 52 or fewer selected notes are one v1 transaction and one approval. More than 52 are split into groups of at most 52. Those groups use the same batch approval as closing empty token accounts. Each group gets its own proof while that transaction is built. The groups do not reuse the same notes. Success returns to the private-balance tab. Reject leaves the selection unchanged.

Close-empty shows every group on one confirm screen (transaction count, fee, and the accounts in each transaction), then one confirm signs those already-built transactions.

Current merge path:

1. `wallet/src/background/privacy/begin-merge.ts` `handleBeginMerge` builds and queues only `groups[0]` through `queueWalletSend`.
2. When more groups exist, it stashes the remaining note ids under that request id before the user approves (`stashMergeBatch`).
3. The popup opens the normal single-transaction approval (`wallet/src/popup/privacy/MergeForm.tsx`).
4. On success, `wallet/src/popup/approval/ApprovalHost.tsx` calls `wallet.finishMergeBatch`.
5. `handleFinishMergeBatch` (`begin-merge.ts`) builds a new proof, signs with the loaded vault key, and broadcasts each remaining group. There is no second approval and no close-empty-style list of those groups.
6. `handleFinishMergeBatch` does not check that the first approval was approved. Any extension page that knows the request id can call it while the first approval is still pending, because the stash already exists. A dApp cannot: `wallet.*` is limited to extension pages.

The user selected the notes, and the later groups spend those notes back to the same owner. The missing consent is the unseen transactions: extra proofs, extra signatures, and extra network fees.

**Required fix**

- 52 or fewer notes stay one v1 transaction and the normal approval screen.
- More than 52 notes: build and prove every group before any signature. Show one batch confirmation that lists every group the user is about to sign, in the same role as `CloseEmptyConfirmScreen` (how many transactions, and which notes are in each). One confirm signs and submits only those built transactions. Reject, abort, or lock signs none of them and drops the stash.
- `wallet.finishMergeBatch` must refuse when that batch confirmation has not happened. It must not build a new transaction the user did not see.
- Groups stay disjoint. Success still returns to the private-balance tab. Reject still leaves the merge selection unchanged.
- Do not auto-merge from Send or Unshield. Do not add a per-group approval screen.

Update the file headers in `begin-merge.ts`, `merge-batch.ts`, and `MergeForm.tsx`. They currently describe signing the later groups with no further approval.

### 059-M01 — Private Send does not spend the selected notes

INDEX: the proof is bound to the amount, the selected notes, the recipient, and that transaction's ephemeral key. Auto-select starts on and covers the amount in amount-descending, then id-ascending order. Turning it off lets the user select notes. Submit stays blocked when the selected sum is below the amount or the selection is over 40 notes.

`wallet/src/popup/privacy/PrivateSendForm.tsx` computes `picked` and then calls `wallet.beginPrivateSend` with only `mint`, `amountUi`, and `recipient`.

`wallet/src/background/privacy/begin-private-send.ts` `handleBeginPrivateSend` calls `buildTransferTransaction` with `recipient`, `asset`, and `amount`. It does not receive note ids.

`TransferTransactionParams` in `@heliuslabs/spr` has no `inputs` field. `buildTransferTransaction` calls `createTransfer`, which selects notes with `selectSpendInputs`: default policy, largest first, capped at `MAX_SPEND_INPUTS` (40). That set can differ from the form, especially when auto-select is off. Auto-select can coincide with the SDK only while both walks stay largest-first; the service worker never sees the ids, so a tie-break or a manual selection is not bound into the proof.

**Required fix**

- The confirm request sends the selected note ids (the auto-select result or the manual selection).
- The service worker rejects the command when the id list is missing, longer than 40, contains an id the synced wallet does not hold for that mint, repeats an id, or sums to less than the amount. It does not run a second cover.
- The proof spends those notes. Do not pass `inputs` to `buildTransferTransaction`; that parameter does not exist and will not typecheck.
- `selectUtxos` is exported from `@heliuslabs/spr/internal` and is marked `@internal`. Its `eligible` policy can limit the walk to the named hashes. `UnsignedPrivateTransaction` already takes `inputs`. Keep the choice inside the private-send build path and reuse the existing authorize-and-assemble steps. Do not add a second prover and do not persist SDK key objects.
- Reject still returns to the form with the amount, the auto-select state, and the selected notes unchanged.
- Update the header in `PrivateSendForm.tsx`. It currently says confirm does not send the selected note ids.

### 059-M02 — Unshield does not spend the selected notes

INDEX: Unshield uses the same UTXO selection, insufficient-balance line, and 40-note limit as Send. The amount returns to the signing address. Change stays a private note.

`wallet/src/popup/privacy/UnshieldForm.tsx` calls `wallet.beginUnshield` with only `mint` and `amountUi`.

`wallet/src/background/privacy/begin-unshield.ts` `handleBeginUnshield` calls `buildWithdrawalTransaction` with `amount` and the signing address as recipient. `WithdrawalTransactionParams` has no `inputs` field. `createWithdrawal` uses the same `selectSpendInputs` path as transfer.

**Required fix**

Same note binding as 059-M01, on the withdrawal build. The recipient stays the signing address. There is still no recipient field. Update the header in `UnshieldForm.tsx`.

### 059-L01 — The 40-note cap is only in the popup

INDEX: more than 40 notes blocks Send and Unshield. Acceptance: selecting 41 notes, or an amount that needs 41 notes, shows the validation line and blocks both actions.

`PrivateSendForm.tsx` and `UnshieldForm.tsx` set `overLimit` and disable submit. `handleBeginPrivateSend` and `handleBeginUnshield` do not count notes. The SDK later throws `WALLET_TOO_MANY_INPUTS` when its own selector passes 40. That is a build failure, not the product check, and it does not see a manual selection.

**Required fix**

Reject in both handlers before building a proof when the selected id list length is greater than 40. Keep the popup line. Do not start a merge.

### 059-M03 — Register signs before the user sees the transaction

INDEX, as amended 2026-11-13: pressing Register builds one transaction that writes the viewing public key and the nullifier public key and sets merge encryption to `PoseidonCtrV1`, then opens the normal approval screen. The wallet signs only after the user approves. Reject from the Private Balances tab returns to that unregistered tab. Reject from Shield returns to Shield. Success on the tab shows the private list. Success on Shield stays on Shield and shows the amount form. The button stays disabled when public SOL cannot pay the fee.

`wallet.privacyRegister` (`wallet/src/background/privacy/commands.ts` `handlePrivacyRegister`) builds that version-0 transaction with `getRegisterInstructionAsync` and `getSetMergeEncryptionInstructionAsync`, signs it with the loaded account, and broadcasts it inside the command. `PrivateBalancesPanel.tsx` and `ShieldForm.tsx` call it from the register button. The user does not see the transaction.

**Required fix**

- Build the same transaction, then queue it with `queueWalletSend`. Sign it only from that approval.
- Do not sign or broadcast inside `handlePrivacyRegister`.
- Reject returns to the unregistered tab, or to Shield when Shield started the register. The button can be pressed again.
- After confirmation, the tab shows the private list. Shield stays open and shows the amount form.
- A failed build stays on the surface that started it. The fee check still disables the button before the approval opens.

## Fix log

2026-11-13, working tree: 059-H01, 059-M01, 059-M02, 059-M03, and 059-L01 are implemented. Not re-reviewed.

## What the follow-up must not do

- Do not auto-merge when Send or Unshield exceeds 40 notes.
- Do not turn an unregistered private Send into a public withdrawal.
- Do not add a dApp method, a second API key, or persisted viewing or nullifier secrets.
- Do not hydrate the pending transaction from `chrome.storage`.
- Do not change 0.58.0.
