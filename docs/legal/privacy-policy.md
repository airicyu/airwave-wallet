# 隱私權政策

生效日：2026-10-17

Airwave 是在你瀏覽器裡運作的非託管 Solana 錢包擴充功能。**我們不營運自有後端、不開帳戶系統、不蒐集分析、不賣資料、不以你的資料投放廣告。** 本政策說明擴充功能在本機處理什麼資料、以及在哪些情況下會把資料送到你選擇的第三方。

## 單一用途

Airwave 的單一用途是：讓你在本機保管 Solana 金鑰、檢視持倉與活動、以及對網站的連線／簽名／送出請求做審批。權限與資料處理只服務這個用途。

## 我們（開發者）收不到什麼

安裝、解鎖、簽名或送出時，資料**不會**送到 Airwave 開發者的伺服器。我們沒有這類伺服器。Chrome Web Store 的安裝統計由 Google 處理，不在本政策範圍。

## 本機儲存

以下資料寫在這台裝置上的 `chrome.storage`，不會同步到我們：

- **保管庫：** 助記詞、私鑰，以及你設定的錢包密碼用來加密它們。解鎖用的工作金鑰只在 `chrome.storage.session`，瀏覽器關閉即清除，不以明文長期寫入磁碟。
- **你建立的錢包資料：** 帳戶與地址簿的名稱、公鑰，以及你為它們填的其他本機資料。
- **你填的設定：** 網路、RPC、選填的 API 金鑰，以及其他只影響這台裝置上錢包行為的偏好。
- **已連線網站：** 你批准過的網站與對應帳戶。

移除擴充功能即刪除上述本機資料。鏈上交易與第三方帳本不會因此消失。

## 何時會離開這台裝置

只在提供錢包功能時，且只送到**你設定或你點開**的端點。傳輸使用 HTTPS。**助記詞、私鑰、錢包密碼不會離開裝置，也不會送給任何第三方。**

你設定的 JSON-RPC（Mainnet 必填；Devnet 可用官方公用節點）在查餘額、模擬、送出與帳戶查詢時，會送出公鑰、交易內容、簽名，以及一般的 RPC 讀寫。

你若貼了 [Helius](https://www.helius.dev/) API URL，代幣名稱、圖示與 Mainnet 活動紀錄會把公鑰和交易簽名送到 Helius，API key 隨你貼的 URL 一起送出。

Mainnet 上顯示代幣名稱、圖示與驗證狀態時，會把 mint 位址送到 [Jupiter](https://jup.ag/)。你若填了 key，key 會一併送出。

你若開啟簽署 AI 並填了 [OpenRouter](https://openrouter.ai/) key，交易解讀、模擬結果，以及相關公鑰與帳戶資料的唯讀分析內容會送到 OpenRouter。key 只由 service worker 當作 `Authorization` 送出。分析跑在沒有 `chrome.*`、沒有網路的 isolated sandbox；sandbox 看不到保管庫，也不能簽名。

你點開 Explorer、Helius Orb、Helius 註冊這類分頁時，該連結上的公開資訊（例如交易簽名）會出現在那個網站。

第三方各自有自己的隱私權政策。我們無法控制他們如何處理你送給他們的資料。

Content script 會在你造訪的網站注入 Wallet Standard，以便該頁請求連線或簽名。我們**不**刮取頁面內容做分析。批准連線時，該站 origin 存在本機。

## 你的控制

- 可在設定中清空或改寫 RPC、Helius、Jupiter、OpenRouter 欄位。
- 可中斷已連線網站。
- 可隨時移除擴充功能以刪除本機保管庫與設定。
- 忘記錢包密碼即無法解密既有保管庫；我們無法代為復原。

## Limited Use

Airwave 遵守 Chrome Web Store 的 User Data Policy，包括 Limited Use：我們不以使用者資料投放個人化廣告、不出售資料、不以與錢包功能無關的方式轉移資料。開發者無法讀取你的保管庫或鏈上請求內容，因為那些資料不到我們的伺服器。

## 變更

本政策更新後自發布日起生效。繼續使用即表示你知悉更新後的政策。

## 聯絡

設定 → 關於此應用，或本倉庫的 GitHub Issues。請勿在 Issues 或郵件貼上助記詞、私鑰、密碼或 API key。

---

## English

Effective date: 2026-10-17

Airwave is non-custodial Solana wallet software that runs in your browser. **We do not operate our own backend, do not run user accounts, do not collect analytics, do not sell data, and do not use your data for advertising.** This policy describes what the extension stores on this device and when data is sent to third parties **you** configure or open.

## Single purpose

Airwave’s single purpose is to keep Solana keys on this device, show holdings and activity, and let you approve connect / sign / send requests from sites. Permissions and data handling exist only for that purpose.

## What we (the developers) do not receive

Nothing you do in the wallet is sent to Airwave developer servers. We do not operate those servers. Chrome Web Store install statistics are handled by Google and are outside this policy.

## Stored on this device

The following stay in `chrome.storage` on this machine and are not synced to us:

- **Vault:** seed phrases and private keys, encrypted with the wallet password you set. The unlock working key lives only in `chrome.storage.session`, is cleared when the browser closes, and is not kept in plaintext on disk for the long term.
- **Wallet data you create:** names and public keys for accounts and the address book, and other local details you add to them.
- **Settings you enter:** network, RPC, optional API keys, and other preferences that only affect how the wallet behaves on this device.
- **Connected sites:** sites you approved and the account each one uses.

Uninstalling the extension deletes this local data. On-chain history and third-party records are not deleted.

## When data leaves this device

Only to provide wallet features, and only to endpoints **you set or you open**. Transport is HTTPS. **Seed phrases, private keys, and the wallet password never leave this device and are never sent to any third party.**

The JSON-RPC you configure (required on Mainnet; Devnet may use the public official node) receives public keys, transaction contents, signatures, and ordinary RPC reads and writes when the wallet checks balances, simulates, sends, or reads accounts.

If you paste a [Helius](https://www.helius.dev/) API URL, token names, icons, and Mainnet activity send public keys and transaction signatures to Helius. The API key travels with the URL you pasted.

On Mainnet, token names, icons, and verification send mint addresses to [Jupiter](https://jup.ag/). If you entered a key, that key is sent too.

If you turn on transaction AI and enter an [OpenRouter](https://openrouter.ai/) key, a read-only analysis of the decoded transaction, the simulation result, and related public keys and account data is sent to OpenRouter. The key is sent only as `Authorization` from the service worker. Analysis runs in an isolated sandbox with no `chrome.*` and no network. The sandbox cannot see the vault and cannot sign.

When you open a tab such as Explorer, Helius Orb, or Helius signup, the public information on that link (for example a transaction signature) is shown on that site.

Those parties have their own privacy policies. We cannot control how they handle data you send them.

A content script injects Wallet Standard on sites you visit so a page can request connect or sign. We **do not** scrape page content for analytics. When you approve a connection, that origin is stored locally.

## Your controls

- Clear or replace RPC, Helius, Jupiter, and OpenRouter fields in Settings.
- Disconnect connected sites.
- Remove the extension at any time to delete the local vault and settings.
- If you forget the wallet password, existing vault data cannot be decrypted. We cannot recover it.

## Limited Use

Airwave complies with the Chrome Web Store User Data Policy, including Limited Use: we do not use user data for personalized ads, do not sell it, and do not transfer it except as needed for the wallet’s single purpose. Developers cannot read your vault or on-chain requests, because that data never reaches our servers.

## Changes

Updates apply from the date they are published. Continued use means you are aware of the updated policy.

## Contact

Settings → About this app, or GitHub Issues on this repository. Do not paste seed phrases, private keys, passwords, or API keys into issues or email.
