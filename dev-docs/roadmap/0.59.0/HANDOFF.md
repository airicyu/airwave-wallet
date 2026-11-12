# 0.59.0 handoff

## Read order

1. [INDEX.md](./INDEX.md)
2. [docs/reasoning.md](./docs/reasoning.md)
3. [docs/how.md](./docs/how.md)
4. Approved layout: [privacy-balance-ux.html](../../design-demos/0.59.0/privacy-balance-ux.html)

## Product

Default Ring private balance for a signing account. Register once from Private Balances. Then Shield, private Send, Unshield, and Merge. Custom Rings are out of scope.

## Track order

1. Read and register: Private Balances sub-tab, unavailable states (non-Helius RPC, watch-only), register transaction without the generic approval screen, decrypted totals.
2. Shield, including the Shield token picker.
3. Private Send, including the 40-UTXO block and unregistered recipient block.
4. Unshield. No recipient field.
5. Merge, including the 52-note batch.
6. Reject `TSPP/derive/v1` on `signMessage`, `signOffchainMessage`, and `signIn`, with the three test-web buttons.

## Bans

Do not add a second API key. Do not persist viewing or nullifier secrets. Do not broadcast results to every tab. Do not hydrate pending from storage. Do not turn an unregistered Send into a public withdrawal. Do not auto-merge when a spend exceeds 40 notes.

## Paste-ready

Implement 0.59.0 from `dev-docs/roadmap/0.59.0/INDEX.md`. The approved demo is layout only. Start at Track 1. Do not commit unless asked.
