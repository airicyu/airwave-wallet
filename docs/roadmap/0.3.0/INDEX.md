# 0.3.0 — Popup 方案 A（UI 殼 + 現有 RPC 持倉）

- **狀態：** `shipped`
- **上游版本：** [0.2.0](../0.2.0/INDEX.md)（`shipped`）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **Backlog：** 已出貨；原型見 [`docs/design-demos/wallet-030-ui-concepts.html`](../../design-demos/wallet-030-ui-concepts.html)
- **視覺原型：** [`docs/design-demos/wallet-030-ui-concepts.html`](../../design-demos/wallet-030-ui-concepts.html)（方案 A；原型可含 mock USD／假私鑰，**產品碼禁止 mock 餘額與假密鑰當真**）
- **後續：** [0.4.0](../0.4.0/INDEX.md) 資料源；[0.5.0](../0.5.0/INDEX.md) combined（本版**不做**）

## 產品句

使用者開啟 **popup** 時看到方案 A 的殼：頂欄 mini wallet、hamburger 選單、Home 底欄 **Token／Activity**、Token **卡片列**（SOL 第一列、無報價顯示「—」）、Accounts／Rename／Manage／Reveal／Add、Settings 與已連線站點。持倉仍用 **0.2.0 的 `settings.rpcUrl` + popup 直連 RPC**（legacy SPL）。本版**不**接 Helius／Jupiter、**不**做 sidebar、**不**做鏈上 Activity 索引。

## 文件地圖（閱讀順序）

1. 本檔
2. [docs/popup-shell-how.md](./docs/popup-shell-how.md) — 畫面、導航、Token 列正規化、Reveal command
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游仍有效：[0.2.0 accounts-home-how](../0.2.0/docs/accounts-home-how.md)（帳戶 CRUD／RPC 查詢；**列表顯示規則以本版 HOW 覆寫「零餘額仍列出」**）、[0.2.0 disconnect-how](../0.2.0/docs/disconnect-how.md)、[0.1.0 storage-custody](../0.1.0/docs/storage-custody-how.md)、[0.1.0 message-flow](../0.1.0/docs/message-flow-how.md)
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 繼承 0.2.0 | Pending 僅 SW；結果只回原 tab；`chrome.storage` + `onChanged`；password-boxed vault；無 hardcode 密碼；無 pending hydrate；帳戶 rename／delete／read-only／disconnect 語意不變。**本版覆寫** 0.2.0「鎖定仍可看 Home 資產」與「私鑰永不進 popup」（後者僅 Reveal 頁 RAM，見下） |
| 殼 | 僅 **popup**；寬度約 **384px**（對 0.2.0 加寬；以 CSS／`body` 寬度實現，不開 sidebar） |
| 頂欄（Home） | 左：**mini wallet widget**（帳戶 icon 佔位、`label`、複製公鑰 icon）。點 widget 主區 → **Accounts** 頁。右：**Lock** icon（在 hamburger **左側**）→ `wallet.lock`；其右為 **Menu**（hamburger）→ 頂欄**下方** dropdown |
| Menu | 項目固定：**Wallet accounts**、**Settings**、**Connected sites**（**不含** Lock）。開啟後：點選項導頁、點 overlay／外側、或再點 hamburger → 關閉。**不要**靠 hover 關閉 |
| 子頁頂欄 | 左 Back、中間頁標題、右仍可有 Menu（與原型一致） |
| Home Tab | 底欄文字 Tab：**Token**、**Activity**。Activity **只做 empty state**（說明尚無交易歷史）；**禁止**把原型 mock 交易寫進產品 |
| Token 卡片 | 每列：icon 佔位（**1–2** 字母，**不**拉遠端圖）、symbol、數量、右側 USD。本版 USD **一律「—」**（即使之後有人在 HTML 寫死數字也不算驗收通過） |
| Token 資料 | 仍 **popup 直連** `settings.rpcUrl`：`getBalance` + `getParsedTokenAccountsByOwner`（legacy Token program，與 0.2.0 相同）。正規化見 HOW。**不**新增 `heliusApiUrl`／`jupiterApiKey` |
| Token 顯示規則 | **SPL `uiAmount === 0`（或 amount 0）不畫**。**native SOL 即使 0 仍畫**，且**固定第一列**。無 USD **不是**零持倉。同一 owner、同一 mint 的多個 legacy token account：**按 mint 加總成一列**（`id`＝mint）；加總後為 0 則不畫 |
| Symbol | SOL 顯示 `SOL`；SPL 無 metadata 時用 **mint 縮寫**（與 0.2.0 同級，勿發明 Jupiter 名稱） |
| 刷新 | Home Token 區保留重新整理（icon button + tooltip）；active／`rpcUrl` 變更仍重抓。資產數字**不**寫 storage |
| Accounts | 精簡卡片：名稱、read-only／active 標記、地址縮寫、複製。rename **icon** → **Rename 整頁**。⋮ → **Manage 整頁**。右上 **Add** → **Add account 整頁**。點卡片主區（非 icon）→ `wallet.setActiveAccount` 並可回到 Home |
| Rename／刪除 | 仍走既有 `wallet.renameAccount`／`wallet.deleteAccount`（鎖定刪 signing → `WALLET_LOCKED`）。Manage 上 **Remove wallet account** 須確認後再呼叫 delete |
| Add account | **只**三種：產生簽名帳戶、匯入 **base58 私鑰**、新增 read-only 公鑰。**不做**助記詞／keystore 檔 |
| Reveal private key | 僅 **signing**。入口只在已解鎖的 Manage。獨立 **Reveal 頁**：先遮罩 → 使用者輸入**錢包密碼** → `wallet.exportAccountSecret` 回傳該帳戶 secret base58 → 僅該頁記憶體；可複製；離開頁面必須清記憶體。**禁止**寫入 `chrome.storage`／log／changelog。read-only **不顯示** Reveal 列。**進入該頁前必須已解鎖**。匯出仍須**再送密碼**。session **鎖定**時 SW **一律** `WALLET_LOCKED`（即使密碼能解開 blob）。成功或失敗**都不**改變 session。此為對 0.2.0「私鑰永不進 popup」的**明示覆寫**：僅 RAM＋使用者主動複製剪貼簿 |
| Settings | Cluster + **既有** `rpcUrl` + 儲存。本版**不加** Helius／Jupiter 欄 |
| Connected sites | 獨立子頁，行為同 0.2.0（單站斷開／全部斷開） |
| 設定／鎖定／onboarding | `#setup`／`#create-vault-banner` 保留。vault **鎖定**時 popup **只**顯示既有 `#locked`；**不**顯示方案 A Home／Token／Activity／Accounts／Reveal。解鎖後才進入 `home-token`。版面須能在 384px 使用，不必複製方案 A 裝飾到極致 |
| 操作視覺 | 能用 **icon button + `title`／`aria-label`** 就不用長文字主按鈕（底欄 Tab、Unlock／Create、危險確認、表單 Submit 除外） |
| 訊息／WS | **不改** Wallet Standard 能力表；content 白名單不為 UI 擴充 dApp command。Reveal **不是** inject 可呼的 command |
| 依賴 | 不為 UI 引入 React／大型元件庫；維持現有 popup TS + CSS。不為本版加 Jupiter／Helius SDK |
| 測試 | 無整包 CI；`wallet` build／typecheck + 未封裝擴充手驗 |
| Combined 帳戶 | **本版不做**（→ [0.5.0](../0.5.0/INDEX.md)）。只守 HOW 兼容：mint 鍵、組裝可複用、未知 `kind` 不當 signing。**禁止**半套 combined |

## 非目標

- **Combined wallet account**（→ [0.5.0](../0.5.0/INDEX.md)）
- Helius DAS、`heliusApiUrl`、`jupiterApiKey`、法幣真實報價、token logo URL（→ [0.4.0](../0.4.0/INDEX.md)）
- Token-2022、compressed NFT、Activity 鏈上歷史
- Sidebar、方案 C 密度
- 助記詞／HD／keystore 匯入、硬體錢包
- Agent harness、simulation、signAndSend、SIWS
- 改 `../solibra-wallet`
- 把原型裡的 mock USD／假私鑰字串當產品資料

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.2.0 | 0.3.0 |
|-------|--------|
| 單欄設定式 popup | 方案 A 導航與卡片 |
| Tokens：SOL＋全部 legacy 帳戶（含 0） | SOL 第一列；**濾掉 0 的 SPL**；USD「—」 |
| rename／delete 擠在同一 panel | Rename／Manage／Add **整頁** |
| 無匯出私鑰 | Reveal 頁 + 密碼 + SW 一次性回傳 |
| 無 Activity Tab | 有 Tab，內容為 empty state |
| 鎖定仍可看首頁餘額 | **鎖定只見 `#locked`**，解鎖後才 Home |

## 實作 Track

### Track 1 — 殼、導航、Menu

- **做：** 384px 殼；Home 頂欄 widget＋Lock（hamburger 左）＋Menu；子頁 Back＋標題；畫面狀態（home-token／home-activity／accounts／…）；Lock 呼叫既有 `wallet.lock`。
- **不做：** Token 卡片美化可暫用舊 list，但導航必須通；不做 Helius。
- **驗收：** 可開關 Menu；三個項目可到達對應頁；Home 頂欄 Lock 進入 `#locked` 且不見 Token；點外側關閉 Menu；widget 進 Accounts。

### Track 2 — Home Token 卡片 + Activity empty

- **做：** 依 HOW 正規化 RPC 結果並畫卡片；刷新；loading／錯誤不白屏；Activity empty。
- **不做：** 真實 USD、logo URL。
- **驗收：** SOL 第一列（含 0）；零 SPL 不出現；USD 皆「—」；RPC 錯誤可見。

### Track 3 — Accounts／Rename／Manage／Add／Reveal

- **做：** 卡片列表與整頁流程；Reveal command（HOW）；read-only 無 Reveal。
- **不做：** 助記詞匯入。
- **驗收：** 改名／刪除／新增與 0.2.0 相同 storage 效果；Reveal 僅解鎖後可達、需密碼；離開頁面後 DOM／變數無 secret；錯誤密碼不洩密。

### Track 4 — Settings、Connected sites、拋光

- **做：** 搬 0.2.0 設定與站點 UI；icon／tooltip；`wallet` `package.json` version 於出貨前對齊 `0.3.0`。
- **不做：** 新 settings 欄位。
- **驗收：** 改 rpcUrl 後 Token 列表用新 RPC；斷開站點仍有效；build 通過。

## 驗收（出貨 checklist）

- [x] `cd wallet && npm run build` 成功
- [x] Popup 約 384px 寬；Home 有 Token／Activity Tab
- [x] Menu：Accounts、Settings、Connected sites（無 Lock）；外側可關
- [x] Home 頂欄：Lock icon 在 hamburger **左側**，可鎖定
- [x] Token：SOL 第一列；零 SPL 不列出；USD 為「—」
- [x] Activity 為 empty，無假交易列
- [x] Accounts → Rename／Manage／Add 為整頁；Add 僅三種既有能力
- [x] Reveal：signing + 正確密碼可見並可複製；錯誤密碼不洩密；read-only 無入口；secret 不進 storage；離開頁／關 popup 後 DOM 無 secret
- [x] 鎖定後只見 `#locked`，無 Home Token；解鎖後才見方案 A Home
- [x] 刪除／read-only 拒簽／disconnect 行為與 0.2.0 相同（迴歸手驗）
- [x] 無 Helius／Jupiter 呼叫（靜態搜尋產品碼）
- [x] 無 hardcode 密碼；pending 仍不進 storage

## 手驗指令（整包）

```text
cd wallet && npm install && npm run build
cd test-web && npm install && npm run dev
# Chrome → 載入未封裝 → wallet/dist
# popup：導航／Token 卡片／Accounts 整頁／Reveal（僅測試錢包）／Settings RPC／Connected sites
# 鎖定：Lock 後只見 Unlock 屏，不見 Token；解鎖後回 Home
# Reveal：錯誤密碼無 secret；Back／關 popup 後畫面與記憶體無密鑰字串；靜態確認 content 白名單不含 exportAccountSecret
# test-web：Connect／Disconnect 迴歸（本版不改 test-web 亦可，但須確認未破壞）
```

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/popup/index.html` | 結構／畫面 |
| `wallet/src/popup/main.ts` | 導航、RPC 列表、帳戶 UI |
| `wallet/src/popup/style.css` | 384px、卡片、Menu |
| `wallet/src/shared/commands.ts` | `wallet.exportAccountSecret` 聯集增量 |
| `wallet/src/background/index.ts` | Reveal：密碼驗證後回傳 secret |
| `wallet/manifest.config.ts` | popup 入口（通常不必改 action） |
