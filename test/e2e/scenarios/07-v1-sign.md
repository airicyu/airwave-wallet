# v1 sign and wallet send

Validator must accept v1 (Agave 4.2+). The priority fee setting must be **5000**.

test-web `?rpc=http://127.0.0.1:8899`. Same prep and shell as `01`.

1. Sign transaction（v1）. The fee card is CU limit and Priority fee, with no CU price field. Fee is **5000**. Approve. Log contains `v1 signTransaction returned:`.
2. Sign transaction（v1，省略優先費）. Fee shows the default **5000**. Reject. No new returned log.
3. Sign transaction（v1，優先費 0）. Fee shows **0**. Reject.
4. Sign transaction（v1，省略 CU limit）. Simulation-failure notice; Approve stays enabled. Reject.
5. Sign transaction（v1，已有簽章）. Both inputs are disabled. Reject.
6. signAndSendTransaction（v1，錢包代送）. Same fee card as step 1, no cluster mismatch. Approve. Log contains `v1 signAndSendTransaction ok:`.

**Pass:** steps 1 and 6 produce those logs. Steps 2–5 are rejects or cancels and do not add `v1 signTransaction returned:`. Step 6 has no `v1 signAndSendTransaction error`.
