# 0.56.0 how

## Commands

Add `dapp.signOffchainMessage` and `dapp.signIn` to `AirwaveCommand` in `wallet/src/shared/protocol/commands.ts`. Add pending kinds `signOffchainMessage` and `signIn`. Both use `uiHost: "popout"`, the same pending map as `signMessage`, and `ui.getPending` / `ui.resolvePending` / `ui.abortPending`. The popout carries `requestId` only. The result goes back on that request to the originating tab and frame.

Reject a malformed input before enqueue. Do not store a pending record for it. The error returns only to that tab.

## Off-chain message

`wallet/src/inject/wallet.ts` implements `solana:signOffchainMessage` at feature version `1.0.0` with `supportedMessageVersions: [1]`, on the wallet feature map and on `account.features`. Each input becomes one output, in order. If any input fails the INDEX checks, including a required signer that is not 32 bytes or more than 255 required signers, the call rejects and nothing is signed.

The service worker checks `messageVersion`, the non-empty string `message`, and `requiredSigners` (non-empty, no duplicate 32-byte keys, contains `account.publicKey`). It sorts the keys by unsigned byte order and freezes `signAccountId`. The approval reuses the readable `signMessage` text card and its collapsed raw disclosure. Both show `message`, not the preamble. Approve builds the version 1 bytes in the extension, signs them with the existing detached ed25519 path, and returns `signedOffchainMessage`, `signature`, and `signatureType: "ed25519"`.

## Sign in

`signIn` is feature version `1.1.0` on the wallet feature map and on `account.features`. Each input becomes one output, in order. A bad `useOffchainMessage` rejects the call before enqueue. The address line is the frozen account even when the site sent another address.

The service worker fills `domain` and `address` as the INDEX says, composes the SIWS text, and freezes `signAccountId`. The Sign in popout title is Sign in. The card shows that text. Approve signs the text when `useOffchainMessage` is absent. When it is `{ messageVersion: 1 }`, approve wraps that same text as a version 1 off-chain message with only the signing account in `requiredSigners`, signs those bytes, and sets `signedMessageFormat`.

Catalog keys cover the Sign in title. The Sign message title and Message payload label stay the ones `signMessage` already uses.

## test-web

`test/test-web/src/main.ts` adds:

- One off-chain button. The message is a short UTF-8 string. `requiredSigners` is the connected account only.
- Sign in short sends no optional fields.
- Sign in full sends `statement`, `uri`, `version`, `chainId`, `nonce`, `issuedAt`, `expirationTime`, `notBefore`, `requestId`, and two `resources`. It does not set `useOffchainMessage`.

Each button prints the returned bytes and signature.

## Checks

`cd wallet && npm run typecheck`

`cd test/test-web && npm run build`

Hand-test the three buttons, plus one existing readable `signMessage`, one binary `signMessage`, and one transaction passed to `signMessage`. Close each new popout once and reload the extension while one is open. The pending request must be gone.
