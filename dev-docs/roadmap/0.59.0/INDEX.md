# 0.59.0 — Private balance on the Default Ring

- **Status:** `in progress`
- **Upstream:** [0.58.0](../0.58.0/INDEX.md) is shipped. This version does not change it.
- **Backlog:** none. This INDEX wins. Protocol notes live in [helius-privacy-rings.md](../../research/helius-privacy-rings.md). On conflict, this INDEX wins.
- **This file is the requirement.** [docs/how.md](./docs/how.md) is direction only. The user approved the concept demo at [privacy-balance-ux.html](../../design-demos/0.59.0/privacy-balance-ux.html) on 2026-11-12. That demo wins on screen layout when this file does not name a control. Do not implement `wallet/src` until the user asks.

## Product

A signing wallet account can keep a private balance on Helius's permissionless Default Ring. The home screen gains a private-balance tab. The user registers once from that tab, then sees decrypted totals, shields public tokens in, sends to another registered address, merges notes, and unshields back to a public address. Custom Rings are out of scope.

## Docs

1. This file
2. [docs/reasoning.md](./docs/reasoning.md)
3. [docs/how.md](./docs/how.md)

## Requirements

### What the user can do

One signing Solana address registers once. That registration is for every Ring. This version only shows the Default Ring. After register, the user can:

- Read private totals and the unspent UTXOs behind each total.
- Shield a public balance into the Default Ring.
- Send a private balance to another registered Solana address.
- Merge their own notes of one mint into fewer notes.
- Unshield a private balance to a public address.

A watch-only address can do none of these. On a watch-only account the public token detail does not show Shield. The Shield page is not opened for that account. On a watch-only account the Private Balances sub-tab stays visible, shows one unavailable sentence, and shows no register button and no Shield, Send, Unshield, or Merge action. A combined wallet account signs only with the main wallet, and only when that address has a vault key.

### Cluster, money, and keys

The feature uses the wallet's selected cluster and the Helius RPC URL already saved for that cluster. Indexer reads and proofs use that host. There is no second API-key field. If the saved URL is not a Helius URL that serves the privacy API, the private-balance tab says the feature is unavailable and shows no actions.

Amounts, fees, and note values are base-unit integers. The UI formats them. JavaScript `number` is not used for them.

After unlock, the service worker derives `viewing_sk` and `nullifier_secret` in memory from that account's Ed25519 key and the fixed off-chain message `TSPP/derive/v1`. Lock clears them. They are not written to `chrome.storage`, logs, or the screen. The wallet's own derivation does not go through a dApp sign command.

`dapp.signMessage`, `dapp.signOffchainMessage`, and `dapp.signIn` reject any payload whose bytes contain UTF-8 `TSPP/derive/v1`, including an off-chain envelope wrapped around that text. Rejection happens before the approval screen. There is no prompt. `signMessage` has no message-type field. Detection is a scan of the raw bytes.

The network fee is paid from the public SOL balance of the signing address. A private balance alone does not pay it. Send, Unshield, and Merge also need a Groth16 proof. The proof is requested from Helius only while that v1 transaction is being built. It is bound to the amount, the selected notes, the recipient, and that transaction's ephemeral key. Editing any of those after a proof was built discards the proof. The approval screen opens only after the proof returns. Shield does not request a proof. While a proof or a submit is in flight, the confirm control shows a spinner and ignores further clicks. A failed proof stays on the form and shows the error. If the approval screen is showing and its request id is already gone, the wallet leaves that screen: back to Unshield, private Send, Shield, or Merge when that flow is the one in progress, otherwise home. It does not stay on an empty approval page.

### Home

The bottom bar stays Assets and Activities. Inside Assets, a sub-tab row sits above the list and replaces the Assets heading. Its labels are Tokens and Private Balances. Tokens keeps the public token list. Private Balances is the new list. Activities is unchanged and is not a third sub-tab.

**Public token row.** The Tokens list stays the current card: Jupiter shield and score, icon, token name, quantity under the name, and the USD amount on the right. A single account has no chevron. Tapping the card opens the public token detail. Shield is on that detail, next to Send, and is not a control on this row.

**Private-balance tab, not registered.** The tab itself is the register surface. There is no other register page. The copy is one sentence, the same on the unregistered tab, while that button is loading, when the fee cannot be paid, and on Shield before register: register this wallet before using it for the first time. That copy is centered. The register button stays horizontally centered under it. The group is vertically centered in the space under the Tokens / Private Balances sub-tabs. The button on the tab is the consent. It builds, signs, and submits one transaction that writes those two public keys and sets merge encryption to `PoseidonCtrV1`. It does not open the generic approval screen. The button shows a full-screen wait until the transaction is confirmed. If public SOL cannot pay the fee, the button stays disabled. Failure stays on this state and the button can be pressed again. Success replaces this state with the balance list in the same tab.

**Private-balance tab, registered.** The tab lists Default Ring totals, one row per mint, using the same card as Tokens: Jupiter shield and score, icon, token name, quantity under the name, and the USD amount on the right. Rows start collapsed. Hovering a row uses the pointer cursor. Tapping the row opens the detail. The public Tokens list uses that same cursor. The expand control is the same button as on Tokens: it points right while collapsed and down while expanded. It appears only when there is something to show. On a single signing account, expanding lists that mint's unspent UTXOs. Each note puts the UTXO id on the left in smaller, dimmer type, and the amount on the right. Both stay one line and ellipsize when they do not fit. There is no UTXO detail page. A note is not a control: it has no pointer cursor and does not navigate. There is no checkbox on this list. Tapping the token card, and not the expand control or a note, opens the private token detail.

On a combined wallet account, expanding a private row uses the same member panel as Tokens. Each member shows the short address, that member's share of the private total as a percent, the amount, and the percent bar. A second expand control sits on the right of that member block. It starts collapsed. Expanding it lists that member's UTXOs under the member. Tapping the token opens the main wallet's private token detail, not a summed detail. A member with no vault key has no row on the private member panel and is not included in the private total. This version does not show a public Shield note for that member on the private tab. Register and the four actions use the main wallet only.

The tab also has Shield and Unshield. Each is an icon button: icon on the left, label on the right, dark fill, two buttons on one row. Shield opens a list of tokens whose public balance on the signing address is above zero. Unshield opens a list of tokens that have a private balance. Each row is the same card as Tokens: the Jupiter shield slot, then the icon, name, quantity, and USD amount. An unverified mint keeps the empty shield slot. The quantity is not prefixed with a word. One line above the Shield list says to select a token to shield. One line above the Unshield list says to select a token to return to a public balance. Choosing a row opens that mint's Shield or Unshield page. The Shield list does not include a mint that has only a private balance. The Unshield list does not include a mint that has only a public balance. While the first status request is in flight, the tab shows two skeleton cards instead of the list or the unavailable sentence.

UTXO rows on the balance list, the token detail, Send, Unshield, and Merge are full-width cards. Each card shows a shortened `utxo_hash` (`first 4` … `last 4`), a copy control for the full hash, and the amount with its token unit. Sorting by id uses the full hash, ascending. Those rows do not open another page. The id, the address, and the amount use `Menlo, "Cascadia Mono", ui-monospace`. Labels stay on the body face.

### Private token detail

The page uses the public token's icon and name. Native SOL is Solana, and its mint row says Native. There is no Jupiter verified shield on this page. Under the name, the buttons are Send, Shield, Unshield, and Merge UTXO, in that order, two per row. Each button is an icon on the left and a label on the right, on a dark fill. The icon colors are blue, green, amber, and purple in that order. A gap, a horizontal line, and another gap sit under the buttons, then Amount and Mint. Amount includes the token unit. Under Mint, the title UTXOs, then the count. When that count is 40 or more, a one-line warning under the count suggests Merge. Then the UTXO cards. The list scrolls inside itself when it does not fit. A note in that list does not navigate. While the mint's private row is loading, the page shows a skeleton instead of Unavailable.

Shield opens the Shield page for this mint and does not ask the user to pick the token again. Opening Shield clears the amount draft. Reject of that Shield approval keeps the amount. Send, Unshield, and Merge UTXO open their pages. Opening Send from this page clears the private-send draft. Opening Unshield from this page returns to this page. Opening Unshield from the private-tab picker returns to that picker.

On a combined account this page is the main wallet's balance only.

### Shield page

The form matches the public Send screen. The title is Shield and the token symbol. Balance is the public balance of the signing address, with the label on the left and the amount on the right. Amount, 50%, and Max are one row. Those percents use that public balance. They do not use a combined sum and they do not use the private total. There is no recipient field and no explanatory paragraph. A horizontal line sits under Balance, and the amount row is under that line. Confirm sits at the bottom and opens the normal approval screen.

If the address is not registered, the page shows the same sentence and the same register button as the tab, with the same loading and error behavior. The back control at the top left leaves the page. After register succeeds, the page stays open and shows the amount form.

Confirm builds one v1 transaction and opens the normal approval screen. There is no proof step. Reject returns to this page with the amount unchanged.

### Send page

The top of the page matches the public Send screen. The title is Private balance send and the token symbol in parentheses. Balance is this mint's private total for the signing address. Amount, 50%, and Max are one row and use that private total. Recipient is the same field as public Send: a manual address, or the address book on the right. Entering Send from the private token detail clears the amount, the recipient, and the note selection. Returning from the address book, or rejecting the approval, keeps that draft. There is no paragraph about change. Below the recipient, a horizontal line separates the form from a section titled UTXOs selection. Under the divider, one row has the disclosure triangle and the title UTXOs selection on the left, and the auto-select toggle on the right. The UTXO list sits in a card under that row. The card starts collapsed. Turning auto select off expands the card. Turning it on does not expand or collapse the card. When the card is expanded, it fills the space down to Confirm and the list scrolls inside it.

The list is sorted by amount descending, then UTXO id ascending. Auto select is a control and it starts selected. While it is selected, the wallet selects notes in that sort order until their sum covers the entered amount, and it reselects when the amount changes. While it is off, the user selects notes. If the selected sum is below the amount, the page shows insufficient balance and blocks submit.

If the user selects more than 40 notes, or the amount would need more than 40 notes in that sort order, one line says the selection is over the limit of 40 UTXOs and submit stays blocked. The page does not open Merge and does not merge by itself.

When the recipient field has a Solana address, the wallet reads `getUserRecords` for it. No record shows that this address is not registered and blocks Send. A record is kept for the build: `owner_hash` is computed from the address and `nullifierPubkey` and is written onto the new note, and `viewingPubkey` encrypts the amount. The page does not ask the user to type either value.

Submit builds one v1 transaction, asks Helius for the proof as part of that build, then opens the approval screen. Reject returns to this page with the amount, the auto-select state, and the selected notes unchanged. If the selected sum is greater than the amount, the difference is a new private change note back to the sender. The approval screen shows the send amount and the change amount.

### Unshield page

The title is Unshield and the token symbol. There is no recipient field and no arrow. The amount always returns to the signing address. The top line is this mint's private balance. Amount, 50%, and Max are one row and use that private balance. A horizontal line sits under the private balance, then the amount row. Another horizontal line sits under the amount, then the same UTXOs selection row and card as Send, including auto select, the insufficient-balance line, and the 40-UTXO limit line. There is no paragraph on this page. The approval screen uses the normal confirming view. Change stays a private note.

### Merge page

The title is Merge UTXO and the token symbol in parentheses. The page lists this mint's unspent UTXOs, shows the count as Number of UTXOs, and sorts them by amount ascending, then UTXO id ascending. The user selects notes. Select all selects every note that can be merged. Clear all clears the selection. A note with non-empty `utxo_data` cannot be selected and does not count. Merge does not pay another address and does not change the owner. The total stays the same.

52 or fewer selected notes are one v1 transaction and one approval. More than 52 are split into groups of at most 52. Those groups use the same batch approval as closing empty token accounts. Each group gets its own proof while that transaction is built. The groups do not reuse the same notes. Success returns to the private-balance tab. Reject leaves the selection unchanged.

### Copy

New strings live in the Traditional Chinese, Simplified Chinese, and English catalogs. The action labels are 轉入私人, 轉回公開, and 合併 UTXO in Chinese, and Shield, Unshield, and Merge UTXO in English. Page titles say the balance is moving into a private balance or back to a public balance. They do not say the action is a plain token transfer. Send stays the existing catalog string. Code that calls the protocol keeps the instruction names `deposit` and `withdraw`. Settings labels for the Helius, Jupiter, and OpenRouter credentials are in the three catalogs. The visible Helius label is Helius API key, not Helius API URL. The stored field is still `heliusApiUrl`, and the stored value is the API key. A previously saved URL is read as its `api-key` query. Private-balance calls use `devnet.helius-rpc.com` or `mainnet.helius-rpc.com` for the wallet cluster. Mainnet Activity uses `https://api.helius.xyz`. Neither call uses the RPC list. Back from AI settings returns to Settings. Confirm and discard controls use the same boxed green tick and red cross. On AI settings, Default model rows stay plain cards. Custom model rows show the tick and cross only after that row's model id changes. Dragging a row writes the new order immediately. An RPC URL editor shows the tick and cross only after the text changes. The cross restores the field. The tick still saves. Each Settings hub row starts with an icon.

Popup and popout body text stays `"Segoe UI", "Microsoft JhengHei UI", "PingFang TC", sans-serif`. UTXO receipts, wallet addresses, and balance amounts use `Menlo, "Cascadia Mono", ui-monospace`, then the same Chinese faces. No webfont is bundled.

### Combined account, local wallets

On create, pasting addresses uses a multi-line field. Confirm still splits on whitespace, commas, and line breaks, keeps public keys, and drops blanks and keys already in the draft. Choosing local accounts shows one line: select the wallet accounts to add. Under it, each local account is a checkbox row: the name on the left, the short address on the right. A row already in the draft stays disabled and says it is already added. Confirm still appends the checked addresses and returns to the create page.

## Out of scope

- Custom Rings, anonymous rings, a relayer, a fiat on-ramp, and a private swap.
- A dApp method for private balances.
- A second API-key field. The saved Helius RPC URL is the endpoint.
- Exporting or displaying `viewing_sk` or `nullifier_secret`.
- Auto-starting a merge when Send or Unshield exceeds 40 notes.
- Turning a private Send to an unregistered address into a public withdrawal.
- Absorbing or changing 0.58.0.

## Acceptance

- [ ] With a non-Helius RPC URL saved, the private-balance tab says the feature is unavailable and shows no actions.
- [ ] A watch-only account cannot register or move a private balance.
- [ ] On the unregistered tab, the register button is disabled when public SOL cannot pay the fee. Pressing it shows loading, submits without the generic approval screen, and on success shows the private list in the same tab. A failed submit stays there and the button can be pressed again.
- [ ] A connected dApp asking to sign `TSPP/derive/v1`, as raw bytes or as an off-chain message, receives a rejection and no approval screen. Sign-in with that payload is rejected the same way. On test-web, three buttons submit that payload through `signMessage`, `signOffchainMessage`, and `signIn`.
- [ ] After register, the tab lists a shielded mint, collapsed. Expanding it lists UTXOs. Those notes do not navigate. Tapping the token card opens the private token detail.
- [ ] On a combined account, the token detail is the main wallet. A member with no vault key is not shown as zero.
- [ ] Shield from a public token detail uses that address's public balance for Max and has no recipient. Confirm uses the normal approval screen.
- [ ] Shield from the private tab asks for a public token first. Shield from the token detail does not.
- [ ] Private Send to an unregistered address is blocked. Send to a registered address opens approval only after the proof returns. Reject restores the form.
- [ ] Selecting 41 notes, or entering an amount that needs 41 notes, shows the validation banner and blocks Send and Unshield.
- [ ] Unshield has no recipient field. The amount returns to the signing address.
- [ ] On the private token detail, a mint with 40 or more UTXOs shows the one-line Merge warning under the count. A mint with fewer than 40 does not.
- [ ] Merge of 52 or fewer notes is one approval. Merge of 53 notes uses the close-empty batch approval. Success returns to the private-balance tab.
- [ ] Locking the wallet clears the derived viewing key from memory. Unlocking derives it again for the same address.

## Still to decide

(none)

## Next

Debug mode writes a failed command name, error code, and scrubbed message to the service-worker console. Debug off writes nothing. Payloads, secrets, and API keys are not logged. The six tracks are in the tree. Private rows reuse the public token card for name, icon, and Jupiter shield. The USD slot on Mainnet is the Jupiter unit price times the private amount, using `big.js`. A missing price, including every Devnet row, leaves that slot empty. Sign AI names Shielded Pool instructions deposit, transact, and mergeTransact, and User Registry instructions Register, SetMergeEncryption, and UpdateKeys. Those programs are not unknown programs. Combined account files sit in `popup/accounts/combined`. The four add-account flows sit in their own folders under `popup/onboarding`. Home lists sit in `popup/home`, and the popup approval host sits in `popup/approval`. Shield, Unshield, Send, and Merge share one session check and one approval queue. Send and Unshield share one note-cover helper. Still open: combined accounts do not have the second expand, Send and Unshield do not pass the chosen notes into the proof, the approval screen does not show the change amount, and a merge above 52 notes uses one approval then sends the later groups without the close-empty batch screen. Not walked in a browser.
