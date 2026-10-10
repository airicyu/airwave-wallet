# Changelog

## 0.28.0 — 2026-10-10

Home Activity 捲到底載入更舊一頁（Helius／RPC `before`）。列上時間改為本地 `YYYY-MM-DD HH:MM:SS`。有 mint 時左側 https token icon，Jupiter／持倉快取的 symbol 覆寫 mint 縮寫。

## 0.27.0 — 2026-10-10

保管與簽名邊界：session 只留 salt 與 AES key，明文 secret 只在 service worker 記憶體；`workingTx` 只做本地 Compute Budget 修補，不再為了改 CU 去拉 lookup table。dApp 簽名須已連線、`signTransaction` 須帶與錢包一致的 chain，核准前分頁 origin 必須仍是當初那一個。新 vault 的 PBKDF2 迭代為 600000；`getState` 不再帶出 Jupiter／Helius 明文。

## 0.26.0 — 2026-10-10

小修：匯入助記詞切「標準」／「CLI／Ledger」後預覽列會跟著變。Combined 持倉展開改 34px chevron、成員兩行＋比例條並依數量排序。解鎖畫面可見即聚焦密碼欄。帳戶類型改三色 stroke 圖（可簽／唯讀／聚合），頂欄不再用字母頭像。Accounts 可拖卡片改序。Combined Manage 分成員地址與本機帳戶兩區；刪帳戶與刪成員皆須確認。`airwave.schemaGeneration` 蓋第 1 代戳，不改既有 `*.v1` 資料形狀。

## 0.25.0 — 2026-10-10

錢包主殼在工具列 action popup 與 Chrome 側欄之間切換：Home 頂欄一顆圖示；殼模式＝側欄文件現在是否活著，不寫 settings。側欄開著時點工具列走側欄、網站審批進殼內 stack；否則 popup／popout。錢包送出與收回租金留在當下殼。`uiHost` 寫 `"window"` 或 `"sidebar"`，不再寫 `"popup"`。

## 0.24.0 — 2026-10-09

重構、行為與 0.23.0 相同：`AGENTS.md` 規定 `wallet/src` 的 `.ts` 少於 50 行可不寫檔首註解、50 行以上必須英文職責註解（≤100 words），並補齊全 tree（不含 `ui-messages.ts`）；400／150 行門檻。`background/wallet` 命令搬入 `commands/` 並分 account／combined／session；`simulate-pending-tx.ts` 與 `close-empty-service.ts` 拆成同層模組並刪除舊檔。不改命令字串、storage、畫面與三語 catalog。

## 0.23.0 — 2026-10-08

Wallet chrome 三語（繁體／简体／English）：Settings 第一列語言、共用 `ui-messages` catalog 與 `t(locale, key)`；SW 錯誤改穩定 code，UI 再翻譯。popup／popout 字體方案 B；解鎖與確認中標題去掉標題字距 0.02em。產品圖放在解鎖與首次建立密碼（64px）以及關於（40px）。

## 0.22.1 — 2026-10-08

Activity 列尾 Orb 網址去掉 `/history`（`https://orb.helius.dev/tx/{sig}?cluster=…`）。帶 `/history` 的頁面不存在。

## 0.22.0 — 2026-10-08

Home 頂欄 pill 貼內容（圓形兩字頭像｜名稱置中｜複製靠右、不顯示地址縮寫）；僅 Devnet 在 pill 外右側橙黃徽章。複製地址成功後勾與「已複製」約 1.6 秒。持倉手動刷新 3 秒冷卻弧。Activity 列尾改開 Helius Orb。收回租金確認中藏頂欄、與簽署送出同一 dash-ring。簽署交易 phase 1 改 Kit `estimateResourceLimitsFactory`，建議 CU limit 公式仍為 0.11.0。

## 0.21.1 — 2026-10-08

Close-empty 修補：`planCloseEmpty` 對 Kit 估出的 CU 加 margin（×1.25、Compute Budget 兩條 ix headroom、最低 10k），避免 preflight `ComputationalBudgetExceeded`。`commitCloseEmpty` 在 WebSocket 確認失敗時以 HTTP 輪詢 `getSignatureStatuses`，避免鏈上已成功卻顯示「鏈上失敗」。回收勾選清單補 SYMBOL 與 icon（持倉 → mainnet Helius 零餘額 balances → Jupiter）。

## 0.21.0 — 2026-10-08

Home Tokens 可掃描並關閉餘額為 0 的 token account，收回 rent 為 SOL。流程在 popup 內勾選→確認→一次送出；命令 `wallet.listClosableTokenAccounts`、`wallet.planCloseEmpty`、`wallet.commitCloseEmpty`；Kit 估 CU、plan executor 並發送出（`@solana/kit-plugin-rpc`）。無 popout、無新 pending kind、不改 `walletSend`。持倉 RPC 限流或 Kit 技術錯誤改底部 warn toast（約 4 秒、可點關），不再在列表下顯示 decode 長文；刷新時合併 token account 掃描、避免重複背景 refresh。

## 0.20.0 — 2026-10-07

`wallet/` 與 `test-web/` 的 Solana 客戶端自 `@solana/web3.js` v1 全轉 `@solana/kit` 與 `@solana-program/*`（system、token、token-2022、compute-budget）。RPC、編解碼、session signer、簽交易、模擬、CU 改寫、錢包自組送出、inject 地址驗證與 test-web 組 tx 皆走 Kit；vault 仍 bs58 64-byte secrets；`signMessage` 仍 tweetnacl detached。使用者可見流程、pending／storage／Wallet Standard 能力表與 0.19.0 相同。直接依賴不再含 web3.js 與 `@solana/compat`。

## 0.19.0 — 2026-10-07

簽署交易審批：常見 program 靜態解讀指令名與欄位（System Transfer、Compute Budget limit／price、Token／Token-2022 Transfer 與 TransferChecked、ATA Create、Memo UTF-8）；其餘仍帳戶縮寫＋ hex。預期變動列新增 Solana Explorer Transaction Inspector 外連（message base64、`cluster` 依設定）；34px 有底重試與 Explorer 鈕。解讀與 URL 僅在 service worker、不進 `chrome.storage`；未加套件。

## 0.18.0 — 2026-10-07

Home Activity：列出目前帳戶對外地址在目前 cluster 上最近最多 20 筆交易。mainnet 且有可解析 Helius key 時用已解析歷史（送出／收到／互換／交易）；否則 `getSignaturesForAddress` 粗列。每一列一筆交易；列尾圖示以新分頁開啟 Solscan（devnet 帶 `cluster=devnet`）。查詢在 service worker；歷史不進 `chrome.storage`。

## 0.17.0 — 2026-10-07

宣告並實作 Wallet Standard `solana:signAndSendTransaction`：網站請求仍走 popout；批准後錢包簽名、`sendRawTransaction`、等到 `confirmed`，確認中→已確認 hold 1s 再關窗，signature 只回發起 tab。`signTransaction` 仍只簽立刻關；`walletSend` 宿主與成功回 Home 不變。test-web 改走真 feature 路徑。

## 0.16.0 — 2026-10-06

Popup 收斂 React state：廢止模組級 `session`／`bindPopupShell` 與輸入時全樹 `bumpUi`。畫面草稿改元件 `useState`，跨頁暫存與導航走 App context；Back／離開清除／dock 以對照表為準。行為與 0.15.0 相同。未加依賴；審批殼仍 vanilla。

## 0.15.0 — 2026-10-06

Popup 改 Vite + React functional component（`createRoot`、`App`、`PopupMarkup`）；行為與 0.14.0 相同。新增 `react`、`react-dom`、`@vitejs/plugin-react`；`@types/react`／`@types/react-dom` 因 npm 上的 React 19.3 未附 TS 定義而加為 devDependency。Service worker、content、inject、popout、審批殼仍 vanilla；`mountApprovalShell` 橋接不變。命令字串與 storage key 未改。

## 0.14.0 — 2026-10-05

原始碼目錄化，使用者可見行為與 0.13.0 相同。Service worker 依職責分入 `messaging`、`session`、`storage`、`pending`、`simulate`、`send`、`home-tokens`、`handlers`、`wallet`。`wallet-handlers.ts` 改為 `wallet-dispatch.ts` 只分派命令。Popup 畫面進 `home`、`send`、`accounts`、`settings`、`onboarding`，小工具進 `lib`。審批殼抽出不讀模組狀態的格式化函式與模擬 notice 卡。未改訊息名、storage key、CSS、HTML，也未加依賴。

## 0.13.0 — 2026-10-05

審批宿主：`walletSend` 改在 popup 殼內（`uiHost: popup`），`beginSend` 不再開 popout；網站 `connect`／`signMessage`／`signTransaction` 仍 popout。抽出 `wallet/src/approval/shell.ts` 共用審批 UI。錢包送出：批准後全頁「確認中」轉圈，鏈上 `confirmed` 後同一畫面變「已確認」，約 0.5s 回 Home 並重查。SW 立刻 `walletSendSettled`，不 sleep。`signTransaction` 批准仍立刻關窗。新增 `ui.abortPending`（關 popup／離審批 view 語意同拒絕）。Sidebar 宿主僅契約預留。

## 0.12.0 — 2026-10-05

代幣詳情與單一可簽送出：Home 持倉列進詳情；signing 帳戶可填數量／地址後 `wallet.beginSend` 組未簽轉帳，開既有簽署 popout（`walletSend`）。批准後錢包廣播並等到 `confirmed`（再約 500ms 關窗）；popup 回 Tokens 並重查。持倉列帶 `decimals`／SPL `tokenProgram`。送出頁顯示餘額、50%／全部快捷；離開頁或切帳戶清空表單。dApp `signTransaction` 仍只簽不廣播。聚合／觀察無「送出」。

## 0.11.0 — 2026-10-04

未簽 `signTransaction` 可改 CU limit／price（Compute Budget 取代不 append），批准簽 `workingTx`；已簽不改 instruction。獨立交易費卡（總費＝簽名費＋優先費）；改 CU 須點套用圖示，dirty 時批准不可按。Settings **Default CU price** 出廠 25000。交易明細每條 ix 列帳戶縮寫與 data hex。簽署 popout 頂欄／底欄釘住、中間捲動。`connect`／`signMessage` 不變。

## 0.10.1 — 2026-10-04

`ui.simulatePendingTx` 改打 JSON-RPC `simulateTransaction`，用 `preBalances`／`postBalances`／`preTokenBalances`／`postTokenBalances` 對凍結簽署帳戶算差；不再 `getMultipleAccounts` 或傳 `accounts.addresses`。手續費優先用 `value.fee`。假設現行 Helius／Agave，缺欄當無法模擬。

## 0.10.0 — 2026-10-04

`signTransaction` 專用 popout：主舞台為 SW `ui.simulatePendingTx` 回傳的簽署帳戶 SOL／SPL 預期變動；「預計交易失敗」或「無法模擬」notice 在預期變動上方；交易明細預設收合且指令列只信 SW。鎖定時仍 pending＋開窗（對齊 0.9.0 signMessage）；enqueue 凍結 `signAccountId`；批准只簽名不廣播。無法 deserialize 時批准 disabled，強制 approve 回 `INVALID_TRANSACTION`。test-web 新增「預期模擬失敗」簽交易入口。`connect`／`signMessage` popout 維持 0.8.0／0.9.0。

## 0.9.0 — 2026-10-04

`signMessage` 專用 popout：站點、凍結帳戶 widget、UTF-8 Message payload 或 Raw binary hex；SDK 整段判定的 transaction message 僅顯示「不能把交易當成訊息簽署。」且永不代簽（拒絕／關窗／誤批准回 `SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`）。鎖定時仍 pending＋開窗，popout 類 B 解鎖（無殼底 dock）；本窗解鎖後批准 700ms hold。enqueue 寫入 `signAccountId`／`messageLooksLikeTx`（僅 SW Map）。`connect`／`signTransaction` popout 維持 JSON 版面。popup 鎖定屏對齊 HOW；popup／popout 文字欄 focus 用 `--accent`。test-web 新增簽 UTF-8／二進位／交易當訊息三入口。

## 0.8.0 — 2026-10-03

Settings 可變更錢包密碼：`wallet.changeVaultPassword` 用目前密碼解開 `airwave.vault.v1`，新 salt 重加密後寫回，session 工作金鑰換成新的（先刪舊 session blob 再寫 vault）。Settings 改為四列樞紐（網路兩列單選、RPC Devnet／Mainnet 兩卡、API keys 標籤與 `••••••` 遮罩、錢包密碼子頁）。建庫／解鎖／Reveal／改密改為遮罩 `type="text"`，禁止 `type="password"` 與 `current-password`／`new-password`。無忘記密碼。

## 0.7.0 — 2026-10-03

Home 持倉不再走 Helius DAS `getAssetsByOwner`。mainnet 且 Helius URL 可解析 `api-key`（或 `apiKey`）時，SPL 改打 Helius Wallet API `GET /v1/wallet/{wallet}/balances`（`showNfts=false`、分頁串行）；native SOL 與 wSOL 仍用 `rpcUrl` 拆開（`getBalance` + wrapped mint token accounts），`native-sol` 永遠第一、有 wSOL 則第二列（Wrapped SOL／wSOL）。否則整表 `rpcUrl`：`getBalance` + legacy Token 與 Token-2022 的 `getParsedTokenAccountsByOwner`；濾 `decimals === 0` SPL。mainnet Jupiter Tokens v2 可覆寫其它 mint 的 name／symbol／https icon 與 USD；SOL／wSOL 名稱寫死。devnet 不打 Wallet API、不打 Jupiter。combined 跨 owner 有限 `usdTotal` 加總並重寫 `usdLabel`。

## 0.6.0 — 2026-10-03

助記詞匯入：英文 BIP39 12／24 詞；選 phantom／CLI／自訂 path；預覽 index 0–19 公鑰（每列三詞詞格）；挑一列寫入 signing。Add 拆成「建立助記詞錢包」與「建立 Burner 錢包」。助記詞錢包單屏：名稱＋12 詞＋地址，建立才寫 vault（phantom index 0）；離開不寫入、不把助記詞存進 storage。Burner 仍為隨機密鑰，之後可 Reveal。密鑰匯入語意不變。

## 0.5.0 — 2026-10-02

Combined 聚合帳戶：`AccountMeta` 判別聯合（signing／read-only／combined）；subs 永遠 ≥1；連線綁 combined id、暴露 main 公鑰；切 main 對已連 origin 發 `account-changed`（targeted）。簽名對 main 解析 signing 列 id；觀察／無列先於鎖定。Home `getHomeTokens` 對 subs 串行 DAS／RPC 加總並附 `members` 供展開列。popup 方案 A Add→Combined 填表（可貼地址、勾本機帳戶）與 Manage（本機帳戶勾選加刪成員、切目前錢包）。解鎖工作金鑰鏡到 `chrome.storage.session`（不存密碼）；SW 回收後仍維持解鎖直到按鎖或關閉瀏覽器。Reveal 仍須再輸入密碼。安裝後第一屏設密碼即建立保險庫；產生／匯入／觀察假設 vault 已存在，不再中途建庫或索密碼。錯誤 toast 換頁即清、約 4 秒自動消失（可點關閉）。頁級主行動貼 popup 殼底（flex、不進內容捲動、不用 floating／sticky）。Settings：RPC 按 cluster 分清單、autosave、列內 icon 增刪。

## 0.4.0 — 2026-10-01

Home Token 持倉由 service worker 查詢：可選 Helius DAS（名稱、icon、底價）或 `rpcUrl` fallback。mainnet Jupiter Tokens v2 search 只補認證勾、organic score，並在有 `usdPrice` 時覆寫 USD。keyless 0.5 rps；有 portal key 按 Free 1 rps。不打 Price v3。App icon 採氣流疊浪（`wallet/public/icon{16,32,48,128}.png`）。連線 popout 不再顯示 `silent` JSON。test-web `change` 監聽只訂一次；公鑰未變更則 `connect` 不重發 `change`。

## 0.3.0 — 2026-10-01

Popup 方案 A：384px 殼、mini wallet 頂欄、Menu、Home Token／Activity（Activity empty）、Token 卡片（RPC legacy SPL、同 mint 加總、濾零 SPL、USD「—」）；Accounts／Rename／Manage／Add 整頁；`wallet.exportAccountSecret` Reveal 流程；鎖定後僅 `#locked`；Settings／Connected sites 沿用 0.2.0 能力。

## 0.2.0 — 2026-10-01

帳戶 rename／delete／read-only 觀察帳戶；popup 首頁 Tokens 列表（SOL 固定第一列＋legacy SPL；鎖定亦可看）；Wallet Standard `disconnect` 與 popup 已連線站點管理；`test-web` Disconnect 回歸。

## 0.1.0 — 2026-10-01

Minimal Solana Chrome 錢包 MVP：`wallet/` 擴充 + `test-web/` 手測 dApp。Wallet Standard connect／signMessage／signTransaction；SW pending hub、password-boxed vault、popout 審批。使用者已完成 Chrome 載入未封裝與 test-web 手驗。
