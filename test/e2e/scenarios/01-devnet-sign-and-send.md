# Devnet sign and send

**Shell:** real Side panel (`#btn-shell-to-sidebar` from the Home popup).

**Prep:** `bun run e2e-prep -- <address>` once. Do not airdrop again.

**Settings:** Devnet, RPC `http://127.0.0.1:8899`, Debug on, Mainnet blockhash RPC `http://127.0.0.1:8787`, no Mainnet custom RPC, priority fee `5000`.

1. Open `http://127.0.0.1:5173/?rpc=http://127.0.0.1:8899`. The log RPC must match.
2. Connect, then Allow in the Side panel.
3. Sign and send transaction, then Approve. There must be no cluster-mismatch notice.

**Pass:** test-web log has `Broadcast signature:` and `Confirmed:`, and no `Sign and send error`. After Refresh, Home SOL is less than 2.
