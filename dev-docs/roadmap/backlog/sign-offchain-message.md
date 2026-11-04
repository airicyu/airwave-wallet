# `signOffchainMessage` — backlog

Scheduled in [0.56.0](../0.56.0/INDEX.md). **Not a contract.** That INDEX wins.

## Current

The extension advertises `solana:signMessage` and signs the raw bytes the site sends (`dapp.signMessage`). It does not advertise `solana:signOffchainMessage`. A site that wants a version 1 off-chain message falls back to raw `signMessage`, or skips Airwave when it requires the off-chain feature.

Off-chain message signing is specified by the Solana off-chain message format (version 1) and the Wallet Standard feature `solana:signOffchainMessage` (`@solana/wallet-standard-features`, feature version `1.0.0`). The site sends UTF-8 text plus the required signer public keys. The wallet builds the bytes, shows the text, signs, and returns those bytes with one ed25519 signature.

## Intent

Add `solana:signOffchainMessage` beside the existing raw `signMessage`. Keep `signMessage` as the fallback.

The feature reports `version: "1.0.0"` and `supportedMessageVersions: [1]`. Each input is `messageVersion: 1`, an `account`, a non-empty `message` string, and `requiredSigners`. The service worker rejects the request before enqueue when:

- `messageVersion` is not `1`
- `message` is empty or not a string
- `requiredSigners` is empty, contains a duplicate, or does not include `account.publicKey`

The wallet sorts `requiredSigners` lexicographically by the 32-byte public keys and builds the version 1 byte string: the 16-byte domain (`0xff` + `solana offchain`), version `1`, signer count, the sorted public keys, then the UTF-8 body. It signs that full string with the account's ed25519 secret (the same detached sign path as `signMessage`). It returns `signedOffchainMessage` (those exact bytes), `signature`, and `signatureType: "ed25519"`.

Other keys in `requiredSigners` are only listed in the preamble. This call signs `account` only.

Pending stays in the service worker. Approval reuses the `signMessage` popout: same shell, same "Sign message" title, same message card, same approve / reject actions. The user is not asked to tell the two features apart.

The card shows the site's `message` string with the same UTF-8 payload layout as a readable `signMessage`. The feature's message is UTF-8 text, so this screen always takes that layout. It has no hex payload and no "looks like a transaction" refusal. The signed byte string (domain, version, and signer keys) stays off the card. Extra keys in `requiredSigners` stay in the preamble only; the screen does not add a signer list. Close or reject does not sign.

`test/test-web/` gets one button that asks for a version 1 message with the connected account as the only required signer, and shows the returned bytes and signature.

## Decide before scheduling

- Encode the preamble in the extension, or add `@solana/offchain-messages` for the version 1 codec. Adding the package needs a stated reason.
- Whether a second required signer (this account plus a foreign public key) is in the first slice, or only the single-signer case ships first. The preamble rules stay the same either way.
- Catalog keys for the approval copy (`t(locale, key)`, three languages). Do not hard-code one language.

## Out of scope

- Removing or changing `solana:signMessage`
- `solana:signIn` version `1.1.0` and `useOffchainMessage` (Sign In With Solana wrapped as an off-chain message)
- Off-chain message version 0
- Verifying another party's signature inside the wallet
- Hardware wallets and cold-wallet display of the message
