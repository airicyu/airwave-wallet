# Changelog

## Next

(No unversioned changes. The list is [`dev-docs/roadmap/unversioned.md`](dev-docs/roadmap/unversioned.md). After a batch is assigned to a version, move the sentence under that version's heading and leave this section empty.)

## 0.48.0 â€” 2026-10-19

**Wallet lock settings** (Settings hub, below Default CU price) groups idle auto-lock and **Wallet lock password**. Idle auto-lock defaults on; lock-after minutes default to 10. When it is on and the wallet is unlocked, a `chrome.alarms` countdown runs only while no toolbar popup, side panel, or sign popout is open; when it fires, the wallet locks like a manual lock and does not reject pending requests. Helius, Jupiter, and OpenRouter secret rows still show reveal and pencil on the idle row; edit shows confirm and discard only. The hamburger **Network** page lists only Devnet and Mainnet radios with no RPC URL on that screen.

## 0.47.1 â€” 2026-10-18

A dApp `signTransaction` or `signAndSendTransaction` that omits `chain` uses the cluster selected in the wallet (`solana:mainnet` or `solana:devnet`). A chain the dApp does send must still match that cluster.

## 0.47.0 â€” 2026-10-17

Account list, combined manage, and address book rename all use a sub-screen. Combined manage shows only the main wallet and members: the main-wallet label sits outside the card; members use a circular check to pick the main wallet, and clicking the row (except the grip and the buttons on the right) also switches it. Members can be reordered and can have an optional name. Switch-main hides rename, delete, and add. Signing icons are copper; watch-only icons are blue. Address-book names may be empty.

## 0.46.0 â€” 2026-10-17

Helius, Jupiter, and OpenRouter secret rows show only reveal and a pencil until edit. After the pencil loads the plaintext, confirm writes; discard and blur do not. Network moved from the settings hub to the hamburger menu, between Address book and Settings. The page is still a Devnet / Mainnet radio.

## 0.45.0 â€” 2026-10-15

The Wallet Standard `icon` in the dApp connect picker is the same embedded `public/icon128.png` as the extension, not a 1Ã—1 red square.

## 0.44.0 â€” 2026-10-15

Tx AI report and grade can each be **default** (a built-in ordered chain, not stored) or **custom** (up to 5 ids). OpenRouter completion falls through the chain (404 / 502 / 503 try the next; 429 waits 1s and retries once). The sign-approval AI row keeps its previous layout. An SPL expected-delta row can copy the full mint next to the short mint. SOL and Wrapped SOL do not show copy.

## 0.43.0 â€” 2026-10-15

Address book: the hamburger item under Wallet accounts can add, rename, copy, delete, and drag-reorder. Send can pick a recipient full-screen from wallet accounts or the address book, and can still paste another address. Stored in `airwave.addressBook.v1` without a schema-generation bump.

## 0.42.0 â€” 2026-10-14

A combined wallet account can send from token detail through the existing send flow when the current wallet can sign. The spendable amount is that one address's balance, not the Home total. Other members are not merged into the same transaction. No send when the current wallet cannot sign. No new screen and no sweep.

## 0.41.0 â€” 2026-10-14

New mnemonic and burner accounts preview before they are saved: the page opens with a public key, the dice rerolls locally, and create / generate writes only after that. The mnemonic page no longer copies the whole phrase. Burner generate saves the key shown on screen; if it cannot be unlocked the command fails and does not mint a different random account. The tx AI report chain's first fixed id is `~deepseek/deepseek-flash-latest` again, including new installs. Stored model ids are not rewritten.
## 0.40.0 ¡X 2026-10-14

Site connect consent centers the site and the current account. The primary button is Connect. The explainer sentence is gone. Settings tx AI: choosing Other for the report or grade model opens the custom id field again.

## 0.39.0 ¡X 2026-10-14

Closing the Chrome side panel while it is approving `signTransaction` or `signAndSendTransaction` rejects and returns to the opener, matching popout close. Settings tx AI: report and grade each have two fixed models plus Other for an OpenRouter id. The report default is `apodex/apodex-1.1-mini:free`.

## 0.38.0 ¡X 2026-10-13

Home holdings and sign expected-delta rows share a trust shield: a green verified shield before the token image, with the integer organic score on the shield's lower right when the score is greater than 0. Unverified rows leave the left cell empty and do not draw a score.

## 0.37.0 ¡X 2026-10-13

Security: an in-flight approval cannot be swapped for different content under the same requestId. After a connected tab leaves that site, account-changed and disconnect no longer send the public key to the new page. The site's connection trust remains.

## 0.36.0 ¡X 2026-10-12

Sign approval: if the transaction already sets Compute Budget CU limit and price, the message is not rewritten by default (no `workingTx`; the original bytes are signed). Only a missing limit or price is filled in. The approval still shows CU and fees. Apply CU writes the payload and re-simulates. Fixes swaps such as Jupiter that already embed CU.

## 0.35.0 ¡X 2026-10-12

Window title and `html lang` follow the Settings language. Popup, sidebar, and approval popout `document.title` is one catalog sentence (Wallet, Approval, Connect, and so on) with no `Airwave ¡X` prefix. An in-shell approval does not rename the wallet window. Sandbox and offscreen are unchanged.

## 0.34.0 ¡X 2026-10-12

Sign AI: the service worker runs decode, the same simulate as approval (transaction blockhash), and batched `getMultipleAccounts` (up to 60 resolved accounts plus fee-payer balance) before the sandbox. `preflightPubkeys` go into the prompt. The model should not re-query pubkeys already in the manifest (the host returns a note). OpenRouter drops only `decode_message` and `simulate`. Other read-only RPC tools stay for gaps. Grading reuses preflight. `TX_AI_MAX_STEPS` is 8. A `BlockhashNotFound` on the approval delta does not stop AI analysis.

## 0.33.0 ¡X 2026-10-12

Each sign-approval expected-delta row is a fixed trust shield (verified or not), a round token image, a name, and the delta. On mainnet, after simulate, the service worker fills icon, symbol, and `isVerified` from Jupiter Tokens v2. An unverified row does not use the symbol as the primary label. Devnet does not call Jupiter. The 0.32.0 three-second refresh still updates only the delta body.

## 0.32.0 ¡X 2026-10-11

Sign-approval simulate uses the transaction's own blockhash (no `replaceRecentBlockhash`). While the page is visible, only Expected changes refreshes every 3 seconds. Failure copy stays in that card. Refresh and Inspector sit side by side on the first screen. The fee is signature fee plus CU, computed locally, with an expandable breakdown. The simulate round trip does not change the fee text. The site is centered, ellipsized when long, and copies the full origin. A divider sits under the account widget. AI is one card under the title (while running, "AI analyzing" on the right; when done, risk index plus report). Timeout is 60s, a single LLM call 55s, shown as analysis timed out. Other failures say analysis did not finish. No report opens without a body. A fixed disclaimer sits under the overlay title. The bottom row returns to the top. The Settings AI switch defaults on (an OpenRouter key is still required). The AI `simulate` tool still replaces the blockhash.

## 0.31.0 ¡X 2026-10-11

Build chain is Vite 8.3.4 (Rolldown), `@vitejs/plugin-react` 5.2.0, and TypeScript 7.0.2. `@crxjs/vite-plugin` stays 2.7.1. Direct `wallet` dependencies use exact versions. Content-script and inject entries were renamed so Rolldown does not collide same-name chunks. Extension-page HTML rewrites `/assets/` and `crossorigin` to relative paths. Rolldown shares the service-worker entry with extension pages, so background listeners register only in the service worker. Otherwise the approval page answers failure first and tx AI runs only one round. Sign, send, and multi-step AI through Decisions were hand-tested. Expired-blockhash copy is unchanged.

## 0.29.0 ¡X 2026-10-10

Mainnet requires the user's own JSON-RPC. The official public endpoint is not used. First run: language, then password, then the RPC guide (skip or configure to finish). Home stops until mainnet RPC is ready. Helius and Jupiter stay optional and are not an RPC fallback. Devnet may still use the official public RPC.

## 0.28.0 ¡X 2026-10-10

Home Activity loads an older page when the list hits the bottom (Helius / RPC `before`). Row time is local `YYYY-MM-DD HH:MM:SS`. When a mint is known, the left side is an https token icon, and a Jupiter or holdings-cache symbol replaces the short mint.

## 0.27.0 ¡X 2026-10-10

Custody and signing boundary: session keeps only salt and the AES key. Plaintext secrets stay in service-worker memory. `workingTx` only patches Compute Budget locally and no longer fetches lookup tables to edit CU. A dApp signature requires an existing connection. `signTransaction` must carry the same chain as the wallet. Before approve, the tab origin must still be the original one. New vaults use 600000 PBKDF2 iterations. `getState` no longer returns Jupiter or Helius plaintext.

## 0.26.0 ¡X 2026-10-10

Fixes: mnemonic import preview follows Standard versus CLI / Ledger. Combined holdings expand with a 34px chevron, two-line members, and a share bar sorted by amount. The unlock screen focuses the password field when it is shown. Account kinds use three stroke icons (signing, watch-only, combined). The top bar no longer uses a letter avatar. Accounts can drag cards to reorder. Combined manage splits member addresses and local accounts. Deleting an account or a member asks first. `airwave.schemaGeneration` stamps generation 1 and does not change existing `*.v1` shapes.

## 0.25.0 ¡X 2026-10-10

The wallet shell switches between the toolbar action popup and the Chrome side panel: one Home icon. Shell mode is whether the side-panel document is alive, not a setting. While the side panel is open, the toolbar action focuses it and site approvals stack inside the shell. Otherwise popup / popout. Wallet send and close-empty stay in the current shell. `uiHost` is `"window"` or `"sidebar"`, not `"popup"`.

## 0.24.0 ¡X 2026-10-09

Refactor with the same behavior as 0.23.0. `AGENTS.md` says a `wallet/src` `.ts` under 50 lines may omit a file header, and 50 lines or more need an English responsibility comment (at most 100 words). The tree was filled in, except `ui-messages.ts`. The 400 and 150 line thresholds apply. `background/wallet` commands moved under `commands/` split into account, combined, and session. `simulate-pending-tx.ts` and `close-empty-service.ts` split into sibling modules and the old files were removed. Command strings, storage, screens, and the three-locale catalog are unchanged.

## 0.23.0 ¡X 2026-10-08

Wallet chrome in three languages (Traditional Chinese, Simplified Chinese, English). Settings' first row is language. Shared `ui-messages` catalog and `t(locale, key)`. Service-worker errors use stable codes that the UI translates. Popup and popout use font plan B. Unlock and confirming titles drop `letter-spacing: 0.02em`. The product image is on unlock and first password (64px) and About (40px).

## 0.22.1 ¡X 2026-10-08

Activity row Orb URLs drop `/history` (`https://orb.helius.dev/tx/{sig}?cluster=¡K`). Pages with `/history` do not exist.

## 0.22.0 ¡X 2026-10-08

Home top pill hugs its content (round two-letter avatar, centered name, copy on the right, no short address). Devnet only: an orange badge to the right of the pill. A successful address copy shows a check and "Copied" for about 1.6 seconds. Manual holdings refresh has a 3 second cooldown arc. Activity row tails open Helius Orb. Close-empty confirming hides the top bar and uses the same dash-ring as send. Sign phase 1 uses Kit `estimateResourceLimitsFactory`. The suggested CU limit formula stays 0.11.0.

## 0.21.1 ¡X 2026-10-08

Close-empty: `planCloseEmpty` adds margin to Kit's CU estimate (¡Ñ1.25, headroom for two Compute Budget instructions, minimum 10k) so preflight does not hit `ComputationalBudgetExceeded`. If WebSocket confirm fails, `commitCloseEmpty` polls `getSignatureStatuses` over HTTP so a chain success is not shown as a chain failure. The recycle checklist shows SYMBOL and icon (holdings, then mainnet Helius zero balances, then Jupiter).

## 0.21.0 ¡X 2026-10-08

Home Tokens can scan and close token accounts with a zero balance and reclaim rent as SOL. The flow stays in the popup: pick, confirm, one send. Commands are `wallet.listClosableTokenAccounts`, `wallet.planCloseEmpty`, and `wallet.commitCloseEmpty`. Kit estimates CU. The plan executor signs and sends (`@solana/kit-plugin-rpc`). No popout, no new pending kind, and `walletSend` is unchanged. RPC rate limits and Kit technical errors use a bottom warn toast (about 4 seconds, click to dismiss) instead of a long decode under the list. Refresh merges the token-account scan so background refresh does not run twice.

## 0.20.0 ¡X 2026-10-07

`wallet/` and `test-web/` Solana clients moved from `@solana/web3.js` v1 to `@solana/kit` and `@solana-program/*` (system, token, token-2022, compute-budget). RPC, codec, session signer, sign, simulate, CU rewrite, wallet-built send, inject address checks, and test-web transaction build all use Kit. The vault still stores bs58 64-byte secrets. `signMessage` is still tweetnacl detached. User-visible flow, pending, storage, and the Wallet Standard surface match 0.19.0. Direct dependencies no longer include web3.js or `@solana/compat`.

## 0.19.0 ¡X 2026-10-07

Sign approval: static decode of common programs (System Transfer, Compute Budget limit and price, Token and Token-2022 Transfer and TransferChecked, ATA Create, Memo UTF-8). Everything else stays short accounts plus hex. Expected-delta rows add a Solana Explorer Transaction Inspector link (message base64, `cluster` from settings). Retry and Explorer are 34px filled buttons. Decode and the URL stay in the service worker and are not written to `chrome.storage`. No new package.

## 0.18.0 ¡X 2026-10-07

Home Activity lists up to the 20 most recent transactions for the current account's exposed address on the current cluster. Mainnet with a parseable Helius key uses parsed history (sent, received, swap, transaction). Otherwise a coarse `getSignaturesForAddress` list. One row is one transaction. The row-end icon opens Solscan in a new tab (`cluster=devnet` on devnet). The query runs in the service worker. History is not stored in `chrome.storage`.

## 0.17.0 ¡X 2026-10-07

Wallet Standard `solana:signAndSendTransaction` is declared and implemented. The site request still uses a popout. After approve the wallet signs, calls `sendRawTransaction`, and waits for `confirmed`. Confirming holds on Confirmed for 1 second, then the window closes. The signature returns only to the originating tab. `signTransaction` still signs and closes immediately. The `walletSend` host and the return to Home are unchanged. test-web uses the real feature path.

## 0.16.0 ¡X 2026-10-06

Popup React state: the module-level `session`, `bindPopupShell`, and full-tree `bumpUi` on input are gone. Screen drafts are component `useState`. Cross-page scratch and navigation live in App context. Back, leave-and-clear, and the dock follow a lookup table. Behavior matches 0.15.0. No new dependency. The approval shell stays vanilla.

## 0.15.0 ¡X 2026-10-06

Popup is Vite plus React function components (`createRoot`, `App`, `PopupMarkup`). Behavior matches 0.14.0. Added `react`, `react-dom`, and `@vitejs/plugin-react`. `@types/react` and `@types/react-dom` are devDependencies because the React 19.3 packages on npm did not ship TypeScript types. Service worker, content, inject, popout, and the approval shell stay vanilla. `mountApprovalShell` is unchanged. Command strings and storage keys are unchanged.

## 0.14.0 ¡X 2026-10-05

Source directories. User-visible behavior matches 0.13.0. The service worker is split into `messaging`, `session`, `storage`, `pending`, `simulate`, `send`, `home-tokens`, `handlers`, and `wallet`. `wallet-handlers.ts` is `wallet-dispatch.ts` and only routes commands. Popup screens live in `home`, `send`, `accounts`, `settings`, and `onboarding`. Small helpers live in `lib`. The approval shell extracted formatters and the simulate notice card that do not read module state. Message names, storage keys, CSS, and HTML are unchanged. No new dependency.

## 0.13.0 ¡X 2026-10-05

Approval host: `walletSend` runs inside the popup shell (`uiHost: popup`). `beginSend` no longer opens a popout. Site `connect`, `signMessage`, and `signTransaction` still use a popout. Shared approval UI is `wallet/src/approval/shell.ts`. Wallet send: after approve, a full-page Confirming spinner becomes Confirmed on chain `confirmed`, then returns Home and refreshes after about 0.5s. The service worker emits `walletSendSettled` immediately and does not sleep. `signTransaction` approve still closes at once. New `ui.abortPending` (closing the popup or leaving the approval view means reject). A sidebar host is only reserved in the contract.

## 0.12.0 ¡X 2026-10-05

Token detail and single-signer send. A Home holdings row opens detail. A signing account fills amount and address, then `wallet.beginSend` builds an unsigned transfer and opens the existing sign popout (`walletSend`). After approve the wallet broadcasts and waits for `confirmed` (then about 500ms before close). The popup returns to Tokens and refreshes. Holdings rows carry `decimals` and the SPL `tokenProgram`. The send page shows balance and 50% / Max shortcuts. Leaving the page or switching accounts clears the form. dApp `signTransaction` still only signs. Combined and watch-only have no Send.

## 0.11.0 ¡X 2026-10-04

Unsigned `signTransaction` can change CU limit and price (Compute Budget instructions are replaced, not appended). Approve signs `workingTx`. A signed transaction's instructions are not edited. A fee card shows signature fee plus priority fee. Changing CU requires the apply icon. Approve is disabled while dirty. Settings **Default CU price** ships at 25000. Each instruction row lists short accounts and data hex. The sign popout pins the top and bottom bars and scrolls the middle. `connect` and `signMessage` are unchanged.

## 0.10.1 ¡X 2026-10-04

`ui.simulatePendingTx` calls JSON-RPC `simulateTransaction` and diffs `preBalances` / `postBalances` / `preTokenBalances` / `postTokenBalances` for the frozen signing account. It no longer calls `getMultipleAccounts` or passes `accounts.addresses`. Fee prefers `value.fee`. Assumes current Helius / Agave. Missing fields mean the transaction cannot be simulated.

## 0.10.0 ¡X 2026-10-04

`signTransaction` popout: the stage is the signing account's expected SOL and SPL deltas from service-worker `ui.simulatePendingTx`. "Expected to fail" or "Cannot simulate" sits above the deltas. Transaction details start collapsed and instruction rows trust only the service worker. While locked, the request stays pending and the window still opens (same as 0.9.0 signMessage). Enqueue freezes `signAccountId`. Approve only signs. If the transaction cannot be deserialized, approve is disabled and a forced approve returns `INVALID_TRANSACTION`. test-web adds a sign entry expected to fail simulation. `connect` and `signMessage` popouts stay on 0.8.0 / 0.9.0.

## 0.9.0 ¡X 2026-10-04

`signMessage` popout: site, frozen account widget, UTF-8 message payload or raw binary hex. A transaction message detected by the SDK shows only "Cannot sign a transaction as a message." and is never signed (reject, close, or a mistaken approve returns `SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`). While locked, the request stays pending and the window opens. The popout unlocks with a class-B field and no dock. After unlock in this window, approve holds 700ms. Enqueue writes `signAccountId` and `messageLooksLikeTx` (service-worker map only). `connect` and `signTransaction` popouts keep the JSON layout. The popup lock screen matches HOW. Popup and popout text fields focus with `--accent`. test-web adds UTF-8, binary, and transaction-as-message sign entries.

## 0.8.0 ¡X 2026-10-03

Settings can change the wallet password. `wallet.changeVaultPassword` unlocks `airwave.vault.v1` with the current password, re-encrypts with a new salt, writes it back, and replaces the session working key (the old session blob is deleted before the vault write). Settings is a four-row hub (network as two radios, RPC as Devnet and Mainnet cards, API keys labeled with a `¡E¡E¡E¡E¡E¡E` mask, wallet password on its own page). Create, unlock, reveal, and change-password use a masked `type="text"`. `type="password"` and `current-password` / `new-password` are forbidden. There is no forgot-password flow.

## 0.7.0 ¡X 2026-10-03

Home holdings no longer use Helius DAS `getAssetsByOwner`. On mainnet, when the Helius URL has a parseable `api-key` (or `apiKey`), SPL uses Helius Wallet API `GET /v1/wallet/{wallet}/balances` (`showNfts=false`, pages in series). Native SOL and wSOL still split on `rpcUrl` (`getBalance` plus wrapped-mint token accounts). `native-sol` is always first. wSOL, when present, is second (Wrapped SOL / wSOL). Otherwise the whole table uses `rpcUrl`: `getBalance` plus legacy Token and Token-2022 `getParsedTokenAccountsByOwner`, dropping SPL with `decimals === 0`. Mainnet Jupiter Tokens v2 may override other mints' name, symbol, https icon, and USD. SOL and wSOL names are fixed. Devnet does not call the Wallet API or Jupiter. Combined accounts sum a bounded `usdTotal` across owners and rewrite `usdLabel`.

## 0.6.0 ¡X 2026-10-03

Mnemonic import: English BIP39 12 or 24 words, phantom / CLI / custom path, preview of public keys at index 0¡V19 (three words per row), pick one row to write a signing account. Add splits into Create mnemonic wallet and Create burner wallet. The mnemonic wallet is one screen: name, 12 words, and address. Create is what writes the vault (phantom index 0). Leaving does not write and does not store the mnemonic. A burner is still a random key and can be revealed later. Secret-key import is unchanged.

## 0.5.0 ¡X 2026-10-02

Combined accounts: `AccountMeta` is a discriminated union (signing, read-only, combined). Subs are always at least 1. A connection binds the combined id and exposes the main public key. Changing main sends `account-changed` to connected origins (targeted). Signing resolves the main address to a signing row id. Watch-only and a missing row are checked before lock. Home `getHomeTokens` sums subs in series over DAS or RPC and attaches `members` for the expand row. Popup plan A: Add ¡÷ Combined form (paste an address or check local accounts) and Manage (check local accounts to add or remove members, switch the current wallet). The unlock working key is mirrored to `chrome.storage.session` (the password is not stored). After the service worker is collected the wallet stays unlocked until Lock or the browser closes. Reveal still asks for the password again. The first screen after install sets a password and creates the vault. Generate, import, and watch assume the vault exists. They do not create a vault or ask for a password mid-flow. An error toast clears on navigation and disappears after about 4 seconds (click to dismiss). Page-level primary actions stick to the popup shell bottom (flex, not inside content scroll, not floating or sticky). Settings: RPC lists per cluster, autosave, and in-row icons to add and delete.

## 0.4.0 ¡X 2026-10-01

Home token holdings are queried by the service worker: optional Helius DAS (name, icon, floor) or `rpcUrl` fallback. Mainnet Jupiter Tokens v2 search only fills the verified check and organic score, and overrides USD when `usdPrice` is present. Keyless is 0.5 rps. A portal key uses Free 1 rps. Price v3 is not called. The app icon is stacked air waves (`wallet/public/icon{16,32,48,128}.png`). The connect popout no longer shows `silent` JSON. test-web subscribes to `change` once. `connect` does not re-emit `change` when the public key is unchanged.

## 0.3.0 ¡X 2026-10-01

Popup plan A: a 384px shell, mini-wallet top bar, Menu, Home Token / Activity (Activity empty), token cards (RPC legacy SPL, same mint summed, zero SPL filtered, USD "¡X"). Accounts, Rename, Manage, and Add are full pages. `wallet.exportAccountSecret` is the reveal flow. After lock only `#locked` shows. Settings and Connected sites keep the 0.2.0 capabilities.

## 0.2.0 ¡X 2026-10-01

Account rename, delete, and read-only watch accounts. Popup home token list (SOL fixed first, plus legacy SPL; visible while locked). Wallet Standard `disconnect` and popup connected-site management. `test-web` Disconnect regression.

## 0.1.0 ¡X 2026-10-01

Minimal Solana Chrome wallet MVP: `wallet/` extension plus `test-web/` manual dApp. Wallet Standard connect, signMessage, and signTransaction. Service-worker pending hub, password-boxed vault, popout approval. The user finished an unpacked Chrome load and a test-web hand check.
