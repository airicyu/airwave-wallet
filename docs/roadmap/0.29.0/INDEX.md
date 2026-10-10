# 0.29.0 — Mainnet RPC 必填與首次短引導

- **狀態：** `shipped`
- **上游版本：** [0.27.0](../0.27.0/INDEX.md)（`effectiveRpcUrl`、自訂 RPC 合法集、`heliusConfigured`）。Activity 翻頁是 [0.28.0](../0.28.0/INDEX.md)，**本版不改那份契約、不改 Activity 查詢**
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 原 `backlog/mainnet-rpc-first-run.md`（出貨後已刪）
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)。新全屏引導先有 `docs/design-demos/` 概念稿再改產品 CSS。Home 停住態走現有安靜空態，不是 toast
- **秘密欄位：** 無新密碼欄。禁止把真實 RPC key、助記詞寫進本目錄

## 產品句

Mainnet 必須有一條使用者自己的 JSON-RPC；沒有就不打官方公用節點，Home 停住請去填。建好或匯入第一個帳戶後最多出現一屏短引導。Helius API 與 Jupiter 仍選填，不當 RPC 後備。Devnet 仍用官方公用 RPC。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [HANDOFF.md](./HANDOFF.md)
5. 上游：[0.27.0 INDEX](../0.27.0/INDEX.md) RPC 合法集

## 已定案

| 題 | 決定 |
|----|------|
| 通道 | 一般 JSON-RPC **只**走該 cluster 的 RPC 設定。Helius enhanced **只**走 `heliusApiUrl`。禁止用 Helius API 打 `getBalance`／模擬／送出；禁止 JSON-RPC 失敗改打 Helius API |
| Devnet | 無自訂 RPC 時仍用 `https://api.devnet.solana.com`。RPC 列表保留內建列。行為與 0.27.0 相同 |
| Mainnet 就緒 | 僅當 `rpcByCluster.mainnet.active` 是合法自訂 URL（0.27.0 `isAllowedCustomRpc`）且在 `urls` 裡。空 active、或值等於官方 `https://api.mainnet-beta.solana.com`、或其它不合法 URL：**未設定**。Helius／Jupiter 有沒有填不影響此判斷 |
| 官方 Mainnet URL | **不再**當 `effectiveRpcUrl` 後備。`effectiveRpcUrl("mainnet", cfg)` 在未就緒時回傳 `""`。SW **禁止** `fetch` 官方 Mainnet 公用節點。已安裝使用者若 active 為空（等於以前選內建）或字面就是官方 URL：視為未設定 |
| Mainnet RPC 列表 | **不要**再放可選的官方公用列當「內建、可用」。只列自訂 URL＋加入。目前 cluster 是 Mainnet 且未就緒：卡片摘要用 catalog「未設定」，不要顯示官方 URL 像正在使用 |
| 網路列摘要 | Mainnet 列：就緒顯示該自訂 URL（單行 ellipsis）；未就緒顯示 `settings.rpc.mainnetUnset`。Devnet 列仍可顯示官方公用 URL |
| 需 RPC 的命令 | 見 HOW 命令表。`cluster === "mainnet"` 且未就緒：**禁止** `createSolanaRpc`／`solanaRpcForUrl`／JSON-RPC `fetch`／JSON-RPC WebSocket（含對空 `rpcUrl`）。UI 能擋的路徑不發命令；仍進 SW 則回 `MAINNET_RPC_UNSET`。錢包內送出／收回租金：未就緒不進確認、不廣播 |
| 網站簽名 | `dapp.signTransaction` 與 `dapp.signAndSendTransaction` **仍開**審批殼。模擬不打官方節點、不對空 URL 建 RPC，outcome 用既有 `rpc`。`signAndSend` 核准後**不廣播**，錯誤只回發起 tab／frame，code `MAINNET_RPC_UNSET`。`signTransaction` 核准仍只簽、不代送 |
| Home | Tokens／餘額：Mainnet 未就緒時不打 `wallet.getHomeTokens`。中間安靜短句 `home.mainnetRpcRequired`＋文字鈕 `home.goSetRpc`（導向 `settings-rpc`，不改 dismissed）。Activity：未就緒且沒有 Helius 時 **不發** `wallet.getHomeActivity`，同一短句。有 Helius、無 RPC：Activity 仍走 enhanced，**維持 0.28.0** `before`／`hasMore`，不改組 URL。Tokens／餘額仍停住 |
| 首次設定順序 | 尚無金庫：先一屏選語言（`zh-Hant`／`zh-Hans`／`en`，列上用 endonym），確認後才進入設密碼。預選對應 Chrome UI 語言（`en*`→en、`zh-CN`／`zh-Hans*`→zh-Hans、其他 `zh*`→zh-Hant；無法對應仍 zh-Hant）。確認時立刻 `patchSettings({ locale })`。不讀 `navigator.language`。舊資料缺 `locale` 仍按 0.23.0 讀成 zh-Hant |
| 首次引導 | 設密碼成功之後，若尚未 dismissed 且 Mainnet RPC 未就緒：全屏 RPC 引導。已有金庫、帳戶 0→≥1 且尚未 dismissed 時亦出。語言／密碼／RPC 三屏同一產品頭（圖＋「Airwave Wallet」置頂）與同一北極光底。RPC 文案靠左，只說必須填 Mainnet RPC，不談 Jupiter。可附一條連外：Helius 免費 API key（`https://www.helius.dev/`，新分頁）；填的是 Mainnet **RPC URL**，不是 Settings 的 Helius API。底列兩鈕：略過＋設定 RPC。**只有**按略過或設定 RPC 才寫 `rpcGuideDismissed: true`。關閉 popup／側欄 **不算**略過；下次解鎖仍出此屏直到按下其中一鈕。略過且無帳戶→新增帳戶，否則 Home。從 RPC 設定返回且帳戶 0→新增帳戶。已就緒或已 dismissed：不再出此全屏 |
| Mainnet 刪光 | Mainnet 自訂列刪到零：`urls: []`、`active: ""`、摘要未設定。**不得**把官方公用 URL 加回 `urls` 或當 radio |
| 持久 | `settings.rpcGuideDismissed: boolean`，預設 `false`。`schemaGeneration` 仍 1，不改鍵名。`normalizeSettings` 缺欄當 false。`getState` 可帶此布林（非秘密） |
| 文案 | 三語 catalog，鍵見 HOW。跑 `wallet/scripts/gen-ui-messages.mjs` |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.29.0`。`shipped` 須使用者同意。出貨後刪 backlog 列與 `mainnet-rpc-first-run.md` |
| 領域用語 | 出貨時回寫 DOMAIN：Mainnet RPC 未設定。勿把 Helius API 寫成「RPC」 |

## 非目標

- 0.28.0 Activity 翻頁、Helius enhanced URL 組裝、Orb
- 把 Helius API URL 自動寫進 RPC 清單，或內建 Airwave 代付 Mainnet RPC
- 導覽輪播、獨立 Help 站；引導屏以外的外連申請頁
- 簽署 AI 評估、bubble-harness、OpenRouter
- 改 custody、pending 生命週期、Wallet Standard 方法、`../solibra-wallet`
- 升 schema 世代

## 開工前仍須拍板

（無）

## 與上一版對照

| 0.27.0 | 0.29.0 |
|--------|--------|
| Mainnet 無自訂則打官方公用 RPC | 未就緒則空字串、不 fetch |
| 不合法自訂 Mainnet 退回官方公用 | 退回未設定 |
| RPC 列表 Mainnet 有內建列 | 無官方內建列 |
| 無首次 RPC 引導 | 語言 → 密碼 → RPC 引導 |

## 實作軌道

### Track 1 — `effectiveRpcUrl` 與 SW

- **做：** Mainnet 未就緒回 `""`；需 JSON-RPC 的命令回 `MAINNET_RPC_UNSET`、不 fetch 官方節點。Devnet 不變。
- **不做：** 改 Helius target；改 Activity enhanced 組 URL。
- **驗收：** `cd wallet && npm run typecheck`。HOW `effectiveRpcUrl` 對照表：空 active、官方字面、不合法 URL、active 不在 `urls` → Mainnet `""`；Devnet 空 active → 官方 devnet。

### Track 2 — Settings 網路／RPC 列

- **做：** Mainnet 列表無官方內建列；未設定摘要；網路列 Mainnet 摘要。
- **不做：** 改 Helius／Jupiter 欄互動。
- **驗收：** 手驗見下。

### Track 3 — Home 停住與首次引導

- **做：** 概念稿 `docs/design-demos/mainnet-rpc-guide.html` 後再改 popup。尚無金庫先選語言再設密碼；密碼成功後 RPC 引導；Home 停住；`rpcGuideDismissed`。
- **不做：** toast 當主路徑；輪播。
- **驗收：** 見下方手驗。

## 驗收

- [x] `cd wallet && npm run typecheck` 與 `npm run build`
- [x] Devnet 無自訂 RPC：餘額／airdrop 仍走官方 devnet
- [x] Mainnet 無自訂 RPC：網路不出現對 `api.mainnet-beta.solana.com` 的 JSON-RPC；Home Tokens 停住且可進 RPC 設定
- [x] 只填 Helius、不填 Mainnet RPC：Tokens 仍停住；不因此開始打官方 RPC
- [x] 填一條合法 Mainnet 自訂 RPC 後 Tokens 會打該 URL
- [x] 尚無金庫先出現語言屏，選完才設密碼；密碼成功後出現 RPC 引導。略過後不再全屏；無帳戶則進新增帳戶。Home 若仍未就緒繼續停住
- [x] 未封裝擴充走完（popup 或側欄）。靜態截圖不算通過
- [x] 文件無真實 key、助記詞、密碼

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/shared/storage-keys.ts` | `PUBLIC_RPC_BY_CLUSTER`、`effectiveRpcUrl`、Settings |
| `wallet/src/background/storage/storage-io.ts` | `normalizeSettings` |
| `wallet/src/popup/settings/SettingsScreens.tsx` | 網路列、RPC 卡 |
| `wallet/src/popup/onboarding/SetupFlow.tsx` | 尚無金庫：語言再密碼 |
| `wallet/src/popup/onboarding/OnboardingScreens.tsx` | 設密碼；帳戶建立後備引導 |
| `wallet/src/popup/onboarding/RpcGuideScreen.tsx` | RPC 引導屏 |
| `wallet/src/popup/PopupMarkup.tsx` | Home／view |
| `wallet/src/shared/ui-messages.ts` | catalog |
