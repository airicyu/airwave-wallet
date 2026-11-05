# 0.56.0 — Off-chain message and Sign In With Solana

- **Status:** `shipped`
- **Upstream:** [0.55.0](../0.55.0/INDEX.md) shipped. Absorbs nothing from [unversioned.md](../unversioned.md).
- **Backlog:** [signOffchainMessage](../backlog/sign-offchain-message.md), [solana:signIn](../backlog/sign-in.md). This INDEX wins.
- **Demo:** [sign-message-and-sign-in-ux.html](../../design-demos/0.56.0/sign-message-and-sign-in-ux.html). On conflict, this INDEX wins.

## Product

The wallet advertises `solana:signOffchainMessage` (feature `1.0.0`, message version `1`) and `solana:signIn` (feature `1.1.0`). `solana:signMessage` stays as it is.

An off-chain message approval uses the existing Sign message popout. The card shows the site's UTF-8 `message` string. The user is not asked to tell it from a readable `signMessage`.

Sign in is its own popout. It shows the SIWS statement the wallet composed, in the same message card. The user approves that statement. The site's `useOffchainMessage` flag chooses the bytes that are signed. The screen does not offer that choice.

## Docs

1. This file
2. [docs/reasoning.md](./docs/reasoning.md)
3. [docs/how.md](./docs/how.md)

## Decided

| Topic | Decision |
|-------|----------|
| Off-chain feature | `wallet/src/inject/wallet.ts` advertises `solana:signOffchainMessage` with `version: "1.0.0"` and `supportedMessageVersions: [1]` on the wallet feature map and on each account's `features` list. |
| Off-chain input | One input is `messageVersion: 1`, `account`, a non-empty `message` string, and a non-empty `requiredSigners` list of 32-byte public keys. Reject before enqueue when the version is not `1`, the message is empty or not a string, the signer list is empty, any key is not 32 bytes, a key is duplicated, `account.publicKey` is missing from the list, or the signer count is greater than 255. |
| Off-chain bytes | Sort `requiredSigners` by unsigned byte order of the raw 32-byte keys. Build version 1 in this extension. Do not add `@solana/offchain-messages`. The bytes are the 16-byte domain (`0xff` plus ASCII `solana offchain`), version byte `1`, signer-count byte, the sorted keys, then the UTF-8 body. Sign that full string with the account's ed25519 secret, the same detached sign as `signMessage`. Return `signedOffchainMessage` (those exact bytes), `signature`, and `signatureType: "ed25519"`. Other keys are only in the preamble. This call signs `account` only. |
| Off-chain UI | Same popout shell, title, message card, and approve / reject actions as a readable `signMessage`. The card text is the `message` string, not the signed byte string. The collapsed raw disclosure under that card shows those same message bytes. It does not show the preamble. There is no "cannot sign a transaction as a message" state and no required-signer list. Close or reject does not sign. The message card's line cap (`--card-lines`) is 9, one and a half times the previous 6. Sign in uses that same card. |
| Sign-in feature | Advertise `solana:signIn` at `1.1.0` on the wallet feature map and on each account's `features` list. Do not advertise `1.0.0` alone. This does not remove `signOffchainMessage`. |
| Sign-in statement | The service worker builds the SIWS text and the popout shows that text. `domain` is the originating frame's host. Append `:` and the port only when the port is present and is not 80 or 443. There is no scheme and no path. The address line is always the base58 address of the frozen signing account. If the site sends a different address, replace it before composing. An empty string is omitted, the same as a missing field. The text is `{domain} wants you to sign in with your Solana account:` then LF then the address. When `statement` is a non-empty string, append LF, LF, and the statement. When any labeled field or `resources` is present, append one blank line, then each present labeled line in this order, each ended by LF: `URI: `, `Version: `, `Chain ID: `, `Nonce: `, `Issued At: `, `Expiration Time: `, `Not Before: `, `Request ID: `. When `resources` is non-empty, append `Resources:` and, for each entry, LF, `- `, and that entry. When no labeled line and no resources are present, the text ends at the address line, or at the statement when that line exists. |
| Sign-in account | Freeze the signing account at enqueue, the same way `signMessage` freezes `signAccountId`. The popout does not switch accounts. The output `account` is that signer. Its address is the address line. |
| Sign-in bytes | No `useOffchainMessage`: sign the SIWS text. Return `account`, `signedMessage`, and `signature`. `useOffchainMessage: { messageVersion: 1 }`: wrap that same text as a version 1 off-chain message whose only required signer is the signing account, then sign those bytes. `signedMessage` is that full byte string. Also return `signedMessageFormat: { kind: "offchainMessage", messageVersion: 1 }`. Reject any other `useOffchainMessage` shape before enqueue. |
| Sign-in UI | Title is Sign in. The body is the composed SIWS statement in the same Message payload card as a readable message. Absent optional fields are omitted from that text. The two byte formats look the same. Close or reject does not sign. |
| Pending | Both requests live in the service worker. The result returns only to the originating tab. |
| Copy | New strings go through the message catalog, Traditional Chinese, Simplified Chinese, and English. |
| test-web | One button signs a version 1 off-chain message with the connected account as the only required signer. Sign in short sends no optional fields. Sign in full sends the labeled SIWS fields and does not set `useOffchainMessage`. Each shows the returned bytes and signature. |

## Out of scope

- Changing `solana:signMessage`, including its hex payload and the transaction-as-message refusal.
- Off-chain message version 0.
- `solana:signIn` version `1.0.0` as the advertised version.
- A control that lets the user pick raw text versus an off-chain message.
- Verifying another party's signature inside the wallet.
- Hardware wallets and cold-wallet display.
- Listing extra `requiredSigners` on the approval screen.

## Acceptance

- [x] `cd wallet && npm run typecheck`
- [x] `cd test/test-web && npm run build`
- [x] test-web off-chain button opens Sign message, shows the UTF-8 string, and returns `signedOffchainMessage` whose first byte is `0xff` plus a 64-byte signature. User e2e 2026-11-05.
- [x] A readable `signMessage` still shows the same card. A binary `signMessage` still shows hex. A transaction passed to `signMessage` is still refused. User e2e 2026-11-05.
- [x] test-web Sign in short shows the two-line statement, signs that text, and does not set `signedMessageFormat`. User e2e 2026-11-05.
- [x] test-web Sign in full shows the statement with the labeled fields, signs that text, and does not set `signedMessageFormat`. User walked the popout on 2026-11-05 and confirmed the nine-line card. User e2e 2026-11-05.
- [x] Closing either popout rejects the request. A reload does not resurrect it. User e2e 2026-11-05.

## Anchors

| Path | Role |
|------|------|
| `wallet/src/inject/wallet.ts` | Advertises both features |
| `wallet/src/approval/dom/sign-message.ts` | UTF-8 message card the off-chain body reuses |
| `test/test-web/src/main.ts` | New buttons |
| `dev-docs/design-demos/0.56.0/sign-message-and-sign-in-ux.html` | Concept only |

## Still to decide

(none)
