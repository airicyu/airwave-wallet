# Supporting Solana v1 transactions in Airwave

Engineering note, not a version contract. Format background is [solana-tx-versions.md](./solana-tx-versions.md). Snapshot of the tree on 2026-11-03. `@solana/kit` in `wallet/package.json` is 8.4.0, which can decode and partially sign v1. The wallet does not advertise or interpret v1.

Do not add `1` to `supportedTransactionVersions` until parse, approval, simulate, and sign of a v1 packet all succeed. Advertising early makes dapps send transactions this wallet will mishandle.

## What already works

`wallet/src/shared/tx/tx-wire.ts` decodes, re-encodes, clears signatures, and partial-signs through kit (`getTransactionDecoder`, `getTransactionEncoder`, `partiallySignTransaction`). Kit owns the v1 envelope, including signatures at the tail. Callers pass the keypair. This file does not need a second signer.

`wallet/src/shared/tx/compiled-message.ts` already flattens v1 instructions from `instructionHeaders` and `instructionPayloads`. `compiledAddressTableLookups` returns `[]` unless `version === 0`, which matches v1 (no lookup tables).

`wallet/src/background/simulate/simulate-rpc.ts` posts `simulateTransaction` with `encoding: "base64"`. It does not cap `maxSupportedTransactionVersion`. A v1 packet can be simulated once the bytes round-trip and the RPC node is Agave 4.2.2 or newer.

## What blocks support

### 1. Wallet Standard advertisement

`wallet/src/inject/wallet.ts` sets `supportedTransactionVersions: [0, "legacy"]` on both `solana:signTransaction` and `solana:signAndSendTransaction`. Compliant dapps will not send v1.

Change: append `1` on both features in the same change that makes the rows below correct. Wallet Standard typings that predate features 1.5 may need a bump so `1` is a legal member.

### 2. Account list, signers, and writability

`wallet/src/background/tx-ai/local-flags.ts` returns no accounts, zero signers, and “not writable” whenever `message.version === 1`. Fee payer, program ids, `unknown_program`, token source/owner, and approve/close flags then come out empty or `unresolved`.

v1 addresses are inline and use the same 3-byte header. The helper should read that address array and header. It should not treat v1 as a lookup-table message.

`wallet/src/background/simulate/resolve-account-keys.ts` branches only on `message.version === "legacy"`. Every other version, including v1, is expanded as v0 and reads `staticAccounts`. For v1 the result should be the inline addresses and nothing else. `phase2-deltas.ts` also reads `message.staticAccounts` for the fee payer and the account list used in balance deltas.

`wallet/src/background/simulate/compute-budget-tx.ts` uses `message.staticAccounts` in `cbDiscCount`, `parseCuFromMessage`, and `estimateCuLimitFromCompiledIxs`. Those reads throw or see no program ids on a v1 message. `isLocalCompiled` accepts only `"legacy" | 0`, so `writeCuToTransactionBytes` cannot patch a v1 message. That is the right refusal until a v1 writer exists. Do not append `ComputeBudget` instructions onto a v1 message. Limits and the priority fee belong in the message config.

### 3. Fee units on the approval screen

Legacy and v0 store a compute-unit **price** in micro-lamports per CU inside `ComputeBudget` instructions. v1 stores a priority fee as **total lamports** in the config, and the CU limit and loaded-accounts data size default to zero if the dapp omitted them.

`sign-tx-simulate.ts` calls `parseCuFromMessage`, `estimateCuLimitFromCompiledIxs`, `hasDuplicateCbDisc`, and `writeCuToTransactionBytes` to fill a missing limit or the wallet’s default CU price. On v1 that path either mis-reads the fee or rewrites bytes the dapp did not ask to change. The approval UI has to show the config values. Editing them means rewriting config fields and re-signing, not inserting budget instructions. Unsigned v1 with a zero CU limit should surface that the transaction will fail, not silently invent a `ComputeBudget` instruction.

### 4. RPC reads of landed transactions

`wallet/src/background/tx-ai/host-tools.ts` calls `getTransaction` with `maxSupportedTransactionVersion: 0`. A landed v1 signature comes back as an error, or, on an old RPC, as a fake v0 with a zeroed budget. Set this to `1` anywhere the wallet fetches a transaction or a block for display or for the agent tools. Home activity that only uses an indexer is unaffected until that indexer drops v1. Confirm the configured RPC reports a core version that stores v1 (Agave 4.2.2+). Older nodes are a user-visible failure mode, not a decode bug.

### 5. test-web sign-risk decoder

`test/test-web/src/sign-risk-decode.ts` accepts version byte `0x81` and then parses the rest as v0. That comment is wrong for SIMD-0385. Do not copy it into the wallet. A fixture test should use bytes from kit, not from that peeler.

## Impact

| Area | If v1 is ignored | If v1 is advertised before the gaps close | After the gaps close |
|------|------------------|-------------------------------------------|----------------------|
| dapp connect / sign | dapps fall back to v0 or legacy. ZK proofs, large multisigs, and other payloads that need more than 1232 bytes cannot be signed here. | dapps send v1. Approval shows an empty fee payer and unresolved programs. | Those payloads can be reviewed and signed. |
| Lookup tables | v0 path unchanged. | A v1 message must not be sent through ALT fetch. There is nothing to fetch, and `staticAccounts` is the wrong field. | v0 ALT expansion stays as it is. v1 uses inline keys only. |
| Fee rewrite | Only legacy and v0 gain the local CU price patch. | Patching via `ComputeBudget` instructions corrupts the message or fails `cannot_write`. | Decided in [the backlog item](../roadmap/backlog/v1-transaction.md): a separate default priority fee (5000 lamports) fills an unsigned v1 only when that config field is absent. CU limit is not filled. |
| Simulate / send | base64 simulate can succeed on a good RPC once kit decodes the packet. The UI around it is still wrong. | User may sign a transaction whose CU limit is 0. | Simulate, sign, and `sendTransaction` use the same wire bytes. |
| Activity / `getTransaction` | v1 signatures fail the version check. | Same, until the parameter is 1 and the RPC is new enough. | Landed v1 can be fetched. Budget must be read from config, not from instructions. |
| Legacy and v0 | No format change on the network. | A shared helper that assumes every non-legacy message is v0 can break v0 if the branch is wrong. | Keep the three-way branch. Regression-test both old formats. |

Custody does not change. The vault still signs the message bytes kit produces. No new password and no storage of the transaction.

## Verification

Use a local validator from Solana CLI 4.2 or newer so `enable_tx_v1` is active. Build fixtures with `@solana/kit` (`version: 1`), not by hand-editing a v0 message. Cover mainnet only as a read of a known landed v1 signature against an RPC on Agave 4.2.2 or newer.

### Decode and sign

- Round-trip one v1 transfer: decode, strip signatures, partial-sign with a test keypair, encode. Confirm the first byte is `0x81`, the signature is at the tail, and the byte length matches kit’s encoder.
- Reject or surface a v1 message with a duplicate address. Do not drop the duplicate before signing.
- A v1 message with more than 32 inline addresses, still at most 64, decodes to that full list. A packet between 1233 and 4096 bytes round-trips.
- Legacy and v0 fixtures still decode, sign, and keep their signature prefix. A v0 message with one lookup table still resolves through `resolve-account-keys.ts`.

### Approval and fees

- Fee payer is address 0. Signer and writable flags follow the 3-byte header.
- A token transfer and a token approve show the same flag ids as the legacy equivalents (`authority_change`, unlimited approve when the amount is `u64` max).
- CU limit, loaded-accounts data size, and priority fee on screen come from the config. The priority figure is total lamports, not micro-lamports per CU.
- An unsigned v1 with a zero CU limit does not gain a `ComputeBudget` instruction, and the default priority fee does not fill that limit.
- An unsigned v1 with no priority-fee field gains the settings default (5000 lamports) in the config. A field that is present, including 0, stays as the dapp wrote it. A signed v1 is not rewritten.
- A legacy or v0 unsigned transaction still receives the current default CU price patch.

### RPC

- `simulateTransaction` of an unsigned v1 with limits set returns logs and a fee against the local validator.
- `signAndSendTransaction` of that v1 lands. `getTransaction` with `maxSupportedTransactionVersion: 1` returns version 1 and a non-zero config, not a downgraded v0.
- The same `getTransaction` call against a node older than Agave 4.2.2 is recorded as a known bad readout (wrong version, zero budget), not as success.
- The host tool in `host-tools.ts` can load that signature after the parameter change.

### Wallet Standard

- Before `1` is advertised, a dapp that respects `supportedTransactionVersions` does not submit v1.
- After it is advertised, `signTransaction` and `signAndSendTransaction` both accept the kit bytes and return a signed packet whose message bytes match the request.

### Explicitly out of this check

SIMD-0596 (96 addresses) is not a test target until it activates. Wallet send and close-empty are built as v1; that decision lives in [the backlog item](../roadmap/backlog/v1-transaction.md).
