# Solana transaction versions: legacy, v0, v1

Engineering note, not a version contract. Written 2026-11-03 from public docs. Wallet impact is in [solana-tx-v1-wallet-support.md](./solana-tx-v1-wallet-support.md).

Sources:

- [Versioned transactions](https://solana.com/docs/core/transactions/versioned-transactions)
- [Larger transaction sizes](https://solana.com/upgrades/larger-transaction-sizes) (SIMD-0296 size, SIMD-0385 format)
- [SIMD-0385](https://github.com/solana-foundation/solana-improvement-documents/blob/main/proposals/0385-transaction-v1.md)
- Feature gate `txv1aq4pp281K9um3tnPgkfX8UqtFT6wcVW3hNezGLL` (`enable_tx_v1`)

## Status

| Format | Mainnet |
|--------|---------|
| legacy | Still valid |
| v0 | Still valid. Address lookup tables. |
| v1 | Live since epoch 1035, about 2026-09-15 01:00 UTC. Also live on devnet and testnet. |

Legacy and v0 are unchanged. Apps that never build v1 keep working. Readers that fetch transactions must opt in, or v1 rows fail or come back wrong.

Minimum nodes that store v1 faithfully: Agave 4.2.2, Firedancer 26.08, Frankendancer 0.1106.40201. Agave before 4.2.2 can downgrade a stored v1 message to v0 and zero its compute budget. Jito-Solana before 4.2.2 will not pack v1 into blocks. Local `solana-test-validator` from CLI 4.2+ and Surfpool 1.5+ enable the feature at genesis.

## What each version is for

**Legacy.** Original message. Every account address is 32 bytes inside the message. No version prefix. Practical account count is about 32, because 64 addresses already exceed the 1232-byte packet before instruction data.

**v0.** Same 1232-byte packet. A version prefix lets the message reference addresses in an on-chain address lookup table (1 byte per loaded index) so a transaction can lock the runtime cap of 64 accounts.

**v1.** New envelope and a 4096-byte packet (SIMD-0296 delivered through SIMD-0385). Lookup tables are removed on purpose: 64 inline addresses are 2048 bytes and fit. Compute unit limit, loaded-accounts data size, heap size, and priority fee sit in a fixed config instead of `ComputeBudget` instructions, so a scheduler can read the priority fee at a fixed offset. Duplicate account addresses are rejected. A draft, SIMD-0596, would raise the v1 address cap from 64 to 96. It is not the live limit.

Account order is the same in all three: writable signers (index 0 is the fee payer), read-only signers, writable non-signers, read-only non-signers.

## Wire layout

### Legacy and v0 envelope

```text
compact-u16 signature count
signatures, 64 bytes each
message
```

A legacy message starts with the 3-byte header, so the first byte is `< 0x80`. A v0 message starts with `0x80` (high bit set, version 0), then the same 3-byte header, then static keys, the blockhash, instructions, then the lookup-table section.

### v1 envelope

The version byte is first. Signatures have no length prefix; the count is `num_required_signatures` in the header. They sit at the tail.

| Field | Size | Role |
|-------|------|------|
| `0x81` | 1 | Version prefix (129). First byte of the transaction. |
| header | 3 | Same `MessageHeader` as legacy: required signatures, read-only signed, read-only unsigned. |
| `config_mask` | 4 | Little-endian `u32`. Each set bit means one following config value is present. |
| recent blockhash | 32 | Lifetime specifier. Durable nonce still uses the nonce mechanism, not a second hash field. |
| `num_instructions` | 1 | Fixed width. Max 64. |
| `num_addresses` | 1 | Fixed width. Max 64 on the live feature (96 only if SIMD-0596 lands). |
| addresses | N × 32 | All inline. No lookup-table accounts. |
| config values | 0–20 | One value per set mask bit, in bit order. |
| instruction headers | N × 4 | `program_id_index` u8, `num_accounts` u8, `data_len` u16 LE. |
| instruction payloads | variable | Account indexes, then instruction data, per header. |
| signatures | signer count × 64 | Tail. No compact-u16 in front. |

Do not parse v1 by skipping `0x81` and then using the v0 layout. The mask, the fixed counts, the split instruction header/payload, and the signature tail are all different. A decoder that treats `0x81` as a shortvec signature count will peel a huge span and produce an empty message.

## Limits

| | legacy | v0 | v1 |
|---|--------|----|----|
| Packet size | 1232 | 1232 | 4096 |
| Addresses | inline, size-bound (~32) | up to 64 via lookup tables | 64 inline |
| Address lookup tables | no | yes | no |
| Duplicate addresses | allowed | allowed | rejected at sanitization |
| Fee and CU | `ComputeBudget` instructions | same | message config. Defaults for CU limit and loaded-accounts data size are zero; a sender must set them or the transaction fails. |

The 64-account runtime lock limit applies to legacy and v0 as well. Legacy cannot reach it inside 1232 bytes. v0 reaches it with lookup indexes. v1 reaches it with inline keys and checks 64 in the format itself.

## Fees

| | legacy / v0 | v1 |
|---|-------------|----|
| Where it lives | `ComputeBudget` program instructions (set compute unit limit, set compute unit price, and the other budget instructions) | `transactionConfig` / message config |
| Priority figure | micro-lamports **per compute unit** | **total lamports** |

Comparing or displaying a v0 price next to a v1 fee without converting units is wrong. Sponsors and fee caps that only scan `ComputeBudget` instructions do not see a v1 priority fee.

## Reading from RPC

`getTransaction`, `getBlock`, and `blockSubscribe` take `maxSupportedTransactionVersion`. `0` means “legacy and v0”. It does not include v1. Set it to `1` to receive v1. `simulateTransaction` and `sendTransaction` should pass `encoding: "base64"` for these packets. JSON that still assumes a signature prefix plus a v0 message will not round-trip a v1 payload.

`@solana/kit` 8.0.0 and later encode, decode, and sign v1. `@solana/web3.js` 1.99 can read v1 and does not build or sign it. `@solana/web3.js` 3.x can compile a v1 message. Wallet Standard `supportedTransactionVersions` includes `1` only when the wallet actually parses and signs that format. A dapp is expected to check that list and fall back to v0 when `1` is absent.

## Building a v1 transaction

- Put every account in the address array. Drop lookup tables.
- Set compute unit limit and loaded-accounts data size explicitly.
- Put the priority fee in the config as total lamports, not as a `ComputeBudget` set-price instruction.
- Sign the message, then append signatures. The signed bytes are not `shortvec(count) || sigs || message`.
