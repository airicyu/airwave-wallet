# Wallet support for Solana v1 transactions — backlog

Scheduled as [0.54.0](../0.54.0/INDEX.md). **That INDEX is the contract.** This file is the idea record only.

## Current

The wallet signs legacy and v0. `wallet/src/inject/wallet.ts` advertises only those two versions. `@solana/kit` 8.4.0 can decode and partial-sign a v1 packet. A v1 self-transfer from test-web already opens the sign screen, and Approve is enabled. The fee card still shows CU price, tries to write a `ComputeBudget` instruction, and reports that it could not. Risk flags, lookup expansion, and that compute-budget writer still treat a non-legacy message as v0, or skip v1 accounts entirely. `getTransaction` in `wallet/src/background/tx-ai/host-tools.ts` uses `maxSupportedTransactionVersion: 0`.

v1 is live on mainnet (feature `txv1aq4pp281K9um3tnPgkfX8UqtFT6wcVW3hNezGLL`, epoch 1035, about 2026-09-15). Priority fee on v1 is a total in lamports inside the message config. There is no CU price field. CU limit and loaded-accounts data size default to 0 when omitted, and the transaction cannot run. `ComputeBudget` instructions on a v1 message are no-ops.

## Intent

Sign, simulate, and send a v1 transaction a dapp submits. Read a landed v1 back with `maxSupportedTransactionVersion: 1`. Advertise `1` on both Wallet Standard sign features only after that path is correct.

Settings gains a **default priority fee**, separate from the existing default CU price.

| Setting | Unit | Applies to |
|---------|------|------------|
| Existing default CU price | micro-lamports per CU | unsigned legacy and v0, when the message has no price |
| New default priority fee | lamports, total | unsigned v1 from a dapp, when the config omits the priority-fee field. Also every v1 transaction this wallet builds |

Factory value: **5000 lamports** (0.000005 SOL). That matches the current default price of 25,000 micro-lamports per CU on a 200,000 CU transaction (`25000 × 200000 / 1000000`). The stored value is an integer count of lamports. Do not keep it as a JavaScript `number` once it is a fee amount in code.

Write rules:

- Signed v1: do not change the config. Show the fee that is already there and sign those bytes.
- Unsigned v1, priority-fee field absent: write the setting into the config, then simulate and sign that message.
- Unsigned v1, field present (including an explicit 0): keep the dapp's value.
- Do not append `ComputeBudget` instructions to a v1 message. Do not convert the CU-price setting into a v1 fee.
- This setting does not fill CU limit or loaded-accounts data size. A limit of 0 stays 0. The approval screen shows the config values and says the transaction cannot run when the CU limit is 0.
- Loaded-accounts data size on a dapp-submitted v1 is the dapp's value. Do not fill it, do not show an editor, and do not add a setting. Use it as written when simulating and signing. When it is missing, the approval screen says the transaction cannot run. Wallet-built transactions are the exception in the next section: those write a measured size.

Approval for v1 shows two fields: CU limit and priority fee (lamports). It does not show CU price. Both stay editable while every signature slot is empty, including after the default priority fee is filled. The user may change either value and apply it before signing. That writes the config. It does not insert `ComputeBudget` instructions.

When any signature is already non-zero, both fields are read-only. Legacy and v0 already do this: `isTransactionSigned` is any non-zero signature, `simulateSignTransaction` sets `cuEditable` false, and `wallet/src/approval/dom/fee-details.ts` sets both inputs `disabled`. They stay inputs, not plain text. v1 uses that same flag.

## Wallet-built transactions

The only transactions this wallet assembles are token send (`wallet/src/background/send/wallet-begin-send.ts`) and close-empty (`wallet/src/background/close-empty/build-close-txs.ts`). Both are `createTransactionMessage({ version: 0 })` today. Build both as v1.

Before compile, simulate once with provisional maximum CU limit and loaded-accounts data size, then write the measured values into the config. CU limit is `unitsConsumed` plus the margin close-empty already uses. Loaded-accounts data size is the simulated size rounded up to the next 32 KiB. If that simulation fails, do not send. Do not insert `ComputeBudget` instructions.

Write the settings default priority fee into the config of every one of these transactions. The user can still change CU limit and priority fee on the unsigned approval screen. Close-empty packing uses the v1 packet limit of 4096 bytes and stops at 64 addresses. `CLOSE_EMPTY_MAX_TX_BYTES` (1232) does not apply to these v1 transactions.

## Out of scope

- Address lookup tables on v1. There are none. Do not run the v0 lookup fetch for version 1.
- SIMD-0596 (96 addresses). The live cap is 64.
- Rewriting a v1 message that already has any signature.
