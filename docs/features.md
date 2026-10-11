# Features

Airwave is a non-custodial Solana **Chrome extension** wallet. Private keys are encrypted with your password and stay on this machine. The extension does not custody funds and does not sign for you. This is a developer preview — see [user-guide.md](./user-guide.md).

Version and changes: [version.md](../version.md), [changelog.md](../changelog.md). Ideas not scheduled yet: [dev-docs/roadmap/backlog/INDEX.md](../dev-docs/roadmap/backlog/INDEX.md).

---

## Custody and accounts

- A wallet password locks the local password-boxed vault. The unlock key is not kept in plaintext on disk for the long term.
- You can **generate** a 12-word wallet, **import** a seed (standard or CLI / Ledger path), or add a **watch-only** address.
- A **Combined** account aggregates several local addresses into one holdings view.
- Accounts can be renamed, reordered, and deleted (delete requires confirmation).

---

## Network and data

- **Devnet** / **Mainnet**. Devnet may use the official public RPC.
- **Mainnet requires your own JSON-RPC.** Without it the wallet will not hit the official public node, and Home stays blocked. The usual path is a [Helius](https://www.helius.dev/) key whose **RPC URL** you put in Settings → RPC (steps in [user-guide.md](./user-guide.md)).
- Settings also has optional **Helius API URL** (DAS names / icons, parsed Mainnet Activity) and **Jupiter API key** (name overrides). Those fields are not RPC.

---

## Home

- **Tokens**: holdings for the active account on the current cluster; open a mint to send.
- **Activity**: recent transactions. On Mainnet with Helius this is parsed history and can page older rows. Rows can open Helius Orb.
- **Reclaim rent**: scan zero-balance token accounts, pick some, close them in one send; rent returns as SOL.

---

## Sites and signing (Wallet Standard)

What a site sees: connect, disconnect, `signMessage`, `signTransaction`, `signAndSendTransaction`.

- Connect and sign use the approval surface: in-shell overlay if the side panel is open, otherwise a popout.
- `signTransaction` only signs and ends immediately. `signAndSendTransaction` and in-wallet send are broadcast by the wallet and wait until confirmed.
- Results return only to the originating tab. There is no default all-tab broadcast.
- Switching the active account notifies connected sites (`account change`).
- Watch-only accounts cannot sign.

Manual test dApp: [test-web](../test-web/README.md).

---

## Signing approval

The transaction approval page (including in-wallet send confirm):

- **Expected changes**: simulates using this transaction’s own blockhash (does not replace it with the node’s latest). While the page is visible, that block refreshes about every 3 seconds.
- **Fees**: computed locally from signature fees and CU, not from the simulation fee fields.
- You can edit CU limit / price and open Solana Explorer Inspector.
- A failed simulation (for example `BlockhashNotFound`) does not disable approve. Approve is disabled only when the transaction cannot be decoded.
- `signMessage` is a readable-text approval. No simulation, no AI.

---

## Transaction AI analysis (optional)

Settings → AI settings: add an [OpenRouter](https://openrouter.ai/) API key and turn it on. Signing a transaction then starts one read-only assess.

- The loop runs in a **manifest sandbox** (no `chrome.*`, no network). The service worker performs model and RPC calls.
- A single **AI analysis** row sits under the approval title. When done it shows a risk index; tap to open the report overlay.
- It never blocks approve, does not rerun on simulation refresh, and does not persist the report to storage.
- Current architecture: [research/extension-runtime-and-tx-ai.en.html](../dev-docs/research/extension-runtime-and-tx-ai.en.html) ([中文](../dev-docs/research/extension-runtime-and-tx-ai.html)).

---

## Shell and locale

- The main shell is the toolbar **popup** or the Chrome **side panel**; you can switch between them.
- UI languages: Traditional Chinese, Simplified Chinese, English (first row in Settings).
- The hamburger menu has About, which embeds the same disclaimer and terms of use.

---

## Deliberately not done

- No seed custody, no signing on your behalf, no disabling approve because of an AI grade.
- Helius API is never used as a JSON-RPC fallback.
- No per-result RSA encrypt / decrypt theater between inject and the extension.
- In-wallet chat, delegated swaps, and auto-approve are out of scope.
