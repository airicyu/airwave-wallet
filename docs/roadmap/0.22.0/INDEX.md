# 0.22.0 — Home 小改＋簽署 Kit 估 CU

- **狀態：** `in progress`
- **上游版本：** 行為接 [0.21.0](../0.21.0/INDEX.md) 出貨契約＋其後 0.21.1 修補（`changelog.md`／`version.md`；**無**獨立 `docs/roadmap/0.21.1/`）。簽署 CU 規則上游 [0.11.0](../0.11.0/INDEX.md)
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** [backlog/home-cluster-indicator.md](../backlog/home-cluster-indicator.md)、[backlog/address-copy-feedback.md](../backlog/address-copy-feedback.md)、[backlog/token-balance-refresh-cooldown.md](../backlog/token-balance-refresh-cooldown.md)、[backlog/estimate-cu-via-kit.md](../backlog/estimate-cu-via-kit.md)；收回租金確認中對齊 [design-principles 送出狀態](../../design-principles.md)
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)；概念稿 [`docs/design-demos/022-ui-polish-ux.html`](../../design-demos/022-ui-polish-ux.html)（非正式；衝突以本 INDEX／HOW 為準）
- **秘密欄位：** 無新密碼欄；vault blob 不改 schema

## 產品句

人在 Home 於 Devnet 時能看見 pill 外側橙黃「Devnet」徽章（Mainnet 不標）、複製地址後按鈕短暫變成已複製、刷新持倉有 3 秒冷卻；Activity 列尾改開 Orb 而非 Solscan；收回租金送出等待與簽署送出同一套確認中 dash-ring（藏頂欄）。簽署交易 phase 1 改用 Kit 估 CU，建議 limit 公式仍是 0.11.0。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.21.0](../0.21.0/INDEX.md)（收回租金畫面）、[0.11.0](../0.11.0/INDEX.md)（phase 1 公式）、[0.17.0](../0.17.0/INDEX.md)（確認中藏殼）
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 範圍 | Popup Home（Tokens／Activity 共用頂欄與 Activity 列尾 explorer）、Tokens 標題列、收回租金 `close-empty-sending`、簽署殼頂欄複製鈕、簽署交易 phase 1 估 CU。不改 `connect`／`signMessage` 版面、不改 `walletSend` 鏈上語意、不改簽署 Inspector（仍 explorer.solana.com）、不宣告新 Wallet Standard 方法、不新增 `chrome.storage` key、不改 vault |
| 收回租金確認中 | **推翻** 0.21.0「送出中頂欄仍在、Back disabled、文案等待這一波結束」的呈現。`close-empty-sending` **藏頂欄、藏殼底 dock**（本 view 本就無 dock）、不畫 Token／Activity tab（本 view 本就不是 Home）。全頁置中 112px Solana dash-ring，與 design-principles「錢包送出確認中」同一套（頭 `#14F195`、中 `#5B8CFF`、尾 `#9945FF`；旋轉 4s、伸縮 2.4s）。標題「確認中」。**不**走審批殼 `enterWalletSendConfirming`（沒有 pending／popout）。Back／切頁在等待中仍不可中止已簽名的送出（0.21.0 離開規則維持）。結束仍進三數結果頁；**禁止**套用簽署送出的勾＋停留 1s 再離開 |
| 收回租金等待文案 | 說明句「等待鏈上確認」（與簽署送出同一句）。結果頁標題與三數不變 |
| 回收徽章 | **維持** 0.21.0 右下角。本版不改位置 |
| Home wallet pill | 頂欄帳戶 pill **寬度貼內容**，禁止撐滿到鎖定鈕。單列三欄、垂直置中：左圓形頭像、中帳戶名稱、右複製圖示。**不顯示**公鑰縮寫（`前4…後4`）。複製仍寫入完整對外公鑰。點頭像或名稱仍進 Accounts；點複製不得導頁（`stopPropagation`）。鎖定與選單仍在頂欄最右、pill 外 |
| 帳戶名稱 | **顯示名稱**（頂欄 pill、簽署殼同一 widget）：`label.trim()` 非空則用該字串（超過 15 只 ellipsis，不改 storage）。`label.trim()` 為空則用對外公鑰 **前 4** 個字元當顯示名稱（不是 `前4…後4`）。複製仍是完整公鑰。新建／匯入／重新命名寫入仍最多 **15** 字元（`maxlength=15`）；trim 後為空仍 `INVALID_LABEL`（本規則是畫面後備，不把空 label 寫進 storage）。名稱在 pill 內垂直置中 |
| 頂欄頭像 | popup Home 帳戶 pill：約 **36×36 正圓**。文字取 **顯示名稱** 的前 **2** 個字元（無 label 時顯示名稱是地址前 4，頭像因此是地址前 2）。不足 2 則全顯示；連公鑰都沒有才 `?`。不強制 toUpperCase。簽署殼頂欄同一規則。Accounts 列表卡片維持單字母，本版不改 |
| Cluster | 只讀既有 `settings.cluster`。Settings 一切換，Home 頂欄經既有 `chrome.storage.onChanged` 鏡像更新。不另存「Home 看到的網路」。Home **不能**切 cluster。範圍：popup Home 兩頁共用頂欄；簽署 popout、送出、帳戶列表、Settings 本列不改。**推翻** backlog「兩個狀態都要標」 |
| Cluster 視覺 | **僅 `devnet`** 在 wallet pill **外側右方**畫一顆非互動橙黃徽章，文案 `Devnet`（琥珀描邊＋琥珀字＋深琥珀底，`--warn` `#e8b84a`／`--warn-bg`）。**`mainnet` 不畫任何網路標示**（無徽章、無「Mainnet」字）。禁止放進 pill 內、禁止頂欄下方另開一條。徽章 `flex-shrink: 0`。點徽章不切網路、不進 Accounts |
| 地址複製回饋 | 只這些鈕：popup 頂欄 pill 內 `#btn-widget-copy`、popout `#btn-copy-pk`、popup 審批宿主 `#appr-btn-copy-pk`。成功寫入剪貼簿後：圖示換成既有勾（`--ok`）、`title` 與 `aria-label` 改「已複製」，**1.6 秒**後還原複製圖示與「複製」。失敗不顯示成功態、不另開 toast。不改其它複製鈕、不改複製內容（仍是對外公鑰全文） |
| 刷新冷卻 | `#btn-refresh-assets`：按下並開始該次刷新後 **disabled 3 秒**（從按下起算，含刷新尚未結束的時間）。圖示維持刷新；外圈 3 秒弧（`--accent`）。`title`／`aria-label` 維持「重新整理」（本版把這顆由英文 Refresh balances 改為繁中「重新整理」；冷卻中不改成「冷卻中」）。只擋這顆手動鈕。自動刷新、解鎖載入不套 3 秒。離開 Home Tokens、或切換作用中帳戶：立刻清掉冷卻，鈕可再按。不寫 `chrome.storage` |
| Activity explorer | **推翻** [0.18.0](../0.18.0/INDEX.md) 列尾開 Solscan。唯一 explorer 改為 Helius **Orb**。URL：`https://orb.helius.dev/tx/{signature}/history?cluster={cluster}`。`settings.cluster === "devnet"` → `cluster=devnet`；否則 `cluster=mainnet-beta`。signature 用 `encodeURIComponent`。列尾圖示熱區、`chrome.tabs.create`、整列不可點：維持 0.18.0。`title` 與 `aria-label` 改「在 Orb 開啟」。列資料欄 `solscanUrl` **改名** `orbUrl`。開頁前綴必須是 `https://orb.helius.dev/tx/`，否則忽略。不做 explorer 選擇。不改簽署審批 Inspector |
| Kit 估 CU | 只替換簽署交易 **phase 1**「把 limit 拉滿再 `simulateTransaction`、讀 `unitsConsumed`」。改為對**同一份探針副本**（limit＝1,400,000、price＝0，有則取代、無則插入；**不得**寫入 `workingTx`）呼叫 Kit `estimateResourceLimitsFactory`（RPC＝`settings.rpcUrl`），取其回傳的 **`computeUnitLimit`**（與 0.21 收回租金同一欄）當作從前模擬結果的 `unitsConsumed`。**不要**讀 factory 的 `unitsConsumed`（那是 0.11 `simulateTransaction` 的欄，factory 沒有此欄），再跑不變的 `suggestedLimitFromPhase1`。忽略 loaded accounts data size；禁止為了 factory 給 v0 交易寫入 `SetLoadedAccountsDataSizeLimit`。禁止 `estimateAndSetResourceLimitsFactory`（那會把未乘 1.1 的值寫回 message）。Factory 丟錯、逾時（仍 15 秒）、或沒有可用的 CU 整數：走 0.11.0 既有 fallback。phase 1.5／phase 2、Default CU price、費用卡、已簽不改 instruction、差額主舞台：**不變**。不新增 command。**不改**收回租金的 `computeCloseEmptyUnitLimit` |
| 數字 | 鏈上整數繼續 `BigInt`／字串。CU limit 仍是 0.11.0 的整數 clamp，本版不改公式 |
| 依賴 | 不新增套件。`estimateResourceLimitsFactory` 已在 `@solana/kit`（0.21 收回租金已用） |
| test-web | 不新增按鈕 |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.22.0`。狀態改 `shipped` 須使用者同意 |

## 非目標

- 聚合送出、地址簿、Sidebar、i18n、storage 遷移、Durable nonce 提醒、鏈上 IDL、AI 安全評估、Agent harness
- 在 Home 切 cluster；第三個 cluster；顯示 RPC URL
- 帳戶卡片、mint、助記詞、私鑰等其它複製鈕；複製失敗的錯誤圖示
- 把刷新冷卻寫進 storage、限制背景拉取、SW 端 RPC 佇列
- 改 0.11.0 建議 limit／fallback／費用公式或審批費用卡版面
- 改收回租金的 CU margin、打包、executor、結果三數；改回收筆數徽章位置（維持右下）
- 收回租金等待畫面套用「已確認」1s auto-exit
- 改簽署審批 Explorer Inspector（仍 `explorer.solana.com/tx/inspector`）；Activity 與簽署各用各的站，本版不做選擇器
- 宣告新的 Wallet Standard 方法
- 改 `../solibra-wallet`

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.21.x | 0.22.0 |
|--------|--------|
| Home 看不出 cluster | 僅 Devnet 時，wallet pill 外側右方橙黃 `Devnet` 徽章；Mainnet 不標 |
| 頂欄 pill 撐滿、複製在 pill 外、兩行名稱＋地址縮寫、頭像單字母 | pill 貼內容、單列：圓形頭像｜名稱置中｜複製靠右；不顯示地址；頭像約 36px 圓、前 2 字；名稱最多 15 字 |
| 複製地址圖示不變 | 成功後勾＋「已複製」1.6s |
| 刷新可連按 | 手動刷新 3 秒冷卻 |
| Activity 列尾 Solscan | 列尾開 Orb（`orb.helius.dev/tx/…/history`）；欄位 `orbUrl` |
| 收回租金確認中只有兩行字、頂欄仍在 | 藏頂欄＋與簽署送出同一 dash-ring |
| 簽署 phase 1：limit 拉滿再 `simulateTransaction` | 同一探針改 Kit `estimateResourceLimitsFactory`；公式不變 |

## 實作 Track

### Track 1 — Home 頂欄與 Tokens 工具列

- **做：** 緊湊 pill（圓形頭像｜名稱置中｜複製靠右、不顯示地址）、cluster 在 pill 外右側、頭像前 2 字、名稱 15 字上限、刷新 3s 冷卻與弧；Activity `orbUrl` 取代 Solscan。
- **不做：** 收回租金送出畫面；Kit phase 1；popout 複製；改回收徽章位置。
- **驗收：** `cd wallet && npm run typecheck`。切到 Devnet 出現徽章，切回 Mainnet 徽章消失。徽章不是按鈕。刷新連點第二次在 3s 內不觸發新的 force list。Activity 列 URL 為 `https://orb.helius.dev/tx/` 且含 `cluster=`。`wallet/src` 內 Activity 路徑（`home-activity.ts`、`HomeActivityList.tsx`）無 `solscan.io`；changelog 與已 shipped 版文件不在此掃描。

### Track 2 — 收回租金確認中

- **做：** `close-empty-sending` 藏頂欄；置中 dash-ring；說明「等待鏈上確認」。CSS 與簽署送出共用 class／SVG，禁止第二套環。
- **不做：** 結果頁改成 1s 勾；把流程塞進審批殼。
- **驗收：** typecheck。靜態：本 view 不呼叫 `openPopout`。頂欄與 tab bar 不出現。

### Track 3 — 簽署殼複製＋Kit phase 1

- **做：** `#btn-copy-pk` 與 `#appr-btn-copy-pk` 與 popup 複製同一套回饋。`simulatePhase1ForLimit` 改 factory（探針解編路徑，15s，讀 `computeUnitLimit`、CU 整數判準）；fallback 與 `suggestedLimitFromPhase1` 不變。
- **不做：** 改 phase 2、改收回租金 CU。
- **驗收：** typecheck。phase 1 副本不寫 `workingTx`。源碼不呼叫 `estimateAndSetResourceLimitsFactory`。

### Track 4 — 建置

- **做：** `cd wallet && npm run typecheck && npm run build`。
- **不做：** test-web 新入口。
- **驗收：** 兩道指令 exit 0。

## 驗收（出貨 checklist）

- [ ] Home Tokens 與 Activity：僅 Devnet 時 pill 外側右方橙黃 `Devnet` 徽章；Mainnet 無網路標示；Home 不能切網路
- [ ] 頂欄 pill 不撐滿、不顯示 `前4…後4`；單列圓形頭像｜名稱垂直置中｜複製靠右；無名稱時顯示公鑰前 4 字；頭像約 36px 圓顯示顯示名稱前 2 字；新名稱最多 15 字
- [ ] 複製頂欄地址成功：勾＋「已複製」約 1.6s 還原；簽署頂欄同一顆同等。失敗無成功態
- [ ] 刷新鈕按下後 3s 內不可再按；切帳戶或離開 Tokens 可立刻再按
- [ ] Activity 列尾開 `https://orb.helius.dev/tx/{sig}/history?cluster=…`（devnet 為 `devnet`，否則 `mainnet-beta`）；文案「在 Orb 開啟」；`wallet/src` 的 Activity 列與 `home-activity.ts` 無 `solscan.io`
- [ ] 收回租金送出等待：無頂欄、dash-ring、「確認中」；結束進三數結果頁而非 1s 勾
- [ ] 簽署未簽交易 phase 1 走 Kit factory；建議 limit 仍 `max(ceil(消耗×1.1), 原 limit)` 再 clamp；失敗走 0.11 fallback
- [ ] 無新 command、無新 storage key、無新 Wallet Standard 方法
- [ ] `cd wallet && npm run typecheck` 與 `npm run build` 通過
- [ ] 手驗：未封裝擴充走完上列畫面（Kit CU 以進審批費用卡有建議 limit 為準）
- [ ] 文件與程式無真實密碼／助記詞／私鑰
- [ ] 版本號檔對齊 `0.22.0`；狀態 `shipped` 須使用者同意；出貨後刪本版已完成之 backlog 列與檔

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/popup/components/WalletWidget.tsx` | 緊湊 pill、2 字頭像、pill 內複製 |
| `wallet/src/popup/lib/format.ts` | `avatarLetter` → 前 2 字（Home／簽署頂欄） |
| `wallet/src/background/wallet/` 帳戶寫入 | `label` 最長 15 |
| `wallet/src/popup/PopupMarkup.tsx` | 頂欄複製、刷新、sending 藏頂欄 |
| `wallet/src/popup/close-empty/CloseEmptyFeature.tsx` | 確認中畫面 |
| `wallet/src/popup/style.css` | cluster、冷卻弧、sending 全頁 |
| `wallet/src/shared/home-activity.ts` | `orbTxUrl`／`orbUrl`；刪 Solscan |
| `wallet/src/popup/components/HomeActivityList.tsx` | 列尾開 Orb |
| `wallet/src/popup/components/StrokeIcon.tsx` | 既有 `IconCheck`／`IconCopy`／`IconRefresh` |
| `wallet/src/approval/shell.ts` | 簽署頂欄複製回饋；`SEND_STATUS_AURORA_SVG` 可共用 |
| `wallet/src/popout/style.css` | 既有 `.send-status-*` |
| `wallet/src/background/simulate/sign-tx-simulate.ts` | phase 1 改 factory |
| `wallet/src/background/simulate/compute-budget-tx.ts` | `suggestedLimitFromPhase1` 不改 |
| `wallet/src/background/close-empty/close-empty-service.ts` | 本版不改 CU margin |
| `wallet/src/shared/close-empty-compute-units.ts` | 本版不改 |
