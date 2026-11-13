# Helius Solana Privacy Rings

Engineering note, not a version contract. Written 2026-11-11 from public docs and the Zolana spec. This does not schedule wallet work.

Sources:

- [Solana Privacy Rings](https://www.helius.dev/docs/privacy)
- [Overview](https://www.helius.dev/docs/privacy/concepts/overview)
- [Architecture](https://www.helius.dev/docs/privacy/concepts/architecture)
- [Private Wallet integration](https://www.helius.dev/docs/privacy/integration/wallet)
- [Zolana spec](https://github.com/helius-labs/zolana/blob/main/docs/spec.md) (UTXO, shielded address, registry, deposit, transact)
- TypeScript SDK: `@heliuslabs/spr` `^0.9.0-alpha`, peer `@solana/kit` `^8.3.0`. This repo already depends on `@solana/kit` 8.4.0.

The GitHub repo [helius-labs/privacy-rings](https://github.com/helius-labs/privacy-rings) was empty at the time of writing. Protocol source is [helius-labs/zolana](https://github.com/helius-labs/zolana). Helius describes the permissionless ring as live on mainnet. The client SDK is still an alpha.

## What a Ring is

A Ring is a shielded pool: one set of encrypted balances, one spend policy, and one state Merkle tree. It is not "a program Airwave would deploy."

The permissionless **Default Ring** runs on the already-deployed Solana Privacy Program. Next to it:

- Registry program `regyS5rkAcw2YzDJCmTwCTHs2s246FXxbmuRZ42u2PD`. One PDA per registered Solana address.
- One escrow (SPL interface PDA) per mint, owned by the Solana Privacy Program. Deposited tokens sit there.
- A state Merkle tree. UTXOs are commitments in that tree, not Solana accounts, and pay no rent.

A **Custom Ring** is an extra program an enterprise deploys. It checks its own policy, then CPIs into the Solana Privacy Program. Use it for anonymity (hide sender and recipient), an auditor key, freeze, or a co-signer. Anonymous spends are submitted by a relayer so the user is not the fee payer. Airwave does not need a Custom Ring to offer a private balance.

Default Ring privacy is confidentiality, not anonymity. Asset and amount are encrypted. Sender and recipient Solana addresses stay public.

## What stays public

| Step | Asset and amount | Parties |
|------|------------------|---------|
| Register | none | Your address, `nullifier_pk`, and `viewing_pk` are written to the registry PDA |
| Deposit from a public balance | Public | Public. The resulting UTXO commitment does not reveal the amount again, but the deposit transaction already did |
| Transfer inside the Default Ring | Encrypted | Both Solana addresses are public tags on the outputs |
| Withdraw to a public balance | Public | Public |

A fiat on-ramp into a private balance would hide asset and amount. This wallet has no fiat ramp. A private transfer to an address with no registry record is turned into a public withdrawal by the SDK. The UI must say so and ask the user to confirm again.

## Keys

One Solana address maps to one shielded address. The wallet derives it locally. Nothing is issued by Helius.

1. Sign the fixed off-chain message `TSPP/derive/v1` (Solana off-chain message v0, including the account pubkey) with that account's Ed25519 key. The 64-byte signature is the derivation seed. Ed25519 signatures are deterministic, so the seed is stable.
2. `prk = HKDF-SHA256 Extract(salt empty, IKM = signature)`.
3. `nullifier_secret = HKDF Expand(prk, "TSPP/nf_key/ed25519/v1", 31 bytes)`.
4. `viewing_sk = clamp(HKDF Expand(prk, "TSPP/view_key/ed25519/x25519/v1", 32 bytes))`.
5. `viewing_pk = 0x04 || X25519(viewing_sk, 9)` (33 bytes).
6. `nullifier_pk = Poseidon(nullifier_secret)`.
7. `owner_hash = Poseidon(owner_proof_input_hash(signing pubkey), nullifier_pk)`.

`viewing_sk` decrypts. It cannot spend. `nullifier_secret` is what marks a note spent. Spending still requires the Solana key to sign the transaction.

Registration is its own transaction, before any deposit. Instruction data carries `nullifier_pk` and `viewing_pk`, and the registry PDA stores them. Also set merge encryption to `PoseidonCtrV1` in that same flow, or a balance split across more than 40 UTXOs cannot be spent in one transfer. Reads of the registry are public. `nullifier_pk` cannot be rotated. The record cannot be closed.

Your own `viewing_pk` and `owner_hash` are computed locally. Someone else's are read from their registry PDA by Solana address, then `owner_hash` is recomputed. An unregistered address has no `viewing_pk` to encrypt to.

## UTXO

Logical plaintext:

```text
domain u16          (normal output = 3)
owner [u8; 32]      owner_hash
asset Address       mint; SOL is the all-zero address
amount u64          base units
blinding [u8; 32]
utxo_data           optional application bytes
ring_data           optional
ring_program_id     absent on the Default Ring
```

On chain the tree stores `utxo_hash`, not this struct.

```text
utxo_hash = Poseidon(domain, tree_id, asset, amount, data_hash, ring_hash, owner_utxo_hash)
owner_utxo_hash = Poseidon(owner, blinding)
nullifier = Poseidon(utxo_hash, blinding, nullifier_secret)
```

A nullifier can be inserted once. After it is published, that note is spent. The nullifier does not contain the amount.

A transfer spends input notes and appends new ones (recipient plus change). It does not edit an amount field. The wallet shows the sum of unspent notes of one asset.

## Deposit, then transfer

### Deposit

Public instruction: asset, amount, recipient Solana address (`view_tag`), recipient `owner_hash`. Tokens move into the escrow. No ZK proof and no `tx_viewing_pk`.

`blinding` is not a field in the instruction. The program derives it:

```text
blinding = Sha256("Deposit" || tree_account || leaf_index)
```

with the leading byte cleared so the result fits the BN254 field. The wallet rebuilds the UTXO from those public values and computes `utxo_hash`. Anyone can see what was deposited.

### Transfer to someone who is registered

Example: one 10 USDC deposit note, send 7 to Bob, keep 3.

1. Bob's `owner_hash` and `viewing_pk` come from his registry record.
2. `nullifier = Poseidon(utxo_hash, blinding, nullifier_secret)` of the note in input slot 0. That nullifier is an input to the ephemeral key. It is not itself `tx_viewing_pk`.
3. `view_root = HKDF Extract(salt "TSPP/view_root/x25519/v1", IKM = viewing_sk)`.
4. `tx_viewing_secret = HKDF Expand(view_root, "TSPP/tx_viewing/x25519/v1", 32)`.
5. `tx_viewing_sk = clamp(HKDF-SHA256(salt = that nullifier, IKM = tx_viewing_secret, info "TSPP/tx_viewing/x25519/v1", 32))`.
6. `tx_viewing_pk = 0x04 || X25519(tx_viewing_sk, 9)`. One ephemeral public key per transaction, written into the instruction. Do not generate it at random. It is recomputed later from `viewing_sk` and the same nullifier, so the sender can open their own change without storing the ephemeral secret. A random key would encrypt, and then be unrecoverable.
7. A fresh 16-byte `salt` is the random part. It stops AES key and nonce reuse when a transaction is rebuilt.
8. Encrypt Bob's 7 USDC to `ECDH(tx_viewing_sk, Bob's viewing_pk)`, and the 3 USDC change to the sender's own `viewing_pk`. Default-ring recipient plaintext with empty `data` is 50 bytes: `asset_id u64`, `amount u64`, `blinding` 32 bytes, empty data count. AES-256-CTR, HKDF info `"TSPP/hpke/" || "TSPP/tx" || salt || slot index`.
9. A Groth16 proof shows the inputs are yours and the amounts balance. Helius generates it by default. Local proving is not available yet. The prover sees the plaintext amounts and the nullifier key. The documented prover is an attested AWS Nitro enclave, reached through the Helius RPC URL. Proof generation is billed at 1,000 credits; a read is 10.
10. The owner signs the Solana transaction with the normal Ed25519 key. A typical confidential transfer is about 1,279 bytes and about 140,000 CU.

Chain result: the old nullifier is public, two new commitments are appended, each output is tagged with a Solana address. Outsiders see "you to Bob" and not 7 or 3.

The wallet finds its note by that address tag via the indexer (`getShieldedTransactionsByTags` and the encrypted-UTXO read). It decrypts with `viewing_sk` against the transaction's `tx_viewing_pk`, then recomputes `utxo_hash` and drops the output if the hash does not match. It does not try to decrypt Bob's output.

`tx_viewing_pk` appears only on an encrypted transfer. A deposit does not return one for later use.

## Off-chain message

`TSPP/derive/v1` is the one payload a dApp must not be allowed to sign.

The 64-byte signature is the seed for both `viewing_sk` and `nullifier_secret`. Whoever receives it can decrypt this account's private transfer history, past and future, and can precompute nullifiers. They cannot spend: the Solana signature on the transaction is still required. They cannot recover the Solana private key from it. They cannot replace a registered `nullifier_pk`.

Signing it inside the wallet, and keeping the signature in memory only, is how the wallet derives the keys. Returning that signature to a page, or writing it to a log, gives away decryption of the private balance. Deposit amounts are already public and do not depend on this key.

## Decided UX

Registration does not use a separate page or the generic transaction approval screen. The unregistered state of the private-balance tab says to register this wallet before using it for the first time. The button in that tab is the consent. The wallet then builds, signs, and submits. While that runs, the button shows loading and ignores further clicks. If the public SOL balance cannot pay the fee, the button stays disabled. Failure stays on that unregistered state and the button leaves loading. Success replaces that state with the private-balance list in the same tab.

The same transaction also sets merge encryption to `PoseidonCtrV1`. Derivation of `viewing_sk` stays in memory and is not shown. `dapp.signMessage`, `dapp.signOffchainMessage`, and `dapp.signIn` reject payload `TSPP/derive/v1`, and they reject the off-chain envelope built from it. No approval screen.

User-facing verbs are Shield and Unshield. Shield moves a public balance into the Default Ring. Unshield moves a private balance out to a public address. The Unshield recipient defaults to the user's own address and does not need a registry record. Protocol instructions stay `deposit` and `withdraw`. Private Send is the third action and is not called Shield.

Send and Unshield spend at most 40 UTXOs. If the user selects more than 40, or the entered amount needs more than 40 under largest-first selection, the page shows a validation banner and blocks submit. It does not start a merge on its own. A proof is requested only while building that transaction, and the approval screen opens after the proof returns. Changing the amount, the selection, or the recipient requires a new proof.

Private Send looks up `getUserRecords` for the recipient address. No record blocks Send. A record supplies `nullifierPubkey` and `viewingPubkey`. The wallet computes `owner_hash` from the address and `nullifierPubkey`, and encrypts the output to `viewingPubkey`.

## Decided scope

Not a backlog item until someone adds one. Default Ring only. No Custom Ring, relayer, fiat ramp, or private swap. No dApp API. Popup only.

The bottom bar stays Assets and Activities. Inside Assets, sub-tabs are Tokens and Private Balances.

**Unregistered.** The tab itself explains the register transaction and shows the register button from Decided UX. No separate register page.

**Registered.** The tab lists private token totals for the Default Ring, decrypted locally. Each row is collapsed. Expanding it lists that token's UTXOs. A row opens the private token detail. A UTXO row opens a UTXO detail.

**Combined wallet account.** Expanding a token lists each member address, and expanding a member lists that member's UTXOs. Opening the token detail uses the main wallet only, because that is the address the combined account can sign with. A member with no vault key cannot be decrypted. Do not show that member as a zero private balance. Public deposit notes for that member may be shown read-only.

**Private token detail.** Matches the public token detail. Icon above the name, no Jupiter shield. Buttons are Send, Shield, Unshield, Merge UTXO. Then Amount and Mint. The UTXO list is below those rows and does not navigate. Shield from this page skips the token picker.

**Shield.** Two other entries: a button on the public token row, and a button on the private-balance tab that first lists public tokens with a balance above zero. The Shield page matches Send except it has no recipient. 50% and Max use the public balance of the signing address, not a combined sum, and not the private total. The page also shows the current private total. The deposit amount and asset are public, and the approval screen says so. No ZK proof. If the account is not registered, this page shows the same register button. Success stays on the page and reveals the amount form. Back leaves the page.

**Send.** Matches the public Send form, plus a UTXO list sorted by amount descending, then UTXO id ascending. Auto select is the default and follows that order until the amount is covered. Changing the amount reselects. Manual selection that sums below the amount shows insufficient balance and blocks submit. Over 40 inputs is blocked as in Decided UX. Submit builds the v1 transaction, requests the proof while building, then opens the approval screen. Reject returns to this page with the amount, auto-select state, and selection unchanged.

**Unshield.** Same page as Send. The recipient defaults to the user's own address. The recipient does not need a registry record. The approval screen says the asset and amount become public. Change, if the selected sum exceeds the amount, remains a private UTXO.

**Merge.** Lists this token's UTXOs sorted by amount ascending, then UTXO id ascending, and shows the count. Select all selects every row. 52 or fewer is one v1 transaction and one approval. More than 52 is split into transactions of at most 52 and uses the same batch approval as closing empty token accounts. Success returns to the private-balance tab. Only notes with an empty `data` field can be merged.

**Signing gate.** As in Decided UX. The wallet's own derivation does not go through those dApp commands.

Costs that have to be named in any later INDEX: the alpha SDK, a Helius API key for the indexer and the prover, and the fact that proof generation currently sends plaintext spend data and the nullifier key off the device. Chain integer amounts stay `BigInt`. The SDK must not be allowed to introduce `number` arithmetic on amounts.
