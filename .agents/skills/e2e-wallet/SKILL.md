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

- **`solana-test-validator` (`:8899`)** is **Solana JSON-RPC** (balances, airdrop, send, confirm). Each scenario runs `bun run e2e-validator` to reset the ledger, then `solana airdrop ??--url http://127.0.0.1:8899` when it needs SOL. Do not mock this RPC.
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
   - **Never** open `chrome-extension://??src/sidepanel/index.html` (or popout/approval) as a normal browser tab. That is not Chrome? Side panel and breaks the shell.
   - First-run / unlock may use the **toolbar action popup** until Home chrome is visible. Keep that popup at Chrome's default toolbar size. Do not maximize, fullscreen, or stretch it.
   - Once Home is up: open the toolbar popup ??click `#btn-shell-to-sidebar` (sidebar icon; `shell.toSidebar`) so Chrome opens the **real** Side panel via `chrome.sidePanel.open`. Do connect / allow / sign / approve **inside that Side panel**.
   - If the sidebar button is missing, you are not on Home in the action popup yet ??finish onboard/unlock first. Do not fall back to a tabbed extension page.
4. `bun run e2e-mock`, then confirm `http://127.0.0.1:8787/health` is `ok: true`.
5. `bun run test-web` (bind `127.0.0.1` if the default Vite listen is IPv6-only/`localhost`).
6. Apply the wallet settings in the README (**agent sets these after vault exists** — cluster, Devnet RPC, Debug, Mainnet blockhash RPC / Jupiter / OpenRouter at the mock as needed). The Helius field is an API key; do not set it to `http://127.0.0.1:8787`. Do not set a custom RPC on Mainnet. Password/onboard is out-of-band (operator).
7. Confirm **default priority fee is `5000`** before scenarios that assert fee UI (especially `07`). If it is something else (e.g. `25000`), set it back first.
8. For **every** scenario that needs the ledger: run **one** prep, not a manual double airdrop:
   - Preferred: `bun run e2e-prep -- <address>` (kills/restarts validator with `--reset`, airdrops **once**, prints balance, leaves validator running).
   - Or: `bun run e2e-validator` then a **single** `solana airdrop ??--url http://127.0.0.1:8899`.
   - Do **not** airdrop again in the same scenario after prep. Scenario `04` needs no airdrop.
   - After reset/airdrop, Refresh Side panel Assets before trusting the balance (stale UI is common).
9. Do not use the test-web default public Devnet airdrop button.

## Unlock

The password is supplied out of band by the runner. Do not write it into a scenario or a report.
Automated password fill into `chrome-extension://` usually fails ??ask the operator to Unlock by hand, then continue from Home / Side panel.
After unlock, verify settings (RPC, Debug, mock bases) and **priority fee `5000`** before the first scenario.

## Steps and verdict

Follow only that scenario's **Pass** paragraph. Stop if `test-web` `rpc` / `otherRpc` does not match the scenario. On pass, name the scenario file. On fail, name the step and the on-screen text. Do not mark an unrun scenario as passed.

Behavior scenarios are sidepanel only. Do not copy a scenario per shell.

## Alpenglow and confirmation

Local `solana-test-validator` finalizes in about 150ms after Alpenglow. The wallet and scenarios may treat "confirmed" as finalized-only. Do not wait for a separate confirmed intermediate state.

## Visual check

When the user asks to verify UI, follow [`test/e2e/visual/README.md`](../../../test/e2e/visual/README.md). The shot list is only [`test/e2e/visual/matrix.yaml`](../../../test/e2e/visual/matrix.yaml).

Open `refs/{shell}/en/{id}.png` beside the live frame and check that shot's `look` lines. Ignore window height, chrome around the panel, address text, and the exact SOL digits. A `look` miss is a report to the maintainer, with the shot id and shell. Do not replace a ref until they confirm.

## Known limits

- Scenarios 01–10 assert behavior, on-screen state, and logs.
- A real docked Chrome Side panel is hard for ordinary Playwright to drive; agent or manual UI clicks are expected.

## Dangerous test-web samples

Do not click, and do not approve, the test-web panel **危險樣本**. Button ids: `#sign-tx-suspicious`, `#sign-tx-nonce`, `#sign-tx-steal`. They assign the wallet away, advance a durable nonce and transfer SOL, or approve and close token accounts to a stranger. No scenario uses them. If one is open by mistake, reject it. Do not sign it.

## Sign message / Sign in (0.56+)

Scenarios `08`–`10` cover `solana:signOffchainMessage` and `solana:signIn` via test-web `#sign-offchain`, `#sign-in-short`, `#sign-in-full`. Keep the real Side panel open so approvals land there (otherwise the wallet opens a popout). No airdrop. Visual goldens: `approve-offchain-message`, `approve-sign-in-short`, `approve-sign-in-full` (sidepanel × en only).

