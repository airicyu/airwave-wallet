---
name: e2e-wallet
description: >-
  Runs Airwave Wallet e2e scenarios in Chrome against a local solana-test-validator
  and the test/e2e mock server. Use when the user asks to run e2e, a scenario
  under test/e2e/scenarios, or to exercise the wallet with the local validator.
---

# Airwave e2e

Scenarios live in [`test/e2e/scenarios/`](../../../test/e2e/scenarios/). Services and setup follow [`test/e2e/README.md`](../../../test/e2e/README.md).

Reply to the user in Traditional Chinese. Do not write passwords, mnemonics, or API keys into scenarios or reports.

## Architecture (keep these apart)

- **`solana-test-validator` (`:8899`)** is **Solana JSON-RPC** (balances, airdrop, send, confirm). Each scenario runs `bun run e2e-validator` to reset the ledger, then `solana airdrop … --url http://127.0.0.1:8899` when it needs SOL. Do not mock this RPC.
- **mock (`:8787`)** is **extension HTTP only** (Helius activity, Jupiter token search, OpenRouter AI, blockhash probe for another cluster). Responses are synthetic fixtures in [`test/e2e/fixtures/`](../../../test/e2e/fixtures/). Do not hit the live network.

## Mock data (synthetic)

Runtime reads [`test/e2e/fixtures/`](../../../test/e2e/fixtures/) (optional override: `AIRWAVE_E2E_FIXTURES`). Files are handwritten or generated fake data, not production captures. Rules are in that directory's `README.md`.

- `jupiter/tokens-v2-search.json`
- `helius/address-transactions-page1.json`
- `helius/address-transactions-page2.json`
- `openrouter/chat-completions.json` (must contain `What This Transaction Does`)
- `openrouter/decisions.json`

## Before a run

1. `bun run e2e-preflight` (hard-fail if `solana` / `solana-test-validator` is missing, or any of the five fixtures is missing).
2. Load the unpacked extension from `wallet/dist`.
3. **Shell / Side panel (required for connect & sign)**
   - **Never** open `chrome-extension://…/src/sidepanel/index.html` (or popout/approval) as a normal browser tab. That is not Chrome’s Side panel and breaks the shell.
   - First-run / unlock may use the **toolbar action popup** until Home chrome is visible.
   - Once Home is up: open the toolbar popup → click `#btn-shell-to-sidebar` (sidebar icon; `shell.toSidebar`) so Chrome opens the **real** Side panel via `chrome.sidePanel.open`. Do connect / allow / sign / approve **inside that Side panel**.
   - If the sidebar button is missing, you are not on Home in the action popup yet — finish onboard/unlock first. Do not fall back to a tabbed extension page.
4. `bun run e2e-mock`, then confirm `http://127.0.0.1:8787/health` is `ok: true`.
5. For **every** scenario, `bun run e2e-validator` and wait until `:8899` accepts connections. Do not reuse the previous scenario's ledger.
6. `bun run test-web` (bind `127.0.0.1` if the default Vite listen is IPv6-only/`localhost`).
7. Apply the wallet settings in the README (**agent sets these after vault exists** — cluster, Devnet RPC, Debug, Mainnet blockhash RPC / Jupiter / OpenRouter / Helius bases as needed). Do not set a custom RPC on Mainnet. Password/onboard is out-of-band (operator).
8. When SOL is required: `solana airdrop <amount> <address> --url http://127.0.0.1:8899` (do not use the test-web default public Devnet airdrop).

## Unlock

The password is supplied out of band by the runner. Do not write it into a scenario or a report.

## Steps and verdict

Follow only that scenario's steps. Stop if `test-web` `rpc` / `otherRpc` does not match the scenario. On pass, name the scenario file. On fail, name the step and the on-screen text. Do not mark an unrun scenario as passed.

Scenario `01` checks the test-web log for `Broadcast signature:` and `Confirmed:` (printed after both confirmed and finalized). Scenario `07` checks the v1 fee card and the logs `v1 signTransaction returned:` and `v1 signAndSendTransaction ok:`.

## Alpenglow and confirmation

Local `solana-test-validator` finalizes in about 150ms after Alpenglow. The wallet and scenarios may treat "confirmed" as finalized-only. Do not wait for a separate confirmed intermediate state.
