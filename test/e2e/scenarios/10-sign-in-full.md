# Sign in (full SIWS)

Same shell and settings as `01`. No airdrop required. Keep the Side panel open.

1. Open test-web with Devnet RPC. Connect if needed.
2. Click **Sign in full** (`#sign-in-full`).
3. In the Side panel, title is **Sign in**. The statement card shows the composed SIWS text (domain, address, statement about swap.app, URI, Version, Chain ID, Nonce, Issued At, Expiration Time, Not Before, Request ID, Resources). Nine lines fit before scroll. Approve and Reject both available. Approve.

**Pass:** test-web log has `Sign in full signature base58:` and `Sign in full statement:`, and no `Sign in full error`. The statement text includes `Sign in to swap.app`.
