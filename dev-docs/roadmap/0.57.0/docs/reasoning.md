# 0.57.0 reasoning

The sign AI was exercised with hand-built transactions. Those trials showed three gaps.

A missing program id made simulation stop before any balance delta. The suspicious sample now calls the real Address Lookup Table program and then Assigns the fee payer to it, so the dangerous step is the owner change.

A failed compute-unit probe still reported `unitsConsumed`. The wallet multiplied that partial number by 1.1 and wrote it as the limit, so the next simulation died with `ComputationalBudgetExceeded`. A failed probe is not a measurement.

A durable nonce does not expire with a recent blockhash. Signing a transfer that cannot pay today still leaves a signature that can be submitted after the balance grows. Creating the nonce account is the same capability. The host floors that flag at watch so a model that only sees a failed simulation cannot clear it.

The steal sample used to move 1000 SOL and then touch a token account that did not exist, so simulation stopped on insufficient lamports. It now moves 0.001 SOL and creates the token accounts inside the transaction. The page still does not broadcast it.

e2e scenarios stay on the existing safe buttons. The danger panel is for a person who will reject the approval.
