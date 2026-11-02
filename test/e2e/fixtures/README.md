# e2e mock fixtures (synthetic)

Hand-written / generated **fake** HTTP responses for `test/e2e/mock-server.ts`.

These are **not** production recordings. They exist so agent-driven e2e can stay offline and repeatable for **non-Solana** surfaces (Helius activity, Jupiter token search, OpenRouter AI). Solana JSON-RPC for the active cluster comes from `solana-test-validator`, not from these files.

## Sanitization / safety
- Response bodies only; no API keys, Authorization headers, cookies, private keys, or seed phrases.
- Use obviously synthetic names, signatures, and accounts.
- Keep fixtures small.

## Layout
- `jupiter/tokens-v2-search.json`
- `helius/address-transactions-page1.json`
- `helius/address-transactions-page2.json` (signatures must differ from page 1)
- `openrouter/chat-completions.json` (must include the phrase `What This Transaction Does` for scenario 05)
- `openrouter/decisions.json`
