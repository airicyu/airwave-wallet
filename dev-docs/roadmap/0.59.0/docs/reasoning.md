# 0.59.0 reasoning

The Default Ring is the selling surface: a private balance on the user's existing Solana address, without deploying a program. Custom Rings, anonymous transfer, and a fiat ramp are a different product. This version stops at the permissionless confidential ring.

Deposit into that ring does not hide the deposit itself. The user-facing verb is Shield so the button is not confused with a private Send. Unshield is the exit back to a public balance. Private Send refuses an address that has no registry record, instead of silently turning the payment into a public withdrawal.

Registration publishes the viewing public key and the nullifier public key, and it pays the network fee from public SOL. The user sees that transaction on the normal approval screen. The wallet signs it only after that approval. An earlier draft treated the register button as enough consent and skipped the screen. That hid the only view of the transaction. Every signature in this version is one the user has already seen. Send, Unshield, and Merge also need a Groth16 proof bound to that exact transaction, so the proof is requested while the transaction is built, not earlier. Register does not request a proof.

Naming privacy instructions was not enough for Risk index: Decisions still treated anything that was not a transfer or DEX as thin evidence. The report now teaches a general instruction-first reading. Decisions grades from labels, privilege flags, and asset-path clarity, without naming product programs, so a clean labeled config or key publish can be low without a whitelist.

The 40-note spend cap and the 52-note merge cap are protocol limits. The UI blocks a spend that does not fit and lets the user merge on purpose. It does not merge as a side effect of Send.

The off-chain signature of `TSPP/derive/v1` is the seed for the viewing key. A dApp that obtains it can read this account's private history. The sign paths reject that payload before approval. The wallet still derives the key itself after unlock, in memory only.

`@heliuslabs/spr` is an alpha and the prover sees the spend plaintext and the nullifier secret. That dependency is accepted for this version because local proving is not available. Amounts stay integers. The saved Helius RPC URL is the only endpoint, so the feature does not add a second secret setting.

## Screens

The approved demo is the layout. These are the reasons behind the choices the user made while reviewing it.

Private balances stay inside Assets. The bottom bar is still Assets and Activities. Tokens and Private Balances are sub-tabs of Assets, and the Assets heading above the list goes away because the sub-tabs already name the list. "Public" and "Shielded" were rejected as the pair of labels. Tokens keeps the name the home list already uses. Private Balances names the new list.

A private token row is the same card as a public token row: shield slot, icon, name, quantity, USD. The whole card opens the token detail. The expand control only reveals UTXOs. A UTXO row is not a page. Its only contents are an id and an amount, so a detail screen would repeat the row. On a combined account the first expand matches the existing member panel. Each member has its own expand, collapsed by default, because that member's UTXOs are a second level, not a second card style. Combined stays read-only in this version: no Register and no Shield, Unshield, private Send, or Merge. Those actions land together in a later version so the combined signing path is not half-finished. The list still aggregates every vault member that is registered, matching the approved combined panel in the design demo.

The private token detail follows the public token detail and drops the Jupiter shield, which that page does not show. The buttons are Send, Shield, Unshield, and Merge UTXO. Amount and Mint stay the public detail's rows. Under Mint, the UTXO block is a title, then `Number of UTXOs` with the count beside the label. Splitting the count to the far edge made the label look like a separate field. At 40 or more UTXOs the detail warns the user to run Merge UTXO. Forty is the spend cap, so the warning appears at the same point a later Send would be blocked. The list scrolls in place.

Shield is the public Send form with no recipient: the public balance, a rule, then the amount. An earlier draft put the private total next to the amount and under a downward arrow. That grouping read as if the amount were limited by the private balance. The private total is not an input to Shield, so it left the page. The token picker exists only when Shield is opened from Private Balances, because no mint has been chosen yet. Its title is Shield token. One line, "Select a token to shield", is the guide. The rows are the token cards, including an empty shield slot for an unverified mint, and the quantity is not prefixed with a word such as "public".

Private Send uses the public Send form and is titled Private balance send plus the symbol, so it is not mistaken for a public send. The UTXO list is collapsed under a disclosure on the left of the title, the same control as transaction details, not the chevron used on token rows. Auto select sits on that same row, at the right, on one vertical center with the title. It is a toggle. Turning it off expands the list, because the user is about to pick notes. Turning it on does not move the disclosure. The list fills down to Confirm and scrolls inside that block. There is no sentence explaining change. Unshield has no recipient control: the amount always returns to the same wallet. Its top line is the private balance, then the amount, then the same UTXO disclosure.

Merge is titled Merge UTXO plus the symbol. The count uses the same `Number of UTXOs` line. "Notes" is a protocol word and was not understandable on the screen. Select all and Clear all are two buttons. A select-all checkbox was ambiguous once the user cleared one row. The buttons sit a short gap apart.

Copy stays on the control and the value. The register sentence stays one line on every unregistered state, including loading and the fee block. It tells the user to register. Consent is the approval screen, where the transaction is visible. The token-picker line and the 40-UTXO warning are one line each and tell the user what to do on that screen. A paragraph about what will become public, or what a balance means, does not go on the form. That fact belongs on the approval screen when value actually moves.
