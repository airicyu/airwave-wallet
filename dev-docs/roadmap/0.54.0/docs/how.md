# 0.54.0 how

Read [INDEX.md](../INDEX.md) first. One track. Do not start the next step while an earlier step's typecheck is failing.

## Track

1. Add `defaultPriorityFeeLamports` on the settings object in `wallet/src/shared/protocol/storage-keys.ts`. Persist a decimal string. `normalizeSettings` in `storage-io.ts` maps a missing or blank value to `"5000"` and leaves a non-integer or out-of-range edit unwritten. The settings fingerprint in `popup/settings/settings-logic.ts` includes that string so the hub row repaints. Parse with `BigInt` at the use site. Add the settings hub row under Default CU price, with `settings.hub.priorityFee` in `wallet/src/shared/i18n/ui-messages.ts` for zh-Hant, zh-Hans, and en.
2. In `wallet/src/background/simulate/compute-budget-tx.ts` and `sign-tx-simulate.ts`, branch on message version. Legacy and v0 keep `parseCuFromMessage` and `writeCuToTransactionBytes`. v1 reads CU limit and priority fee from the config. When the unsigned message omits the priority fee, write `defaultPriorityFeeLamports` into the config and commit that as the working transaction, the same moment today's missing CU price is written. For a v1 message, `priorityLamports` is that config fee in lamports, and the fee total is the signature fee plus that value. Do not append `ComputeBudget` instructions. Do not write CU limit or loaded-accounts data size on a dapp message.
3. `wallet/src/approval/dom/fee-details.ts`: when the message is v1, the second input is priority fee lamports and its label is `approval.priorityFee`. Hide the CU price input. `cuEditable` still disables both inputs. Apply sends the priority fee as a decimal string, not a CU price and not a JSON number.
4. `local-flags.ts` and `resolve-account-keys.ts` use the v1 inline addresses and header. Version 1 does not call `fetchAddressesForLookupTables`.
5. `wallet-begin-send.ts` and `build-close-txs.ts` compile a provisional v1 with CU limit `1400000` and loaded-accounts data size `67108864`, simulate that packet once, then compile the message the user approves. CU limit is `computeCloseEmptyUnitLimit(unitsConsumed)`. Loaded-accounts data size is the smallest positive multiple of `32768` at least as large as the measured size (`0` becomes `32768`). Write `defaultPriorityFeeLamports` into the config. The send reserve and the close-empty fee total use `BigInt` of that stored string as the priority term, plus 5000 lamports per signer. They do not use `defaultCuPrice` for that term. That includes `solReserveLamports` callers in `wallet/src/popup/send/TokenSendForm.tsx` and `wallet/src/popup/send/send-logic.ts`, and the close-empty fee totals in `wallet/src/background/close-empty/plan-close-empty.ts` and `wallet/src/background/close-empty/commit-close-empty.ts`. Do not change the `HomeTokenList.tsx` reload dependency. A failed simulation does not create the pending approval. `close-empty-pack.ts` packs these transactions to 4096 bytes and at most 64 addresses.
6. Set `maxSupportedTransactionVersion: 1` on wallet `getTransaction` and `getBlock` calls that pass a max version, including `host-tools.ts`. Add `1` to both `supportedTransactionVersions` arrays in `wallet/src/inject/wallet.ts`.

## Checks

`cd wallet && npm run typecheck`

`cd test/test-web && npm run build`

Hand checks are the acceptance list in the INDEX. `sign-tx-v1` is the unsigned v1 that already has a priority fee. `sign-tx-v1-no-fee`, `sign-tx-v1-zero-fee`, `sign-tx-v1-no-cu`, and `sign-tx-v1-signed` are the four other dapp cases. `sign-and-send-tx-v1` is the same unsigned v1 sent through `signAndSendTransaction`. Use the popup send and close-empty screens for the wallet-built path.
