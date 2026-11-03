# 0.54.0 reasoning

v1 is live on mainnet. Kit 8.4.0 already decodes and partial-signs it, and a test-web v1 self-transfer already opens the sign screen with Approve enabled. The fee card still treats that message as legacy or v0: it shows CU price and tries to append a `ComputeBudget` instruction, which v1 ignores.

The wallet therefore has to read and write the v1 config. Priority fee there is a total in lamports, so it does not reuse `defaultCuPrice`. The new setting is 5000 lamports, the same cost as the current default price on a 200,000 CU transaction. It fills only an omitted field on an unsigned dapp v1, and it is written into every v1 transaction this wallet builds.

CU limit and loaded-accounts data size on a dapp v1 stay the dapp's values. A correct builder sets them. Filling them would change a message the user did not ask to change. When they are missing, simulation fails and the existing failure notice is enough.

Send and close-empty are the only transactions this wallet assembles. Both become v1. One simulation of a provisional packet (CU limit 1400000, loaded-accounts data size 67108864) supplies the two resource fields. The lamport reserve for those flows uses the stored priority fee, not `defaultCuPrice`. Close-empty packing uses the 4096-byte packet and stops at 64 addresses, which is the live v1 cap. Keeping 1232 would throw away the only reason to build those batches as v1.

`supportedTransactionVersions` gains `1` so a dapp that checks the list will send v1. The list does not block bytes. Dapps that skip the check already reach the sign screen.
