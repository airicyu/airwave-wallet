# 0.26.0 — 小修 scoped：匯入預覽、Combined 展開、解鎖聚焦、類型圖示、卡片排序

- **狀態：** `shipped`
- **上游版本：** 行為接 [0.6.0](../0.6.0/INDEX.md) 助記詞匯入；殼與目錄接 [0.25.0](../0.25.0/INDEX.md)（本版不改側欄）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 匯入方案預覽失效；Combined 展開難點；[unlock-password-autofocus](../backlog/unlock-password-autofocus.md)、[account-kind-visual](../backlog/account-kind-visual.md)、[account-card-drag-order](../backlog/account-card-drag-order.md)、[storage-migration](../backlog/storage-migration.md)（排程前草稿；衝突以本檔為準）
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)。視覺：[combined-token-expand-ux.html](../../design-demos/combined-token-expand-ux.html)、[account-kind-visual-ux.html](../../design-demos/account-kind-visual-ux.html)、[account-card-drag-ux.html](../../design-demos/account-card-drag-ux.html)
- **秘密欄位：** 無。助記詞生命週期仍只活在 popup 流程記憶體與該次 SW payload，禁止寫 storage／log

## 產品句

小修 scoped：匯入預覽、Combined 展開、解鎖聚焦、類型圖示、卡片拖曳，以及 **storage 遷移骨架**（現有 `*.v1` 標成第 1 代，本版不改資料形狀）。未寫進本檔的不做。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.6.0 INDEX](../0.6.0/INDEX.md)、[0.6.0 seed-import-how](../0.6.0/docs/seed-import-how.md)、[0.5.0 combined-how 展開 UI](../0.5.0/docs/combined-how.md)
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 語意 | **不改** 0.6.0 路徑表：`phantom`＝`m/44'/501'/{n}'/0'`；`cli`＝`m/44'/501'/{n}'`；`custom` 必須含字面 `{n}`。SW `wallet.previewSeedAccounts`／`wallet.importSeedAccount` 的 payload 與衍生公式不變。本版修的是 **popup 切方案後必須把該次 preview 結果畫上** |
| 切方案 | 點「標準」「CLI／Ledger」「自訂」時：寫入新 `pathKind`、清 `selected`、發新一輪 `previewSeedAccounts`（帶該 `pathKind`；僅 `custom` 帶當下 `customPath`）。路徑模板列（`pathPreview`）與 20 列公鑰必須換成該次回應。`phantom` 與 `cli` 對同一助記詞、同一 index **不得**顯示同一公鑰（衍生深度不同）。連發只採較新一輪；過期回應不覆寫列 |
| 禁止的實作 | **禁止**在 `setState`／`setDraft` 的 updater 函式裡呼叫 `runPreview` 或任何會再 `setDraft` 的非純函式。點擊／失焦時先依**當下 render 的 draft**（或 event 的 input 值）組成 snapshot，在 updater **之外**呼叫 preview。busy 更新必須一併帶上 snapshot 的 `kind`／`customPath`／`selected`，避免後到的純 kind 更新蓋掉 `previewGen` |
| 自訂 | 切到自訂時預覽用當下輸入（初始仍是 `m/44'/501'/{n}'/0'`，故列可以暫時與標準相同，這不是 bug）。失焦重跑時用 input 當下字串，不要用過期 closure 裡的舊 `customPath` |
| 範圍 | Track 1–5 如上。Track 6：local schema 世代骨架。不加 npm。不拆 `OnboardingScreens.tsx`／`style.css`。不改 vault 密文、不把 `*.v1` 改名成 `v2` |
| Combined 展開熱區 | 僅 `kind === "combined"` 且該列 `members.length >= 1` 才畫展開（0.5.0 不變）。chevron 是 **34×34** `icon-btn` 風格熱區，放在卡片最右、與 USD **並列**（不是 USD 底下那顆 2px padding 的 ▾）。`title` 與 `aria-label` 同一句：收合時 `token.expandMembers`、展開時 `token.collapseMembers`。點 chevron `stopPropagation`，**不**進代幣詳情。點卡片其餘區仍進詳情。禁止把整張卡改成展開 |
| Combined 展開內容 | 成員列附在同一張卡裡（上卡下明細、共用外框），不是另開一條易與下一 token 混淆的 list item。每一成員 **兩行**：① 短地址（前 4…後 4、ellipsis）右對齊整數 %（四捨五入，0.5.0）；② 數量 label＋該列 symbol（ellipsis）。其下 3px 比例條，寬度＝該成員 `percent` 夾在 0–100，只供掃一眼，**不是**新資料來源。禁止再把地址·數量·% 塞成 `nowrap` 單行。點成員列不進詳情、不改 main、不 `account-changed`。可同時展開多列 |
| Combined 展開排序 | **畫面順序**依該列 `uiAmount` 大→小；兩者 `uiAmount` 相同（或皆非有限數字）則用完整 `pubkey` 做 `en` + `numeric: true` 的 natural sort（`localeCompare`）。比較只用大於／小於，禁止用 `number` 做金額加減乘除。不改 SW `members` 陣列順序（仍可為 `subPubkeys` 保序）。此條覆蓋 0.5.0「展開列顯示順序＝subPubkeys」 |
| Combined 展開字體 | 與 Home 持倉卡同一套：面板 `font-family: inherit`（body 方案 B：Segoe UI／Microsoft JhengHei UI／PingFang TC）。數量列對齊 `.token-qty`（0.78rem、`--text-muted`、繼承正文）。短地址對齊產品其它公鑰：`var(--mono)`。% 繼承正文、0.78rem、字重 600。概念稿字體必須與產品 body／`--mono` 相同，禁止另開一套 |
| 解鎖聚焦 | 解鎖畫面**剛變成可見**時，焦點在密碼欄，可直接打字。涵蓋：popup `#locked` 的 `#unlock-password`；popout／審批殼 `#unlock-password`；popup 內審批 `#appr-unlock-password`；網站請求頁 `UnlockForm` 的 `#connect-unlock-password`。使用者已把焦點移走後，禁止因 `getState` 刷新再搶回。解鎖失敗且仍停在解鎖畫面：清空密碼後焦點回到密碼欄。不涵蓋首次建庫、變更密碼、其它欄 |
| 類型圖示 | 三種各一 stroke 圖、一色，**不是**字母頭像。可簽單一：鑰匙、`--ok`（`#4ecb8d`）。唯讀單一：既有眼睛、`--warn`（`#e8b84a`）。聚合：兩層疊卡、`#c084fc`（勿用 `--accent`，以免與「使用中」同色）。鎖定時仍依列上 `kind`（唯讀不看出否解鎖）。**Widget**（Home 頂欄與簽署殼頂欄同一套）**取代**字母頭像。**Accounts 列表**名稱左側同圖同色（約 18px），**拿掉**種類文字徽章（`accounts.badgeCombined`／`badgeReadOnly`）；「使用中」徽章保留。`title`／`aria-label`：`accounts.kindSigning`／`accounts.kindReadOnly`／`accounts.kindCombined`。Manage 頁文字徽章本版可留。成員列不畫類型圖 |
| Combined 列表地址列 | 聚合卡第二行：**切換目前錢包圖示**（`accounts.changeCurrentWallet`）＋目前錢包短地址（前 4…後 4）＋複製。**禁止**寫「Main wallet:」或「目前錢包：」這類前綴（圖示＋ tooltip 即可）。點切換圖示進該列 Manage（既有設目前錢包），`stopPropagation`，不啟動拖曳、不切 active。單一列第二行仍只有短地址＋複製 |
| Combined Manage 分區 | 名稱／成員數／Combined 徽章／目前錢包地址仍在最上。其下 **兩區**（命令語意不變）：① **成員地址**（`accounts.sectionMembers`）：貼上欄＋加號，再來成員列（短地址、設為目前錢包、刪）。② **本機錢包帳戶**（`accounts.sectionAddFromLocal`）：既有 signing／watch 勾選列。英文區塊名不用「Member wallets」（DOMAIN：列上是成員地址）。「Add from」不寫進標題。覆蓋 0.5.0 Manage 把本機勾選放在貼上欄之前的順序。刪成員（列上垃圾桶 **或** 取消本機勾選）先 `confirm(accounts.removeMemberConfirm)`；刪整個帳戶仍 `confirm(accounts.removeConfirm)`。建立草稿上的 chip 刪除不 confirm（尚未寫入） |
| 卡片拖曳 | Accounts 的 `.account-card-main` 是拖曳把手（不含重新命名、複製、kebab）。平時左側一列淡 grip 點；懸停加深陰影＋`grab`；拖移 `grabbing`。位移超過 **6px** 才算拖、結束不切 active。短按主區仍 `setActiveAccount` 回 Home。放下後立刻 `wallet.reorderAccounts`：payload `{ orderedIds: string[] }` 必須是當前全部帳戶 id 的排列，否則 `INVALID_ORDER`、列表不變。只改 `airwave.accounts.v1` 陣列順序；不改 id／公鑰／vault／連線／active。插入位置一條 2px `--accent` 線。拖曳主區 **禁止** 選取名稱／地址文字（`user-select: none`；pointerdown 清掉既有選取）。本版不做鍵盤調序。畫面不寫「可拖曳」 |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.26.0`。`shipped` 須使用者同意 |
| Storage 遷移骨架 | 擴充 `X.Y.Z` **不是** schema。世代是獨立整數，鍵名 **`airwave.schemaGeneration`**（不是 `*.v2` 後綴）。本碼 `CURRENT_SCHEMA_GENERATION = 1`。已安裝的 `airwave.settings.v1`／`accounts.v1`／`activeAccountId.v1`／`connections.v1`／`vault.v1` **就是第 1 代基線**。缺世代鍵＝第 0 代：SW 只寫入世代 `1`，**不**改那些 v1 值、不重加密金庫。已是 `1` 再跑結果相同。讀到 **大於** 本碼的世代：不降級、不刪鍵，仍接 command。只在 **service worker** 跑（啟動＋每筆 command 前 `await` 同一把 gate）。Popup／popout **禁止**寫此鍵。`chrome.storage.session` 不遷移。本版 **沒有** 金庫格式步驟，鎖定畫面不加遷移文案。失敗：不刪舊鍵、不建空金庫；該次 command `STORAGE_MIGRATION_FAILED`；gate 可下次再試 |

## 非目標

- 新路徑方案、改 BIP39／SLIP-0010 公式、預覽餘額
- 一次匯入多 index、24 詞產生、passphrase
- 側欄、地址簿、聚合送出、Agent、改 Home 非 combined 卡片
- 鍵盤調帳戶次序、拖代幣列、拖 Combined 成員、上移／下移文字鈕
- 改 custody、pending、Wallet Standard、accounts 列欄位形狀
- 改金庫 KDF／blob、把 `*.v1` 改名、雲端備份、popup 跑遷移
- 改 `../solibra-wallet`

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.6.0 契約 | 0.26.0 |
|------------|--------|
| 切方案須重跑預覽 | **維持**；修 popup 觸發，使契約真正發生 |
| SW 依 `pathKind` 衍生 | **不改** |
| Combined 展開：小 ▾＋單行 `addr · qty · %` | 34px chevron；兩行＋比例條 |
| 解鎖須點密碼欄 | 畫面可見即聚焦 |
| 字母頭像＋文字種類徽章 | 三色類型圖；widget 取代頭像 |
| Accounts 順序＝寫入序 | 主區拖曳改陣列序 |
| 無 schema 世代 | `airwave.schemaGeneration`＝1；資料形狀不變 |

## 實作 Track

### Track 1 — 切方案預覽生效

- **做：** 把方案鈕與自訂 path 失焦的 preview 移出 `setDraft` updater。`runPreview` 開始時的 state 更新帶上 snapshot 的 `kind`／`customPath`／`selected`。世代號仍只採較新一輪。
- **不做：** 改 SW；改文案；拆大檔。
- **驗收：** `cd wallet && npm run typecheck`。手驗：同一組 12 詞進挑帳戶 → 預設標準列 → 點 CLI／Ledger → `pathPreview` 變 `m/44'/501'/{n}'` 且至少 index 0 的縮寫公鑰與標準不同 → 點回標準則列回到先前那組。

### Track 2 — Combined 持倉展開

- **做：** 依概念稿與已定案改 Home combined 展開熱區與成員版面。重跑 `wallet/scripts/gen-ui-messages.mjs`。
- **不做：** 改 `getHomeTokens`、% 公式、點展開改 main。
- **驗收：** typecheck。手驗：chevron 熱區明顯大於現況；點 chevron 只展開不進詳情；展開後每成員兩行可見、360 寬無橫向捲軸、數量大者在上；點卡片主區仍進詳情。數量字級與卡片持倉列相同，地址為 monospace。

### Track 3 — 解鎖聚焦

- **做：** 上列四處解鎖畫面可見時 focus 密碼欄；失敗後回聚焦；刷新不搶焦。
- **不做：** 建庫／改密欄；自動填密碼。
- **驗收：** 打開鎖定 popup 可直接打字；點過標題後刷新不搶回；錯密碼後可再打。

### Track 4 — 類型圖示

- **做：** 共用圖示模組；widget 與簽署殼頭像改類型圖；Accounts 列表左側圖、刪種類徽章；catalog 三 key；popup 與 popout CSS 色。
- **不做：** 改 storage kind；Home 代幣列圖示。
- **驗收：** 三種顏色可分；鎖定後唯讀圖不變；使用中徽章仍在。

### Track 5 — 卡片拖曳排序

- **做：** `wallet.reorderAccounts`；Accounts 主區拖曳；6px 門檻；放下寫入。
- **不做：** 鍵盤排序；拖其它清單。
- **驗收：** 拖兩張卡後重開擴充次序仍在；短按仍切 active；kebab／複製不啟動拖。

### Track 6 — storage 世代骨架

- **做：** `ensureLocalMigrated`：0→1 只蓋戳。SW `index` 啟動與 `dispatch` 等待同一 promise。常數與鍵名在 `storage-keys.ts`。
- **不做：** 改 v1 內容；解鎖後重加密；UI 遷移畫面。
- **驗收：** 既有錢包重載擴充後帳戶仍在；`airwave.schemaGeneration` 為 `1`；再啟動不改其它鍵。typecheck。

## 驗收

- [x] 切「標準」↔「CLI／Ledger」後路徑列與 20 個地址隨方案變；不是只亮鈕、列不變
- [x] 連點兩方案時，最後停在的方案與列一致（過期回應不蓋回來）
- [x] 自訂失焦仍會重跑；無效 path 列清空（0.6.0 `INVALID_PATH`）
- [x] 匯入仍用當下方案＋所選 index 寫入 vault（不改 active）
- [x] Combined：點 34px chevron 只展開／收合；點卡片主區進詳情
- [x] 展開成員為兩行＋比例條；360px 寬地址與數量 ellipsis、無單行三欄擠爆；持倉大→小（同量則地址 natural sort）
- [x] 成員數量字體／字級對齊 `.token-qty`；短地址為 `--mono`
- [x] 解鎖畫面可見即可打密碼；失敗回聚焦；刷新不搶焦
- [x] widget 與 Accounts 三種類型圖同套；無種類文字徽章；使用中仍在
- [x] 拖卡片改序並持久化；短按仍回 Home；按鈕不啟動拖
- [x] 重載擴充後既有帳戶仍在；`airwave.schemaGeneration` 為 1；金庫鍵未因遷移被覆寫
- [x] `cd wallet && npm run typecheck` 通過

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/popup/onboarding/OnboardingScreens.tsx` | `ImportSeedPick` 方案鈕／自訂失焦 |
| `wallet/src/popup/onboarding/import-seed-flow.ts` | `requestSeedPreview`、draft |
| `wallet/src/shared/seed-derive.ts` | 路徑模板（本版不改公式） |
| `wallet/src/background/wallet/commands/account/seed-accounts.ts` | SW preview／import（本版不改語意） |
| `wallet/src/popup/components/HomeTokenList.tsx` | Combined 展開列 |
| `wallet/src/popup/style.css` | 持倉卡／成員面板 |
| `docs/design-demos/combined-token-expand-ux.html` | 展開視覺概念稿 |
| `wallet/src/flow/UnlockForm.tsx`、`OnboardingScreens.tsx` `LockedScreen`、`approval/shell.ts` | 解鎖聚焦 |
| `wallet/src/popup/components/WalletWidget.tsx` | 頂欄類型圖 |
| `wallet/src/popup/accounts/AccountsScreens.tsx` | 列表圖示與拖曳 |
| `wallet/src/background/wallet/commands/account/account-records.ts` | `reorderAccounts` |
| `wallet/src/shared/storage-keys.ts` | `STORAGE.schemaGeneration`、`CURRENT_SCHEMA_GENERATION` |
| `wallet/src/background/storage/migrate-local.ts` | SW 遷移 gate |
| `wallet/src/background/index.ts` | command 前 await 遷移 |
