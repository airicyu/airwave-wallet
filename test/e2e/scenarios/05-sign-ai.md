# Sign AI (one round)

Same prep as `01`. OpenRouter base `http://127.0.0.1:8787`, sign-tx AI on, any non-empty OpenRouter key.

1. Open test-web `?rpc=http://127.0.0.1:8899`, then Sign transaction.
2. Wait for the analysis on the approve screen. Do not Approve.

**Pass:** the analysis contains `What This Transaction Does`, and the request hit mock `/api/v1/chat/completions`. Then Reject or dismiss.
