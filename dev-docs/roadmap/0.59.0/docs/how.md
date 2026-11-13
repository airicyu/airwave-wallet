# 0.59.0 direction

This is not an implementation proposal. It names the direction so a later implementation does not invent a second architecture. The design demo comes first.

## Dependency

Add `@heliuslabs/spr` when implementation starts. The reason is in [reasoning.md](./reasoning.md). The package builds instructions and talks to the indexer and prover. The extension still signs with the existing vault. Do not persist SDK key objects.

`createSprClient` uses the saved Helius RPC URL for the selected cluster. Reads use `getShieldedTransactionsByTags` with the account's confidential view tag, then `decryptToBalances` on device. Recipient lookup uses `getUserRecords`. A missing record is a blocked Send, not a withdrawal.

Shield is the SDK deposit path and includes no proof. Send, Unshield, and Merge request a proof only inside the build of the v1 transaction the user is about to approve. A change to amount, notes, or recipient discards that proof.

## Where it lives

Popup screens follow the existing send and token-detail screens. New copy goes into the three message catalogs. Register, shield, send, merge, and unshield commands follow the existing typed command plus `requestId` path. The service worker holds the in-memory shielded key and the pending approval. The UI does not read the vault.

Register builds one transaction that writes the viewing public key, the nullifier public key, and `PoseidonCtrV1` merge encryption, then queues it on the existing wallet-send approval. The service worker signs it only after the user approves. Shield, Send, Unshield, and Merge already use that queue.

Sign AI report knowledge lives in `wallet/src/shared/tx-ai/tx-ai-prompt.ts` and teaches a general instruction-first reading of one transaction. Decisions criteria live in `wallet/src/background/tx-ai/openrouter.ts` and grade from structure: program labels, privilege flags, and asset-path clarity. They do not name product programs. A labeled no-transfer setup with clean privilege flags may be `low`; opaque bytes on a named instruction alone are not `unknown`.

UTXO selection is local. Spend order is amount descending, then `utxo_hash` ascending, and stops at 40 notes. Merge order is amount ascending, then `utxo_hash` ascending, in slices of at most 52. A merge batch reuses the close-empty batch approval.

## During implementation

The user asked to implement on 2026-11-12. Add `@heliuslabs/spr` on Track 1. Screen layout that the INDEX does not name follows the approved demo. A behavior the INDEX states still wins if the demo disagrees.
