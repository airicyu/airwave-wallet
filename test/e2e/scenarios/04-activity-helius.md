# Activities (Helius mock)

**Blocked.** This scenario cannot pass against the local mock, because Activity always uses `https://api.helius.xyz`.
It becomes runnable again only after the wallet has a Debug override for the Helius API origin, the same kind of override Jupiter and OpenRouter already have.
The steps and Pass below are kept for later restore.

No validator airdrop. Mock on `:8787`.

**Settings:** Cluster Mainnet, no Mainnet custom RPC, Helius API URL `http://127.0.0.1:8787`.

1. Side panel Activities, then Refresh.
2. Load more (or the scroll sentinel) so page 2 appears.

**Pass:** the list is non-empty, and page 2 rows differ from page 1. Traffic goes to `127.0.0.1:8787` `/v0/addresses/.../transactions`. Restore Devnet RPC settings afterward.
