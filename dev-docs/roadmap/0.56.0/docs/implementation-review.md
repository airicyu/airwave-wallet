# 0.56.0 — implementation-review

- Date: 2026-11-05 (Asia/Hong_Kong)
- Round: **re-review 1** (appended below). Round 1 text stays. Do not renumber IDs.
- Role: Implementation review. No code changes, no INDEX/HOW edits, no commit.
- Baseline: [`../INDEX.md`](../INDEX.md) decided sentences + acceptance; [`how.md`](./how.md); architecture bans in [`../../GUIDELINES.md`](../../GUIDELINES.md).
- Scope: Working tree against `HEAD` (`aebedfa`). Untracked protocol files: `wallet/src/shared/tx/offchain-message-v1.ts`, `wallet/src/shared/tx/siws-statement.ts`, `wallet/src/background/handlers/sign-statement-input.ts`.

## Round 1 (2026-11-05)

**Summary:** Tracks in HANDOFF (protocol, service worker, inject, approval, catalog, test-web) are present and match HOW on the single-input path. Pending stays in the service worker and the result is sent with the originating `tabId` and `frameId`. No `@solana/offchain-messages` import was added. `signMessage` still owns the transaction-as-message refusal. **`cd wallet && npm run typecheck` exit 0. `cd test/test-web && npm run build` exit 0.** No full-suite test command. Hand-tests named in INDEX were not walked.

### Match to how.md

| Step | Result |
|------|--------|
| Commands `dapp.signOffchainMessage` / `dapp.signIn`, pending kinds, `uiHost: "popout"`, `ui.getPending` / `ui.resolvePending` / `ui.abortPending` | Done |
| Malformed input rejected before `addPending`; error only to that tab | Done for one input |
| Off-chain feature `1.0.0` + `supportedMessageVersions: [1]` on the wallet map and `account.features` | Done |
| Version 1 bytes in-extension: `0xff` + `solana offchain`, version `1`, signer count, sorted 32-byte keys, UTF-8 body; detached ed25519; `signedOffchainMessage`, `signature`, `signatureType: "ed25519"` | Done |
| Each off-chain input is one output; a bad input rejects that call with nothing signed | Different — see 056-H01 |
| Approval reuses the readable Sign message card; text and collapsed hex are the `message` string, not the preamble; no signer list; no transaction-as-message state | Done |
| `signIn` `1.1.0` only; SIWS composed in the service worker; address line is the frozen account; popout title Sign in | Done |
| Absent `useOffchainMessage` signs the statement text and omits `signedMessageFormat`; `{ messageVersion: 1 }` wraps that text and sets the format | Done |
| Other `useOffchainMessage` shapes rejected before enqueue | Done |
| Empty optional strings omitted like a missing field | Different — see 056-M01 |
| Labeled lines each ended by LF | Different on the final labeled line — see 056-M02 |
| Catalog key for the Sign in title in three locales; Sign message title and Message payload label unchanged | Done |
| test-web: one off-chain button; plain Sign in; Sign in with statement, uri, version, nonce, issuedAt, and `useOffchainMessage` | Done |
| `npm run typecheck` and test-web `npm run build` | Done this round |
| Hand-test the three buttons, existing signMessage cases, close, and reload | Not run |

### Findings

| ID | Sev | Status | Notes |
|----|-----|--------|-------|
| 056-H01 | HIGH | Closed (re-review 1) | HOW: each off-chain input becomes one output, and if any input fails the INDEX checks the call rejects and nothing is signed. `airwaveWallet.features[solana:signOffchainMessage].signOffchainMessage` sends one `dapp.signOffchainMessage` per input and pushes the signature before the next input. A later invalid input throws after an earlier input was already approved and signed. |
| 056-M01 | MEDIUM | Closed (re-review 1) | INDEX: an empty string is omitted, the same as a missing field. `prepareSignInPayload` treats `""` on statement, uri, version, chainId, nonce, issuedAt, expirationTime, notBefore, or requestId as `INVALID_INPUT` and does not enqueue. |
| 056-M02 | MEDIUM | Closed (re-review 1) | INDEX: each present labeled line is ended by LF. `composeSiwsStatement` joins with `\n` and does not add a trailing LF after the last labeled line when `resources` is absent. Field order, the address line, the statement blank line, and `Resources:` entries match. |
| 056-M03 | MEDIUM | Open (ship gate) | INDEX acceptance checkboxes are still open. This round did not load an unpacked extension. Close, reload, UTF-8 versus hex versus transaction-as-message, and the two Sign in byte formats are not evidenced in-repo. HANDOFF says the hand-test has not been walked. |
| 056-L01 | LOW | Open | `signIn` in `wallet/src/inject/wallet.ts` sets output `account` from the live page key (`accountFromPublicKey`). The service worker freezes `signAccountId` and the address line at enqueue. They match while the connected account does not change during the popout. |
| 056-L02 | LOW | Open (expected) | Shipped version strings remain `0.55.0` (`wallet/package.json` typecheck banner). INDEX status is `in progress`. |
| 056-L03 | LOW | Open (informational) | No full-suite test command. INDEX names `cd wallet && npm run typecheck` and `cd test/test-web && npm run build` only. Do not assume `bun test`. |

**Open HIGH:** 056-H01.

### Contract spot-check

| Check | Result |
|-------|--------|
| Pending only in the service worker; popout carries `requestId`; UI does not hydrate the payload from `chrome.storage` | Pass |
| Reply via `sendBridgeResult(tabId, msg, pending.frameId)` | Pass |
| Close / `ui.abortPending` finishes `signOffchainMessage` and `signIn` with `approved: false` | Pass (static) |
| Reload drops in-memory pending | Pass (static); not hand-tested |
| No hard-coded password; unlock material not newly persisted | Pass |
| No JavaScript `number` arithmetic on lamports or token amounts in this diff | Pass |
| Version 1 domain `0xff` + ASCII `solana offchain`, version byte, count byte, sorted keys, UTF-8 body | Pass (`offchain-message-v1.ts`, `cmp32` unsigned byte order, duplicate and >255 and missing-account checks) |
| Off-chain card bytes are `TextEncoder` of `message` only | Pass (`bytesFromSignMessage`) |
| `signMessage` `messageLooksLikeTx` path unchanged; new kinds do not set that flag | Pass |
| `signatureType: "ed25519"` on both outputs; plain Sign in omits `signedMessageFormat` | Pass |
| New catalog key `approval.signIn` in zh-Hant, zh-Hans, en | Pass |
| Direct dependency `@solana/offchain-messages` | Pass (not added; lockfile hits are existing transitive entries) |
| test-web buttons and log of bytes plus signature | Pass (source) |

### INDEX acceptance

| Acceptance line | Result | Evidence |
|-----------------|--------|----------|
| `cd wallet && npm run typecheck` | Pass | Exit code 0 (2026-11-05) |
| `cd test/test-web && npm run build` | Pass | Exit code 0 (2026-11-05) |
| Off-chain button opens Sign message, shows the UTF-8 string, returns `signedOffchainMessage` starting at `0xff` and a 64-byte signature | Not run | Button and encoder match statically. Signature length is detached ed25519. |
| Readable `signMessage` card, binary hex, transaction refused | Not run | `sign-message.ts` still branches on `messageLooksLikeTx` / `isDisplayableUtf8`. No product change in that path. |
| Plain Sign in shows the statement, signs that text, no `signedMessageFormat` | Not run | `finishSignIn` encodes `statementText` and spreads the format only when `offchain` |
| `useOffchainMessage` shows the same statement, format `{ kind: "offchainMessage", messageVersion: 1 }`, bytes start with `0xff` | Not run | Same statement text; wrap uses `encodeOffchainMessageV1([publicKey], statementText)` |
| Closing either popout rejects; a reload does not resurrect it | Not run | Abort and in-memory pending match statically |

**Note:** No full-suite test command.

### Test results

Executed this round.

| Command | cwd | Exit code |
|---------|-----|-----------|
| `npm run typecheck` | `wallet/` | 0 |
| `npm run build` | `test/test-web/` | 0 |

Hand-tests are manual and were not walked.

### Fix / follow-up tracking

| ID | Status | Tracking |
|----|--------|----------|
| 056-H01 | Closed (re-review 1) | `signOffchainMessage` checks every input before the first `bridgeRequest`. |
| 056-M01 | Closed (re-review 1) | `optionalString` maps `""` to omitted. |
| 056-M02 | Closed (re-review 1) | Last labeled line gets a trailing LF when `resources` is absent. |
| 056-M03 | Open | Walk INDEX hand-tests on an unpacked extension. |
| 056-L01 | Open | Return the frozen signer as `account` if the page key can change mid-request. |
| 056-L02 | Open | Bump version files when the user ships. |
| 056-L03 | Open | Informational only. |

## Verdict: accept with fixes

## Re-review 1 (2026-11-05)

- Date: 2026-11-05 (Asia/Hong_Kong)
- Working tree compared with INDEX, HOW, reasoning, HANDOFF, and this file. No code changes.
- HANDOFF still says the unpacked-extension hand-test has not been walked. This round did not walk it.

**Summary:** 056-H01, 056-M01, and 056-M02 now match INDEX. `signOffchainMessage` validates every input, then sends `dapp.signOffchainMessage`. `optionalString` treats `""` as omitted. `composeSiwsStatement` appends LF after the last labeled line when `resources` is absent. 056-M03 stays open. **`cd wallet && npm run typecheck` exit 0. `cd test/test-web && npm run build` exit 0.**

### Closed this round

| ID | Why it matches INDEX |
|----|----------------------|
| 056-H01 | `wallet/src/inject/wallet.ts` `signOffchainMessage` rejects version, empty message, empty or >255 signers, non-32-byte keys, duplicates, and a missing account key before any `bridgeRequest`. |
| 056-M01 | `prepareSignInPayload` uses `optionalString`: `null` and `""` become omitted; a non-string is still `INVALID_INPUT`. |
| 056-M02 | When labeled lines exist and `resources` is empty, `composeSiwsStatement` returns `` `${text}\n` ``. |

### Still open

| ID | Sev | Status | Notes |
|----|-----|--------|-------|
| 056-M03 | MEDIUM | Open (ship gate) | User walked Sign in full on 2026-11-05 and accepted the nine-line card. Off-chain bytes, Sign in short, existing `signMessage` cases, close, and reload are still unchecked. |
| 056-L01 | LOW | Open | `signIn` still sets output `account` from `accountFromPublicKey()` at reply time. |
| 056-L02 | LOW | Open (expected) | `wallet/package.json` is still `0.55.0`. INDEX status is `in progress`. |
| 056-L03 | LOW | Open (informational) | No full-suite test command. |

**Open HIGH:** none.

**Open MEDIUM:** 056-M03.

### Contract spot-check (unchanged behavior)

Pending for both kinds is still created only after `prepareOffchainPayload` / `prepareSignInPayload` succeeds, with `signAccountId` frozen. Approve and abort call `finishSignOffchainMessage` / `finishSignIn` and `sendBridgeResult` with that tab and `frameId`. Off-chain card bytes are still `TextEncoder` of `message`. Sign-in card bytes are `statementText`. Plain sign-in omits `signedMessageFormat`. Version 1 wrap still starts at the `0xff` domain. Catalog key `approval.signIn` is still in zh-Hant, zh-Hans, and en. test-web still has the three buttons. `@solana/offchain-messages` was not added.

### Test results

| Command | cwd | Exit code |
|---------|-----|-----------|
| `npm run typecheck` | `wallet/` | 0 |
| `npm run build` | `test/test-web/` | 0 |

Hand-tests were not walked.

## Verdict: accept with fixes
