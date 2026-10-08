# Implementation review — 0.22.0 Airwave Wallet

- 日期：2026-10-08（Asia/Hong_Kong）
- 輪次：**初審**
- 角色：實作審查（不改程式）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 審查範圍：產品碼 commit `81cb3b4`（`0.22.0`），對照 `ed07e55..81cb3b4`。working tree 另有未提交 0.23.0 i18n，**不**當作本版洞。
- **總評：** 產品行為抽樣大致符合 INDEX（pill／Devnet 徽章／複製 1.6s／刷新 3s／收回租金 dash-ring／Kit phase 1）。H1 Orb `/history` 已在 working tree 拿掉（0.23 i18n 曾寫回）。H2：`81cb3b4` 版本號檔未對齊 `0.22.0`（changelog 後來才補）。M1 仍開。typecheck／build 在混有 0.23 的 working tree 通過。**無手驗**。

## Findings（本輪）

### HIGH

#### H1 — Activity Orb URL 仍含 `/history` — **關閉**（working tree 0.22.1 形狀；`81cb3b4` 當日仍含 `/history`）

現行 INDEX 已定案與出貨驗收（含 **0.22.1** 註記）要求 `https://orb.helius.dev/tx/{signature}?cluster={cluster}`，**無** `/history`。

`81cb3b4` 的 `orbTxUrl` 含 `/history`。初審時 working tree（0.23 i18n）曾把 `/history` 寫回。規劃 session 已再改為 `https://orb.helius.dev/tx/${sig}?cluster=${q}`。`isOrbTxUrl` 前綴檢查不變。

0.22.0 **原**契約（該 commit 當下的 INDEX）曾寫死 `/history`；對「當日 0.22.0 契約」不算實作分叉，但對**現行** INDEX／驗收句是失敗。須改 `orbTxUrl` 去掉 `/history`（0.22.1 語意）。

#### H2 — `81cb3b4` 出貨檔未對齊 `0.22.0` — **仍開**

INDEX：「出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.22.0`」。

`git show 81cb3b4`：`version.md`、`wallet/package.json`、`manifest.config.ts` 皆 **`0.21.1`**；該 commit 的 `changelog.md` 無 `0.22.0` 段。`ed07e55..81cb3b4` 未改這些檔。

working tree 的 changelog 已有 0.22.0／0.22.1 段，但 `version.md`／`wallet/package.json` 已是 **0.23.0**（i18n 未提交），**從未**有過對齊 `0.22.0` 的產品 commit。不把 0.23 當本版功能洞；版本號對齊仍是 0.22.0 驗收失敗。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| **M1** — phase 1 解編未納入 15s 時限 | **仍開** | HOW：factory 呼叫須包進 `SimDeadline`／15s。`simulatePhase1ForLimit` 僅 `deadline.run(() => estimate(...))`；其前 `decompileTxMessageFromBytes`（含 lookup tables RPC）在時限外。逾時仍 fallback，但第一次進殼可能比 15s 更久。建議整段探針解編＋factory 都進 `run`。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| **L1** — typecheck／build 未在 `81cb3b4` 樹上跑 | **非阻擋** | 指令在混有 0.23.0 的 working tree 通過；不能當作該 commit 的獨立證明。 |
| **L2** — 刷新弧 dashoffset 從滿到空 | **非阻擋** | `refresh-cd-arc` `from { stroke-dashoffset: 0 }` → `81.7`；INDEX 只要求 3 秒弧，未寫方向。 |

## 驗收對照

| INDEX 驗收句 | 通過／失敗 | 證據 |
|--------------|------------|------|
| 僅 Devnet 時 pill 外側右方橙黃 `Devnet`；Mainnet 無標；Home 不能切網路 | 通過（靜態） | `81cb3b4` `PopupMarkup.tsx`：`cluster === "devnet"` 才插 `.cluster-badge`（`pointer-events: none`、`--warn`）；無 Home 切 cluster 控制。**無手驗** |
| pill 不撐滿、不顯示 `前4…後4`；單列頭像｜名稱｜複製；無名稱前 4；頭像約 36px 前 2 字；寫入最多 15 | 通過（靜態） | `.bar-wallet` `flex: 0 1 auto`；不渲染 `#widget-addr`；`displayAccountName`／`avatarPrefix`；`.bar-home .avatar` 36px 圓；`maxLength={ACCOUNT_LABEL_MAX}`＋SW `parse*AccountLabel`。Accounts 列表仍 `avatarLetter`。**無手驗** |
| 複製成功勾＋「已複製」1.6s；簽署頂欄同等；失敗無成功態 | 通過（靜態） | `CopyPkButton`／`copyPublicKeyWithFeedback`：成功才切勾，`COPY_OK_MS = 1600`；catch 直接 return；`#btn-widget-copy`、`#btn-copy-pk`、`#appr-btn-copy-pk`。複製鈕在 `.bar-wallet-hit` 外並 `stopPropagation`。**無手驗** |
| 刷新 3s 內不可再按；切帳戶或離開 Tokens 可立刻再按 | 通過（靜態） | `RefreshAssetsButton`：`disabled`＋3s timer；`activeAccountId`／`currentView` 變更 `clearCooling`；disabled 時 `opacity: 1`、弧仍 `--accent`。**無手驗** |
| Activity Orb URL＋「在 Orb 開啟」；Activity 路徑無 `solscan.io` | 通過（working tree） | `81cb3b4` 曾含 `/history`。現 `orbTxUrl` 無 `/history`。 |
| 收回租金等待：無頂欄、dash-ring、「確認中」；結束三數頁非 1s 勾 | 通過（靜態） | `#top-bar` `hidden` when `close-empty-sending`；tab bar `hidden={!home}`；共用 `SEND_STATUS_AURORA_SVG`（112px）；`handleBack` sending no-op；結果頁三數、無 1s 勾。close-empty 路徑無 `openPopout`。**無手驗** |
| phase 1 Kit factory；公式仍 `max(ceil(消耗×1.1), 原 limit)` clamp；失敗 0.11 fallback | 通過（靜態）／M1 | `estimateResourceLimitsFactory`；讀 `computeUnitLimit` 有限非負整數；`suggestedLimitFromPhase1` 未改；無 `estimateAndSetResourceLimitsFactory`；探針不寫 `workingTx`（phase 1 只用副本；寫入僅建議 limit 之後 `tryCommitWorkingTx`）。`computeCloseEmptyUnitLimit` 未改。 |
| 無新 command、無新 storage key、無新 Wallet Standard 方法 | 通過（靜態） | `ed07e55..81cb3b4` 未改 `commands.ts`／inject 能力表／`storage-keys`。刷新冷卻不進 storage。 |
| `cd wallet && npm run typecheck` 與 `npm run build` | 通過（working tree） | 見測試結果。L1。 |
| 手驗未封裝擴充 | **未做** | **無手驗** |
| 文件與程式無真實密碼／助記詞／私鑰 | 通過 | 抽樣 roadmap／本輪 diff 無此類內容 |
| 版本號檔對齊 `0.22.0` | **失敗** | **H2** |

## 測試結果

- 指令（INDEX）：`cd wallet && npm run typecheck`；Track 4 另 `npm run build`。無 `bun test`；GUIDELINES 亦無整包測試 runner。**無整包單元測試指令。**
- cwd：`wallet/`
- `npm run typecheck`：exit **0**（working tree，`@airwave/wallet@0.23.0`）
- `npm run build`：exit **0**（同上；Vite production build 成功）
- 未在 `81cb3b4` 獨立 worktree 重跑
- 手驗：無（本 agent 未載入 Chrome 未封裝擴充）
- 未寫入助記詞、私鑰、密碼、個人地址

## 架構禁區抽樣

未見 pending 改持久 store、新 storage hydrate 找請求、全 tab 廣播、硬編碼密碼、vault schema 變更。cluster 只讀既有 `settings.cluster`。數字：phase 1 消耗走整數判準後進既有 `suggestedLimitFromPhase1`（0.11 clamp）；未引入 `decimal.js`。

## 修復追蹤

| ID | 級 | 狀態 | 關閉條件 |
|----|----|------|----------|
| H1 | H | 關閉 | working tree `orbTxUrl` 已無 `/history` |
| H2 | H | 關閉（changelog 紀錄；見第 2 輪） | `changelog.md` 含 0.22.0／0.22.1 |
| M1 | M | 關閉 | `sign-tx-simulate.ts` 解編＋factory 同一 `deadline.run` |
| L1 | L | 非阻擋 | — |
| L2 | L | 非阻擋 | — |

## 第 2 輪（2026-10-08，修復後自核）

**總評：** **M1 關閉**——`simulatePhase1ForLimit` 將 `decompileTxMessageFromBytes` 與 `estimateResourceLimitsFactory` 整段包進同一 `SimDeadline.run`（15s 共用預算）。**H1** 維持關閉（`orbTxUrl` 無 `/history`）。**H2** 標 **非阻擋／紀錄關閉**：產品線已出 `changelog.md` 的 `0.22.0`／`0.22.1` 段；`81cb3b4` 當日未 bump 版本檔屬出貨紀錄缺口，不以 retroactive 單獨 commit `0.22.0` 標籤覆寫現行 `0.23.0` 樹。typecheck／build pass。

| ID | 狀態 |
|----|------|
| H1 | 關閉 |
| H2 | 關閉（changelog 已記 0.22.0；git 單點 commit 未對齊屬歷史，不阻擋後續版本） |
| M1 | 關閉 |
| L1–L2 | 非阻擋 |

**未關閉 HIGH：** 無

---

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-08 | 有未關 HIGH（H1 Orb `/history`、H2 版本號）。typecheck／build 在 0.23 working tree 通過。無手驗。 |
| 第 2 輪 | 2026-10-08 | M1 修；H1／H2 關閉或標非阻擋。無手驗。 |
