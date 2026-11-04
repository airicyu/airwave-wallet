# `solana:signIn` — backlog

Scheduled in [0.56.0](../0.56.0/INDEX.md). **Not a contract.** That INDEX wins.

## Current

The extension does not advertise `solana:signIn`. A site that signs the user in with Sign In With Solana cannot use Airwave for that feature. `signMessage` remains the raw-byte path. [`signOffchainMessage`](./sign-offchain-message.md) is a separate unscheduled item and does not add `signIn`.

`solana:signIn` (`@solana/wallet-standard-features`) takes Sign In With Solana fields, not message bytes and not an `account`. The wallet composes the statement, the user approves that statement, and the wallet returns the account, the bytes it signed, and one ed25519 signature. Feature version `1.0.0` signs the statement text. Version `1.1.0` also accepts `useOffchainMessage: { messageVersion: 1 }` and then signs a version 1 off-chain message whose body is that same statement.

## Intent

Advertise `solana:signIn` at version `1.1.0`. Add a Sign in approval popout. The site submits the optional fields (`domain`, `address`, `statement`, `uri`, `version`, `chainId`, `nonce`, `issuedAt`, `expirationTime`, `notBefore`, `requestId`, `resources`, and `useOffchainMessage`). The service worker builds the SIWS text. When `domain` or `address` is omitted, the wallet fills them (the page origin, and the account that will sign). Omitted optional lines are left out of the statement. The popout shows that composed statement in the message card, with the site and the frozen account. The title is Sign in. The user approves or rejects that statement. The user does not choose the signature format.

The format is fixed before approve:

- No `useOffchainMessage`: sign the SIWS text bytes. Return `account`, `signedMessage`, and `signature`.
- `useOffchainMessage: { messageVersion: 1 }`: wrap that same text as a version 1 off-chain message (domain, version, the signing account as the only required signer, then the UTF-8 statement) and sign those bytes. Return the same three fields plus `signedMessageFormat: { kind: "offchainMessage", messageVersion: 1 }`. `signedMessage` is the full off-chain byte string.

Reject any other `useOffchainMessage` shape before enqueue. Close or reject does not sign. Pending stays in the service worker. The account in the output is the one that signed; it may differ from an `address` the site sent.

This item does not advertise `solana:signOffchainMessage`. It only builds a version 1 off-chain message for this sign-in path.

`test/test-web/` gets one Sign in button for the plain statement and one that sets `useOffchainMessage`. Each shows the returned account, signed bytes, and signature.

## Decide before scheduling

- The exact SIWS line layout (field order, ABNF) the wallet writes, so a verifier rebuilds the same bytes.
- Which account is the default signer when the site omits `address`, and whether the popout lets the user switch account before approve.
- Catalog keys for the Sign in copy (`t(locale, key)`, three languages). Do not hard-code one language.
- Share the version 1 preamble builder with [`sign-offchain-message.md`](./sign-offchain-message.md) if that item is scheduled in the same version. This item still owns the sign-in screen and the `signIn` feature.

## Out of scope

- `solana:signOffchainMessage` as its own feature
- Changing `solana:signMessage`
- Sign-in version `1.0.0` only (this item advertises `1.1.0`, which includes the plain statement path)
- A control on the approval screen that lets the user pick raw text versus an off-chain message
- Hardware wallets and cold-wallet display
