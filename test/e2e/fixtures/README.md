# e2e mock fixtures (curated)

Editable mock responses for `test/e2e/mock-server.mjs`.

**Source of truth for captures** lives outside this repo (`airwave-wallet-api-recording`). Do not edit that tree from e2e work. When you need new shapes, copy from a recording, sanitize, then replace files here.

## Sanitization rules
- Commit **response bodies only** (no HTTP request objects, no `Authorization` / API key query strings, no cookies).
- Never include private keys, seed phrases, unlock passwords, or raw API keys.
- Public addresses, signatures, and token metadata are OK (they appear on-chain / in explorers).
- Prefer small fixtures; trim pages if a scenario does not need full history.

## Layout
- `jupiter/tokens-v2-search.json`
- `helius/address-transactions-page1.json`
- `helius/address-transactions-page2.json`
- `openrouter/chat-completions.json`
- `openrouter/decisions.json`
