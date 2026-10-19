# Backlog

This is a list of ideas, **not a contract**. After an item is scheduled, that version's `INDEX.md` wins. After it ships, delete the row and the matching `.md`.

New item: add a row here and write `backlog/<name>.md`.

## Scheduled

(none)

## Unscheduled

| Item | Notes |
|------|--------|
| [Version upgrades and storage migration](./storage-migration.md) | [0.26.0](../0.26.0/INDEX.md) stamped generation 1. Later shape changes still use a named generation step |
| [SNS `.sol` name resolution](./sns-name.md) | Deferred until the SNS `.sol` / `.sns` migration is settled. Not part of the address book |
| [Wallet-account avatar](./account-avatar.md) | Each wallet account can have an icon. Unset accounts stay as they are |
| [Sign-transaction Anchor IDL decode](./sign-transaction-ix-decode.md) | The static common parser shipped in [0.19.0](../0.19.0/INDEX.md). On-chain / metadata IDL is still unscheduled |
| [Sign-transaction durable-nonce notice](./sign-tx-durable-nonce-alert.md) | If the first instruction is System `AdvanceNonceAccount`, tell the user this transaction uses a durable nonce. Do not block approve |
