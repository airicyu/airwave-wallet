# Design review — 0.59.0 Airwave Wallet

- Date: 2026-11-12 (Asia/Hong_Kong)
- Round: **3**
- Role: design review (does not edit INDEX / HOW / reasoning / HANDOFF / code; this file is not the contract)
- Baseline: decided sentences and acceptance in [`../INDEX.md`](../INDEX.md); direction in [`how.md`](./how.md); reasons in [`reasoning.md`](./reasoning.md); session note in [`../HANDOFF.md`](../HANDOFF.md). Layout fallback is the approved demo [`privacy-balance-ux.html`](../../../design-demos/0.59.0/privacy-balance-ux.html). Upstream [0.58.0](../../0.58.0/INDEX.md) is shipped and this version does not change it. [`helius-privacy-rings.md`](../../../research/helius-privacy-rings.md) is protocol notes; the INDEX wins on conflict. Backlog has no scheduled privacy item and is not a requirement.
- Architecture bans: [`../../GUIDELINES.md`](../../GUIDELINES.md) section 4. This INDEX does not override them. Register skips the generic approval screen and still signs inside the extension, which the INDEX states on purpose. No second dApp method is declared. Pending stays in the service worker, results are not broadcast, `chrome.storage` stays the durable source of truth, and there is no hard-coded password.
- Current-code sample: unchanged from the initial round. Privacy UI and `@heliuslabs/spr` are absent, which is expected for a draft.
- **Verdict:** no open HIGH. The review gate passes. The proposal is feasible. M1, M2, M3, and M4 are closed in the INDEX. No MEDIUM remains open.

## Load-bearing decisions

Reasoning names the approach and the dropped alternatives: Default Ring only; Shield / Unshield as the user verbs; private Send blocked when `getUserRecords` is missing; register consented on the tab button; Groth16 proof only while that v1 transaction is built; spend cap 40 with an explicit Merge instead of an automatic merge; `TSPP/derive/v1` rejected before approval; Tokens / Private Balances as Assets sub-tabs; private total removed from the Shield form; auto-select is a toggle that expands the list only when turned off.

`how.md` stays inside that scope: one SDK, existing vault signing, typed command plus `requestId`, in-memory shielded keys in the service worker, local UTXO selection, and the close-empty batch approval for merge groups. It does not add a dApp method, a second API key, Custom Rings, or a change to 0.58.0.

## Findings (this round)

Closed = written into INDEX / HOW / HANDOFF. Open = the contract still diverges. Non-blocking = record only.

### HIGH

None.

### MEDIUM

#### M1 — Watch-only private-balance surface is not locked — **open**

The INDEX says a watch-only address can do none of register, shield, send, merge, or unshield, and acceptance says a watch-only account cannot register or move a private balance. It does not say what Assets shows: the Private Balances sub-tab hidden, the same unavailable sentence as a non-Helius RPC with no actions, or a register button that fails at signing. Those are different screens. The non-Helius case already locks copy and "no actions".

Basis: gap in the decided home behavior for an account type the product already has.

Sentence to lock in the home section: On a watch-only account the Private Balances sub-tab stays visible, shows one unavailable sentence, and shows no register button and no Shield, Send, Unshield, or Merge action.

#### M2 — Keyless combined member is both omitted and a place for a public Shield note — **open**

Under the registered combined row, a member with no vault key is omitted from the private totals and is not shown as zero. The next sentence says a public Shield note for that member may appear under the member. If the member row is absent, the note has nowhere to sit. If the row remains, the member is not omitted. "May" leaves the row optional. Acceptance only checks that the token detail is the main wallet and that the keyless member is not shown as zero.

Basis: the same decided paragraph describes two layouts.

Sentence to lock: A member with no vault key has no row on the private member panel and is not included in the private total. This version does not show a public Shield note for that member on the private tab.

#### M3 — The dApp rejection check has no test-web control — **open**

Acceptance requires a connected dApp to request a signature of `TSPP/derive/v1` as raw bytes, as an off-chain message, and as sign-in, and to receive a rejection with no approval screen. `test/test-web` is the dApp. Its sign buttons send fixed strings (`Hello from Airwave test-web`, a fixed off-chain string, and sign-in statements that do not contain that payload). `how.md` does not add a button. A human cannot perform that checkbox on the current page without a dApp this version does not name.

Basis: GUIDELINES section 5 requires hand-test steps a human can run, including which test-web buttons to press. The other acceptance rows are popup steps and do not have this hole.

Sentence to lock in acceptance: On test-web, three buttons submit `TSPP/derive/v1` through `signMessage`, `signOffchainMessage`, and `signIn`. Each call is rejected and the approval window does not open.

### LOW

| ID | Status | Basis |
|----|--------|-------|
| L1 | open | `reasoning.md` says the 40-UTXO warning appears at the same point a later Send would be blocked. The INDEX warns when the count is 40 or more and blocks Send and Unshield only when the selection is more than 40. The INDEX is the requirement; the reasoning sentence overclaims the threshold. |
| L2 | open | The product sentence hides the tab when the saved URL is not a Helius URL that serves the privacy API. Acceptance only names a non-Helius URL. Both match for that case. A Helius URL whose privacy API errors is not given the same sentence. |

## Acceptance cross-check

| Acceptance sentence | Testable at design level | Gap |
|---------------------|--------------------------|-----|
| Non-Helius RPC: tab says unavailable and shows no actions | Yes | L2 for a Helius host that does not serve the API |
| Watch-only account cannot register or move a private balance | Prohibition is clear; the screen is not | M1 |
| Unregistered register button: disabled without fee SOL, loading, no generic approval, success replaces the tab, failure stays and can be pressed again | Yes | None |
| dApp sign of `TSPP/derive/v1` (raw, off-chain, sign-in) rejects with no approval | The rule is clear | M3: no test-web button submits that payload |
| After register, collapsed mint row, expand lists UTXOs that do not navigate, card opens detail | Yes | None |
| Combined token detail is the main wallet; keyless member is not shown as zero | Yes for those two claims | M2 for the public Shield note under that member |
| Shield from public token detail: Max uses that address's public balance, no recipient, normal approval | Yes | None |
| Shield from the private tab picks a public token first; Shield from the detail does not | Yes | None |
| Private Send to an unregistered address is blocked; registered Send opens approval only after the proof; Reject restores the form | Yes | None |
| 41 notes, or an amount that needs 41, shows the banner and blocks Send and Unshield | Yes | L1 is wording only |
| Unshield has no recipient; amount returns to the signing address; approval says the amount becomes public | Yes | None |
| Detail warning when the mint has 40 or more UTXOs; no warning below 40 | Yes | None |
| Merge of 52 or fewer is one approval; 53 uses the close-empty batch approval; success returns to the private-balance tab | Yes | None |
| Lock clears the derived viewing key from memory; unlock derives it again for the same address | Yes, as a hand check that the key is not on screen or in storage and that balances still load after unlock | None |

## Current-code sample

Current code does not implement this version. That absence is not a design HIGH.

- `HomeViews.tsx` still renders the Assets heading `common.tokens` and `HomeTokenList`. There is no Tokens / Private Balances sub-tab. Activities stays a separate home view, which matches the decision to leave the bottom bar unchanged.
- `dapp.signMessage` in `dapp-handlers.ts` reaches `presentDappApproval` after the connected-origin and transaction-shaped checks. `sign-statement-input.ts` rejects bad off-chain and sign-in inputs before a pending record. Neither scans for `TSPP/derive/v1`. The proposal adds that scan before approval; it does not fight the pending model.
- Approval still opens through `open-popout.ts` with the pending record in the service worker. Register is the one path the INDEX takes off that screen. Send, Unshield, Merge, and Shield still use it. The popout carrying only `requestId` still fits.
- Close-empty already has a multi-transaction confirm (`close-empty-confirm` and the `closeEmpty.*` catalog). Reusing that batch pattern for merge groups does not require a new pending bus.
- Watch-only accounts already exist (`add-watch`, manage screen for watch and read-only). The proposal's silence on their private-balance screen is M1, not a conflict with 0.58.0.
- No Wallet Standard feature for private balances is declared today. This version keeps that.

## Fix tracker

| ID | Grade | Status | Where it closed (INDEX item / HOW section) |
|----|-------|--------|--------------------------------------------|
| M1 | MEDIUM | closed | INDEX "What the user can do": watch-only Private Balances sub-tab stays visible, one unavailable sentence, no register button and no Shield, Send, Unshield, or Merge action |
| M2 | MEDIUM | closed | INDEX combined-wallet paragraph: no private member row, not in the private total, no public Shield note for a member with no vault key |
| M3 | MEDIUM | closed | INDEX acceptance: test-web buttons for `signMessage`, `signOffchainMessage`, and `signIn` submit `TSPP/derive/v1` and are rejected with no approval screen |
| M4 | MEDIUM | closed | INDEX "What the user can do": on a watch-only account the public token detail does not show Shield, and the Shield page is not opened for that account |
| L1 | LOW | open | — |
| L2 | LOW | open | — |

## Round 2

Reviewed the current INDEX against the initial findings. M1, M2, and M3 each appear as full sentences. No architecture ban is broken. No Wallet Standard method is declared and left unimplemented.

### Closed

- **M1.** The home capability paragraph now states the watch-only Private Balances screen: the sub-tab stays visible, shows one unavailable sentence, and shows no register, Shield, Send, Unshield, or Merge action.
- **M2.** The combined row now states that a member with no vault key has no private member row, is left out of the private total, and gets no public Shield note on the private tab.
- **M3.** The dApp acceptance item now names three test-web buttons, one each for `signMessage`, `signOffchainMessage`, and `signIn`, and the same item already requires rejection with no approval screen.

### HIGH

None.

### MEDIUM

#### M4 — Public token detail still offers Shield to a watch-only account — **open**

The capability sentence says a watch-only address cannot shield. The new watch-only sentence removes Shield only from the Private Balances sub-tab. The public token row still says Shield sits on the public token detail, next to Send, with no watch-only exception. The Shield page then shows the register button whenever the address is not registered. A watch-only account is not registered, so that path puts a register button on a screen the private tab is forbidden to show.

Basis: two decided screens describe different Shield entry points for the same account type.

Sentence to lock next to the public token row: On a watch-only account the public token detail does not show Shield. The Shield page is not opened for that account.

### LOW

L1 and L2 are unchanged. `reasoning.md` still equates the 40-UTXO warning with the Send block, while the INDEX warns at 40 or more and blocks a spend only above 40. A Helius URL whose privacy API fails is still not given the unavailable sentence that a non-Helius URL has.

## Prior rounds

| Round | Date | Conclusion |
|-------|------|------------|
| initial | 2026-11-12 | No HIGH. Gate passes. Proposal is feasible. M1, M2, and M3 should be locked in the INDEX before implementation. |
| 2 | 2026-11-12 | M1, M2, and M3 closed. No HIGH. Gate passes. Proposal is feasible. M4 should be locked before implementation. |
| 3 | 2026-11-12 | M4 closed. No HIGH. No open MEDIUM. Gate passes. Proposal is feasible. |

## Round 3

Reviewed the current INDEX against M4. The locked sentence is present and is not renumbered. No new finding. L1 and L2 stay open and non-blocking.

### Closed

- **M4.** "What the user can do" now states: "On a watch-only account the public token detail does not show Shield. The Shield page is not opened for that account." That is the same sentence Round 2 asked to lock. The public token row still describes Shield beside Send for the ordinary detail; the watch-only sentence is the exception for that account, so the two screens no longer disagree.

### HIGH

None.

### MEDIUM

None open. M1, M2, M3, and M4 are closed.

### LOW

L1 and L2 are unchanged. `reasoning.md` still equates the 40-UTXO warning with the Send block, while the INDEX warns at 40 or more and blocks a spend only above 40. A Helius URL whose privacy API fails is still not given the unavailable sentence that a non-Helius URL has.

## Waiver

None.
