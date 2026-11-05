# Sign off-chain message

Same shell and settings as `01`. No airdrop required (off-chain signing does not spend SOL). Side panel must stay open so the approval lands in the Side panel, not a popout.

1. Open `http://127.0.0.1:5173/?rpc=http://127.0.0.1:8899`. Connect if needed.
2. Click **Sign off-chain message** (`#sign-offchain`).
3. In the Side panel, confirm title **Sign message**, readable text includes `Hello from Airwave off-chain`, Approve and Reject both available. Approve.

**Pass:** test-web log has `Off-chain signature base58:` and `Off-chain signed bytes:`, and no `Off-chain error`.
