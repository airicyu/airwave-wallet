# 0.57.0 — Sign risk samples and durable-nonce watch

- **Status:** `in progress`
- **Upstream:** [0.56.0](../0.56.0/INDEX.md) shipped. Absorbs the batch that was in [unversioned.md](../unversioned.md).
- **Backlog:** none. This INDEX wins.

## Product

test-web follows the connected wallet cluster and offers three sign-only danger samples for the sign AI. The wallet does not treat a failed compute-unit probe as a measured limit. A durable nonce, including the act of creating one, floors the sign AI at watch because the signature can be submitted later. Simulation failure details are taller and can be copied. e2e does not run the danger samples.

## Docs

1. This file
2. [docs/reasoning.md](./docs/reasoning.md)
3. [docs/how.md](./docs/how.md)

## Decided

| Topic | Decision |
|-------|----------|
| test-web cluster | After connect, test-web uses the wallet account's chain (`solana:devnet` or `solana:mainnet`) for RPC, blockhash, and `signTransaction` `chain`. The page shows that cluster and the RPC URL. Devnet and Mainnet RPC inputs are editable and stored in `sessionStorage` for the tab. Devnet airdrop stays disabled unless the wallet is on Devnet. |
| Danger samples | The panel is labeled as dangerous and says not to approve. The page calls `signTransaction` only for the three samples below. It does not broadcast those signed transactions. A browser confirm repeats that warning before the wallet opens. |
| Suspicious sample | `#sign-tx-suspicious` builds a v0 transaction whose first instruction is Address Lookup Table `CreateLookupTable` for a PDA of the fee payer and the confirmed slot, then System `Assign` of the fee payer to `AddressLookupTab1e1111111111111111111111111`. |
| Durable-nonce sample | `#sign-tx-nonce` keeps one nonce account per fee payer in `sessionStorage` for the tab. If that account is missing or not an initialized nonce owned by the fee payer, the page first asks the user to approve a CreateAccount plus InitializeNonceAccount, and it broadcasts that setup. The danger transaction is then AdvanceNonceAccount on that account, with the stored nonce as the transaction blockhash, then a System transfer of 1_000_000 lamports to `US517G5965aydkZ46HS38QLi7UQiSojurfbQfKCELFx`. The page does not broadcast the danger transaction. |
| Steal sample | `#sign-tx-steal` transfers 1_000_000 lamports to that same stranger, opens two new Token-program accounts for the WSOL mint inside the transaction, unlimited-approves and SetAuthority-assigns one of them to the stranger, and closes the other to the stranger. The page signs the new accounts locally before the wallet signs the fee payer. It does not broadcast. |
| CU probe | `simulatePhase1ForLimit` uses `unitsConsumed` only when `value.err` is null and the value is a non-negative integer. Otherwise it keeps the transaction's own limit when one exists, or `estimateCuLimitFromCompiledIxs` on the probe message. |
| Known programs | The sign decoder labels Address Lookup Table, Stake, Vote, and the three BPF loaders. They do not raise `unknown_program`. |
| Assign detail | `system_assign` for System Assign is the base58 new owner from instruction bytes 4 through 36. AssignWithSeed stays the detail `AssignWithSeed`. |
| System names | CreateAccount, WithdrawNonceAccount, AuthorizeNonceAccount, and InitializeNonceAccount are named. InitializeNonceAccount carries `detail` `authority <base58>`. |
| Durable nonce flag | InitializeNonceAccount raises `durable_nonce` with detail `InitializeNonceAccount`. AdvanceNonceAccount as instruction 0 raises `durable_nonce` with detail `AdvanceNonceAccount`. `applyFlagsFloor` maps `durable_nonce` to `watch`. |
| AI prompt | The assess prompt says a durable-nonce signature stays valid until that nonce is advanced again, and a transfer that fails simulation for lack of lamports can still move funds after the balance grows. It also names CreateAccount and InitializeNonceAccount so they are not described as Assign or Transfer. |
| Failure details | On a failed simulation, the failure `<pre>` `max-height` is 320px. The summary stays `display: list-item` so the disclosure marker remains, and a copy button writes the error JSON and logs to the clipboard. |
| e2e | Scenarios and the e2e skill do not click `#sign-tx-suspicious`, `#sign-tx-nonce`, or `#sign-tx-steal`, and do not approve them. If that approval is open, reject it. |

## Out of scope

- Broadcasting any of the three danger samples.
- Changing the default priority fee or the v1 fee card.
- A new OpenRouter model or a new risk level name.
- Raising `durable_nonce` above `watch`.
- Splitting `wallet/src/shared/i18n/ui-messages.ts`.

## Acceptance

- [ ] `cd wallet && npm run typecheck`
- [ ] `cd test/test-web && npm run build`
- [ ] On a wallet with a small SOL balance, `#sign-tx-suspicious` reaches simulation without `ProgramAccountNotFound` for a missing program id. The AI names System Assign of the fee payer to the Address Lookup Table program. Reject the approval.
- [ ] `#sign-tx-nonce` can create a nonce account, then open an AdvanceNonce transaction whose blockhash is that nonce. The sign AI level is at least watch, and the report says the signature can be submitted later. Reject the danger approval.
- [ ] `#sign-tx-steal` does not fail the first transfer for 1000 SOL. Reject the approval.
- [ ] A probe simulation that returns `err` does not set the CU limit to `ceil(unitsConsumed × 1.1)`.
- [ ] Expanded failure details are 320px tall, the disclosure marker is visible, and copy puts the error text on the clipboard.
- [ ] No e2e scenario clicks the three danger buttons.

## Anchors

| Path | Role |
|------|------|
| `test/test-web/src/main.ts` | Cluster, panels, three danger samples |
| `test/test-web/index.html` | Danger panel copy |
| `wallet/src/background/simulate/sign-tx-simulate.ts` | Phase-1 CU probe ignores a failed `unitsConsumed` |
| `wallet/src/background/tx-ai/local-flags.ts` | Labels, assign owner, nonce flag |
| `wallet/src/shared/tx-ai/tx-ai.ts` | `durable_nonce` floor |
| `wallet/src/shared/tx-ai/tx-ai-prompt.ts` | Delayed-submit wording |
| `wallet/src/approval/sign-tx-deltas.ts` | Failure details height and copy |
| `.agents/skills/e2e-wallet/SKILL.md` | Do not run the danger samples |

## Still to decide

(none)
