# Sign transaction: durable-nonce notice — backlog

Not scheduled into a version that uses this file as its scope. **Not a contract.**

Not scheduled. It was once considered as a flag on the cancelled 0.28.0 assessment card. That version was not started. This file is still a **standalone notice**. If it later shares a card with the sign-risk check, the three sentences must not be repeated.

## Current

The `signTransaction` and `signAndSendTransaction` approval (`wallet/src/approval/`) does not check whether the transaction uses a durable nonce, and it does not show a notice for that.

[0.10.0](../0.10.0/INDEX.md) only covers a simulation side effect: `simulateTransaction` uses `replaceRecentBlockhash: true`, so a durable-nonce delta can be wrong and land in `fail` or `rpc`. Do not treat that delta as trusted. That path does not tell the user "this transaction uses a durable nonce."

## Intent

When the approval draws an unsigned transaction, the service worker statically checks the message. If the **first** instruction is the System Program `AdvanceNonceAccount` (instruction enum index `4`), the transaction uses a durable nonce.

The check reads only that instruction in the transaction bytes. Do not make an RPC call to compare the nonce account balance or account data. If the first instruction is not `AdvanceNonceAccount`, the chain will not treat the transaction as a durable nonce. A later instruction with the same name does not count.

When the check matches, the approval shows a notice (the existing notice card is enough). The copy tells the user three things:

1. This transaction uses a durable nonce. It does not expire in a short window the way a recent blockhash does.
2. Landing the transaction advances (consumes) that nonce.
3. The simulated delta on screen can be wrong under `replaceRecentBlockhash`. Do not judge the transaction from the delta alone.

The notice does **not** disable approve. Reject stays available. `signMessage` does not apply.

## Decide before scheduling

- Copy goes through the [0.23.0](../0.23.0/INDEX.md) catalog (`t(locale, key)`, three languages). Add keys when this is scheduled. Do not write a single-language string.
- Whether the notice sits above the simulation notice, or on the same card as "cannot simulate / expected to fail."

## Out of scope

- Changing the 0.10.0 simulation parameters, `replaceRecentBlockhash`, or running a second simulation for the nonce
- Disabling approve on detection, or auto-rejecting
- Creating, importing, or listing nonce accounts, or building `AdvanceNonce` for the user
- Using RPC to check that the nonce account data matches the blockhash in the message
- Declaring a new Wallet Standard method
