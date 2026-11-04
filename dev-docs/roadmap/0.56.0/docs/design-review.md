# Design review — 0.56.0 Airwave Wallet

- Date: 2026-11-05 (Asia/Hong_Kong)
- Round: **initial**
- Role: design review (does not edit INDEX / HOW / reasoning / HANDOFF / code; this file is not the contract)
- Baseline: decided sentences and acceptance in [`../INDEX.md`](../INDEX.md); [`reasoning.md`](./reasoning.md); [`how.md`](./how.md). No HANDOFF. Upstream [0.55.0](../../0.55.0/INDEX.md) is shipped and changes no wallet behavior. Backlog [`sign-offchain-message.md`](../../backlog/sign-offchain-message.md) and [`sign-in.md`](../../backlog/sign-in.md) are ideas only; this INDEX wins.
- Architecture bans: [`../../GUIDELINES.md`](../../GUIDELINES.md) section 4
- Current-code sample: `wallet/src/inject/wallet.ts`, `wallet/src/approval/dom/sign-message.ts`, `wallet/src/background/handlers/dapp-handlers.ts`, `wallet/src/background/pending/pending.ts`, `wallet/src/flow/pending-page.ts`
- **Verdict:** open HIGH remains. The review gate does not pass. The proposal is feasible once H1 is locked.

## Findings (this round)

Closed = written into INDEX / HOW / HANDOFF. Open = the contract still diverges. Non-blocking = record only.

### HIGH
#### H1 — Sign-in address line can name a different key than the signer — **open**
INDEX Sign-in statement copies a site-supplied `address` into the SIWS text, and Sign-in account says the output account "may differ from an `address` the site sent." Those bytes are what Approve signs. A verifier checks the signature against the address inside the statement, so a mismatched line does not verify. The plain test-web button omits `address`, so acceptance can pass while this path cannot.

Write this into the decided section (one lock): "The address line is always the base58 address of the frozen signing account. If the site sends a different address, replace it with that account before composing the statement. The output `account` is that signer."

### MEDIUM
| ID | Status | Basis |
|----|--------|-------|
| M1 | open | `wallet.ts` advertises features on the wallet object and again on `account.features`. INDEX and HOW name the wallet feature map only. Wallet Standard callers that read `account.features` will not see `solana:signOffchainMessage` or `solana:signIn` unless that list is updated in the same change. |
| M2 | open | Off-chain UI says "No hex card." HOW reuses the readable `signMessage` body. `renderSignMessageBody` always adds a raw-hex disclosure under a UTF-8 card. Lock reuse of the text card only, or allow that existing disclosure for the UTF-8 `message` (not the preamble). |
| M3 | open | The statement cell's append steps do not insert the blank line that the same cell requires before the first labeled line. `Resources:` has no rule for a leading break when the statement is present and no labeled line is present, so the body can glue to `Resources:`. |
| M4 | open | A missing `domain` is "the page host, with no scheme and no path." The handler's `origin` also carries a port. Lock hostname only, or hostname plus a non-default port, and whether the host comes from the originating frame. |

### LOW
| ID | Status | Basis |
|----|--------|-------|
| L1 | open | An empty-string `statement` is "present" under the blank-line rules and would insert a blank statement. Say whether empty is omitted. |
| L2 | open | "Signer-count byte" cannot represent more than 255 keys. Reject that input before enqueue, or state the maximum. |

## Acceptance cross-check
| Acceptance sentence | Testable at design level | Gap |
|---------------------|--------------------------|-----|
| `cd wallet && npm run typecheck` | Yes | None |
| `cd test/test-web && npm run build` | Yes | None |
| test-web off-chain button opens Sign message, shows the UTF-8 string, and returns `signedOffchainMessage` whose first byte is `0xff` plus a 64-byte signature | Yes | M2: "no hex card" vs the current readable body |
| A readable `signMessage` still shows the same card. A binary `signMessage` still shows hex. A transaction passed to `signMessage` is still refused | Yes | None. Out of scope keeps that path |
| test-web plain Sign in shows the composed statement, signs that text, and does not set `signedMessageFormat` | Yes for the no-field button | H1 if a site sends `address`. M3/M4 do not block this button |
| test-web Sign in with `useOffchainMessage` shows the same statement and returns `signedMessageFormat` with `kind: "offchainMessage"` and `messageVersion: 1`. The signed bytes start with `0xff` | Yes | Same statement rules as the plain button. HOW's second button also sends `statement`, `uri`, `version`, `nonce`, `issuedAt` |
| Closing either popout rejects the request. A reload does not resurrect it | Yes | Matches in-memory pending. HOW adds the reload-while-open check |

## Current-code sample
Current code does not implement this version. That is not a design HIGH.

`airwaveWallet.features` implements `solana:signMessage`, `solana:signTransaction`, and `solana:signAndSendTransaction` only. `accountFromPublicKey` repeats that feature list. No `signOffchainMessage` or `signIn` command exists.

`dapp.signMessage` rejects before enqueue on its own gates, then stores one in-memory pending record with `signAccountId` set to the active account, `uiHost` chosen by the existing presenter, and `tabId` / `frameId` / `origin`. `pending.ts` keeps that map in the service worker. The popout binding is `requestId` only. Finish responds on that tab and frame. The proposal uses the same pending map and the same detached sign. It does not hydrate pending from `chrome.storage`, broadcast the result, or put a long-lived key in the inject script.

`pending-page.ts` maps `signMessage` to the sign-message screen and has no sign-in kind yet. `renderSignMessageBody` shows the UTF-8 card and, under it, a hex disclosure. Off-chain reuse collides with INDEX "No hex card" (M2). It also has the transaction-as-message refusal, which this version keeps for `signMessage` only.

No proposal sentence conflicts with the architecture bans. Pending stays in the service worker. Results stay on the originating tab. No hardcoded password. No unimplemented Wallet Standard method is required by the current code; the new methods are the work of this version.

## Fix tracker
| ID | Grade | Status | Where it closed |
|----|-------|--------|-----------------|
| H1 | HIGH | open | |
| M1 | MEDIUM | open | |
| M2 | MEDIUM | open | |
| M3 | MEDIUM | open | |
| M4 | MEDIUM | open | |
| L1 | LOW | open | |
| L2 | LOW | open | |

## Prior rounds
| Round | Date | Conclusion |
|-------|------|------------|
| (none) | | Initial round. No earlier findings to re-check. |

---

# Design review — 0.56.0 Airwave Wallet

- Date: 2026-11-05 (Asia/Hong_Kong)
- Round: **re-review 1**
- Role: design review (does not edit INDEX / HOW / reasoning / HANDOFF / code; this file is not the contract)
- Baseline: decided sentences and acceptance in [`../INDEX.md`](../INDEX.md); [`reasoning.md`](./reasoning.md); [`how.md`](./how.md). No HANDOFF. Upstream [0.55.0](../../0.55.0/INDEX.md) is shipped. Backlog sign-offchain and sign-in notes are ideas only; this INDEX wins.
- Architecture bans: [`../../GUIDELINES.md`](../../GUIDELINES.md) section 4
- Current-code sample: `wallet/src/inject/wallet.ts`, `wallet/src/approval/dom/sign-message.ts`, `wallet/src/background/pending/pending.ts` (unchanged since the initial sample; this version is not implemented)
- **Verdict:** no open HIGH. The review gate passes. The proposal is feasible. M5 should be fixed before implementation so a non-32-byte signer cannot pass the enqueue checks.

## Findings (this round)

Closed = the decided sentence is in INDEX or HOW. IDs are not renumbered.

### HIGH
#### H1 — Sign-in address line can name a different key than the signer — **closed**
INDEX Sign-in statement now says the address line is always the base58 address of the frozen signing account, and a different site address is replaced before composing. Sign-in account says the output `account` is that signer and its address is the address line. HOW repeats that the address line is the frozen account when the site sent another address.

### MEDIUM
| ID | Status | Basis |
|----|--------|-------|
| M1 | closed | INDEX Off-chain feature and Sign-in feature, and HOW, put both features on the wallet feature map and on each account's `features` list. |
| M2 | closed | INDEX Off-chain UI and HOW say the collapsed raw disclosure shows the UTF-8 `message` bytes and does not show the preamble. |
| M3 | closed | INDEX Sign-in statement appends one blank line when any labeled field or `resources` is present, then the labeled lines, then `Resources:` only when that list is non-empty. |
| M4 | closed | INDEX Sign-in statement sets `domain` to the originating frame's host, with no scheme and no path, and appends `:` plus the port only when that port is present and is not 80 or 443. |
| M5 | open | INDEX Off-chain input defines `requiredSigners` as 32-byte keys, but the reject-before-enqueue list names an empty list, duplicates, a missing `account.publicKey`, and a count above 255. It does not say a key whose length is not 32 bytes is rejected. HOW repeats "no duplicate 32-byte keys" and does not add that reject. Lock this sentence in the decided section: "Reject before enqueue when any `requiredSigners` entry is not 32 bytes." |

### LOW
| ID | Status | Basis |
|----|--------|-------|
| L1 | closed | INDEX says an empty string is omitted, the same as a missing field, and a statement is appended only when it is a non-empty string. |
| L2 | closed | INDEX and HOW reject a signer count greater than 255 before enqueue. |

No new LOW this round.

## Acceptance cross-check
| Acceptance sentence | Testable at design level | Gap |
|---------------------|--------------------------|-----|
| `cd wallet && npm run typecheck` | Yes | None |
| `cd test/test-web && npm run build` | Yes | None |
| test-web off-chain button opens Sign message, shows the UTF-8 string, and returns `signedOffchainMessage` whose first byte is `0xff` plus a 64-byte signature | Yes | The button uses one 32-byte signer, so it does not exercise M5 |
| A readable `signMessage` still shows the same card. A binary `signMessage` still shows hex. A transaction passed to `signMessage` is still refused | Yes | Out of scope keeps that path |
| test-web plain Sign in shows the composed statement, signs that text, and does not set `signedMessageFormat` | Yes | Address replacement is specified and is not on this button |
| test-web Sign in with `useOffchainMessage` shows the same statement and returns `signedMessageFormat` with `kind: "offchainMessage"` and `messageVersion: 1`. The signed bytes start with `0xff` | Yes | HOW's second button also sends `statement`, `uri`, `version`, `nonce`, `issuedAt` |
| Closing either popout rejects the request. A reload does not resurrect it | Yes | HOW checks close and reload-while-open. Pending stays in service-worker memory |

## Current-code sample
Current code does not implement this version. That is not a design HIGH.

`airwaveWallet.features` still implements `solana:signMessage`, `solana:signTransaction`, and `solana:signAndSendTransaction` only. `signMessage` already walks inputs in order and sends one `dapp.signMessage` per input. HOW's "each input becomes one output, in order" matches that shape. No `signOffchainMessage` or `signIn` method is advertised, so the proposal does not declare an unimplemented Wallet Standard method in current code.

Pending for the existing sign path stays in the service worker. The popout binding is `requestId`. The result returns on the originating tab and frame. This version uses that pending map, does not hydrate pending from `chrome.storage`, does not broadcast, and does not put a long-lived key in the inject script. No hardcoded password. No proposal sentence overrides a GUIDELINES section 4 ban.

## Fix tracker
| ID | Grade | Status | Where it closed |
|----|-------|--------|-----------------|
| H1 | HIGH | closed | INDEX Sign-in statement and Sign-in account; HOW Sign in |
| M1 | MEDIUM | closed | INDEX Off-chain feature and Sign-in feature; HOW Off-chain message and Sign in |
| M2 | MEDIUM | closed | INDEX Off-chain UI; HOW Off-chain message |
| M3 | MEDIUM | closed | INDEX Sign-in statement |
| M4 | MEDIUM | closed | INDEX Sign-in statement |
| M5 | MEDIUM | open | |
| L1 | LOW | closed | INDEX Sign-in statement |
| L2 | LOW | closed | INDEX Off-chain input; HOW Off-chain message |

## Prior rounds
| Round | Date | Conclusion |
|-------|------|------------|
| initial | 2026-11-05 | Open HIGH H1. Gate did not pass. |
| re-review 1 | 2026-11-05 | H1 and M1–M4 and L1–L2 are in INDEX or HOW. No open HIGH. Gate passes. M5 remains. |

---

# Design review — 0.56.0 Airwave Wallet

- Date: 2026-11-05 (Asia/Hong_Kong)
- Round: **re-review 2**
- Role: design review (does not edit INDEX / HOW / reasoning / HANDOFF / code; this file is not the contract)
- Baseline: decided sentences and acceptance in [`../INDEX.md`](../INDEX.md); [`reasoning.md`](./reasoning.md); [`how.md`](./how.md). No HANDOFF. Upstream [0.55.0](../../0.55.0/INDEX.md) is shipped. Backlog sign-offchain and sign-in notes are ideas only; this INDEX wins.
- Architecture bans: [`../../GUIDELINES.md`](../../GUIDELINES.md) section 4
- Current-code sample: `wallet/src/inject/wallet.ts`, `wallet/src/approval/dom/sign-message.ts` (this version is not implemented)
- **Verdict:** no open HIGH. No open MEDIUM that should be fixed. The review gate passes. The proposal is feasible.

## Findings (this round)

Closed = the decided sentence is in INDEX or HOW. IDs are not renumbered.

### HIGH
#### H1 — Sign-in address line can name a different key than the signer — **closed**
INDEX Sign-in statement still replaces a different site address with the frozen signing account before composing. Sign-in account still says the output `account` is that signer. HOW Sign in still says the address line is the frozen account when the site sent another address.

### MEDIUM
| ID | Status | Basis |
|----|--------|-------|
| M1 | closed | INDEX Off-chain feature and Sign-in feature, and HOW, still put both features on the wallet feature map and on each account's `features` list. |
| M2 | closed | INDEX Off-chain UI and HOW still limit the collapsed raw disclosure to the UTF-8 `message` bytes and exclude the preamble. |
| M3 | closed | INDEX Sign-in statement still appends one blank line when any labeled field or `resources` is present, then the labeled lines, then `Resources:` only when that list is non-empty. |
| M4 | closed | INDEX Sign-in statement still sets `domain` from the originating frame's host and appends `:` plus the port only when that port is present and is not 80 or 443. |
| M5 | closed | INDEX Off-chain input rejects before enqueue when any key is not 32 bytes. HOW Off-chain message rejects the call when a required signer is not 32 bytes, and says a failing input follows those INDEX checks. |

No new MEDIUM this round.

### LOW
| ID | Status | Basis |
|----|--------|-------|
| L1 | closed | INDEX still omits an empty string the same way as a missing field, and appends `statement` only when it is a non-empty string. |
| L2 | closed | INDEX and HOW still reject a signer count greater than 255 before enqueue. |
| L3 | open | HOW Sign in says each input becomes one output, in order. INDEX does not say `signIn` is a list. The existing `signMessage` method is variadic and returns an array; `solana:signIn` in `@solana/wallet-standard-features` takes one optional input and returns one output object. test-web sends one object per button. Record only. Acceptance `typecheck` against that feature type keeps the unary shape. |

## Acceptance cross-check
| Acceptance sentence | Testable at design level | Gap |
|---------------------|--------------------------|-----|
| `cd wallet && npm run typecheck` | Yes | None |
| `cd test/test-web && npm run build` | Yes | None |
| test-web off-chain button opens Sign message, shows the UTF-8 string, and returns `signedOffchainMessage` whose first byte is `0xff` plus a 64-byte signature | Yes | None. The button uses one 32-byte signer. The non-32-byte reject is now in INDEX and HOW (M5) |
| A readable `signMessage` still shows the same card. A binary `signMessage` still shows hex. A transaction passed to `signMessage` is still refused | Yes | Out of scope keeps that path |
| test-web plain Sign in shows the composed statement, signs that text, and does not set `signedMessageFormat` | Yes | Address replacement is specified and is not on this button |
| test-web Sign in with `useOffchainMessage` shows the same statement and returns `signedMessageFormat` with `kind: "offchainMessage"` and `messageVersion: 1`. The signed bytes start with `0xff` | Yes | HOW's second button also sends `statement`, `uri`, `version`, `nonce`, `issuedAt` |
| Closing either popout rejects the request. A reload does not resurrect it | Yes | HOW checks close and reload-while-open. Pending stays in service-worker memory |

## Current-code sample
Current code does not implement this version. That is not a design HIGH.

`airwaveWallet.features` still implements `solana:signMessage`, `solana:signTransaction`, and `solana:signAndSendTransaction` only. `signMessage` walks inputs and returns one output per input. No `signOffchainMessage` or `signIn` method is advertised, so current code does not declare an unimplemented Wallet Standard method.

`renderSignMessageBody` still shows a UTF-8 card and a hex disclosure under it. This version's off-chain screen reuses that card and limits the disclosure to the `message` bytes. The transaction-as-message refusal stays on `signMessage` only.

Pending for the existing sign path stays in the service worker. The popout binding is `requestId`. The result returns on the originating tab and frame. This version uses that pending map, does not hydrate pending from `chrome.storage`, does not broadcast, and does not put a long-lived key in the inject script. No hardcoded password. No proposal sentence overrides a GUIDELINES section 4 ban.

## Fix tracker
| ID | Grade | Status | Where it closed |
|----|-------|--------|-----------------|
| H1 | HIGH | closed | INDEX Sign-in statement and Sign-in account; HOW Sign in |
| M1 | MEDIUM | closed | INDEX Off-chain feature and Sign-in feature; HOW Off-chain message and Sign in |
| M2 | MEDIUM | closed | INDEX Off-chain UI; HOW Off-chain message |
| M3 | MEDIUM | closed | INDEX Sign-in statement |
| M4 | MEDIUM | closed | INDEX Sign-in statement |
| M5 | MEDIUM | closed | INDEX Off-chain input; HOW Off-chain message |
| L1 | LOW | closed | INDEX Sign-in statement |
| L2 | LOW | closed | INDEX Off-chain input; HOW Off-chain message |
| L3 | LOW | open | |

## Prior rounds
| Round | Date | Conclusion |
|-------|------|------------|
| initial | 2026-11-05 | Open HIGH H1. Gate did not pass. |
| re-review 1 | 2026-11-05 | H1 and M1–M4 and L1–L2 are in INDEX or HOW. No open HIGH. Gate passes. M5 remains. |
| re-review 2 | 2026-11-05 | M5 is in INDEX and HOW. No open HIGH. No open MEDIUM. Gate passes. L3 is record only. |
