# 0.57.0 how

1. test-web reads the connected account chain and picks the Devnet or Mainnet RPC input. Both inputs persist in `sessionStorage`.
2. `#sign-tx-suspicious` compiles CreateLookupTable then System Assign of the fee payer to the lookup-table program. Sign only.
3. `#sign-tx-nonce` loads or creates a nonce account for the fee payer. Creation is broadcast. The following AdvanceNonce transaction uses `fetchMaybeNonce` `blockhash` as its lifetime and transfers 1_000_000 lamports. Sign only for that second transaction.
4. `#sign-tx-steal` transfers 1_000_000 lamports, creates two 165-byte token accounts for the WSOL mint, approves `u64` max and SetAuthority on one, and CloseAccount on the other. Local signatures cover the new accounts. Sign only.
5. `simulatePhase1ForLimit` returns `suggestedLimitFromPhase1` only when `value.err == null` and `unitsConsumed` is a non-negative integer.
6. `decodeCompiledMessage` labels the native programs in the INDEX, puts the Assign new owner in `system_assign`, names the nonce instructions, and pushes `durable_nonce` for InitializeNonceAccount and for a leading AdvanceNonceAccount.
7. `applyFlagsFloor` treats `durable_nonce` as `watch`.
8. Failure details in `sign-tx-deltas.ts` and `simulation-notice.ts` use a 320px `<pre>`, keep `summary` as `list-item`, and copy the joined error JSON and logs.
9. `.agents/skills/e2e-wallet/SKILL.md` and `test/e2e/README.md` forbid the three button ids.

Checks: `cd wallet && npm run typecheck` and `cd test/test-web && npm run build`. Walk the three samples in the unpacked extension and reject each danger approval.
