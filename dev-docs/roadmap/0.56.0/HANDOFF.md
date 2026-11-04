# 0.56.0 handoff

## Done this session

Design review gate passed. Implementation is in the wallet and test-web. `cd wallet && npm run typecheck` and `cd test/test-web && npm run build` passed. On 2026-11-05 the user walked the Sign in full popout and confirmed the nine-line message card. Off-chain bytes, Sign in short, the old `signMessage` cases, close, and reload are still not walked.

## Next session

Implementation review, then fix its findings. Do not ship until the user says so.

Track order:

1. Protocol: `dapp.signOffchainMessage`, `dapp.signIn`, pending kinds, payloads. Version 1 preamble builder in the extension. No new package.
2. Service worker: validate, enqueue, compose SIWS, sign on approve, reply only to the originating tab.
3. Inject: advertise both features on the wallet and on `account.features`. `signIn` is `1.1.0`. `signOffchainMessage` is `1.0.0` with message version `1`.
4. Approval: off-chain reuses the readable Sign message card, including the collapsed hex of the message string. Sign in is the same card with title Sign in and the composed statement.
5. Catalog strings for the Sign in title, three languages. test-web buttons from HOW.

Bans: do not change `signMessage` behavior. Do not show the off-chain preamble on the card. Do not let the user pick `useOffchainMessage`. Do not add `@solana/offchain-messages`. The address line is always the frozen signer.

## Paste-ready

```text
Implement dev-docs/roadmap/0.56.0. Read INDEX.md, then docs/reasoning.md, then docs/how.md. Design review gate has passed. Follow the Track order in HANDOFF.md. Do not commit unless asked.
```
