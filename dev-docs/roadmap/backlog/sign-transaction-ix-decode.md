# Sign transaction: Anchor IDL instruction decode — backlog

An idea, **not a contract**. The **static common parser** and **Explorer Inspector** shipped in [0.19.0](../0.19.0/INDEX.md) (see that version's INDEX and HOW). This file tracks only the **Anchor IDL** layer (and later metadata / ELF). It is still unscheduled.

Related to the "transaction details" on the sign approval. As of 0.19.0, known variants decode into fields. Everything else is still a short account list plus hex. See the [0.19.0 INDEX](../0.19.0/INDEX.md).

## Intent

Decode stays layered and is **only a detail aid**, not the approval stage. The UI **trusts only** the `instructions[]` returned by the service worker. A decode failure means that row stays hex. An IDL does **not** block approve.

1. **Known common programs (static)** — **shipped** (0.19.0).
2. **On-chain or otherwise available Anchor IDL** (IDL account; metadata / ELF may be added later; cache by `programId`; one lookup per program per transaction, preferably `getMultipleAccounts`) → discriminator plus Borsh yields the instruction name, args, and account names. No IDL → layer 3.
3. **Otherwise** short accounts plus data hex.

Do not scrape GitHub as an IDL source. An unresolved v0 lookup account is labeled unresolved. Do not mis-assign it. Do not draw CPI inner instructions.

## Decide before scheduling

- The first common-program list (at least System, Compute Budget, Token, Token-2022, ATA; whether Memo, ALT, and Stake are in the same version).
- Whether Token uses a handwritten parser or `@solana/spl-token`.
- Whether IDL lookup is only the legacy Anchor IDL account, or also Program Metadata / ELF.
- How dense the expanded details are: short labels by default, and whether accounts and fields collapse one more level.

## Out of scope

- Replacing the simulated delta with the decode as the main stage
- Disabling approve while waiting for an IDL
- A general decoder for arbitrary closed-source programs
- Declaring a Wallet Standard method that is not implemented
