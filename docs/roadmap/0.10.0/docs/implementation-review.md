# Implementation review — 0.10.0 Airwave Wallet

- **日期：** R1 2026-10-04（Asia/Hong_Kong）
- **輪次：** R1（初審）
- **角色：** 實作審查（不改程式、不加功能、不 commit）
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`sign-transaction-how.md`](./sign-transaction-how.md)；[`../reasoning.md`](../reasoning.md)；[`../HANDOFF.md`](../HANDOFF.md)；[`docs/sign-transaction-how.md`](../../../../sign-transaction-how.md)（倉庫根無此檔，HOW 以本版 `docs/sign-transaction-how.md` 為準）；架構禁區見 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **現行程式：** working tree（未 commit）；變更檔見 git `status`／`diff`；不以 chat history 為準

---

## 總評

**R1（初審）：** 靜態對照 INDEX／HOW 與 GUIDELINES 架構禁區未見阻擋性 HIGH；`wallet` build／typecheck 與 `test-web` build 通過。**尚無整包測試指令**（GUIDELINES）。

**R1 補記（2026-10-04）：** 使用者於 Chrome 載入擴充並手測 test-web，確認 INDEX checklist 通過。出貨門檻滿足。

---

## Findings

### HIGH

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| — | （無） | — | R1 靜態＋建置未發現違反已定案或 GUIDELINES 架構禁區之阻擋項 | — |

### MEDIUM

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| M1 | signTransaction 全流程未做瀏覽器手驗 | **已關閉** | 使用者手測 test-web／popout 通過（2026-10-04）。 | — |
| M2 | 版本號仍為 0.9.0 | **已關閉** | `wallet/package.json`、`version.md`、`changelog.md` 已對齊 0.10.0。 | — |
| M3 | 模擬 RPC 逾時非「整段共用 15 秒」 | **已關閉** | [`simulate-pending-tx.ts`](../../../../wallet/src/background/simulate-pending-tx.ts) 改為 `SimDeadline` 單一 15s 預算。 | — |

### LOW

| ID | 標題 | 狀態 | 說明 |
|----|------|------|------|
| L1 | 契約目錄與新模組為 untracked | **開啟** | `docs/roadmap/0.10.0/`、`wallet/src/background/simulate-pending-tx.ts`、`wallet/src/shared/simulate-pending-tx-types.ts` 等尚未 commit；審查以檔案內容為準。 |
| L2 | 無 simulation／popout 自動化測試 | **開啟** | INDEX Track 僅要求 typecheck／build；非契約硬需求。 |
| L3 | 訊息內尚未存在的 token account 可能未列入 `addresses` | **開啟** | 模擬前以 `getAccountInfo` 篩 message keys 上**已存在**的 SPL 帳戶；新建 ATA 等鏈上尚無資料者可能未進 `simulateTransaction.accounts.addresses`，主舞台差額可能不完整。0 lamport 自轉／餘額不足失敗向量不受影響。 |
| L4 | 無整包測試 runner | **開啟** | GUIDELINES 明示尚無整包指令；勿假設 `bun test`。 |

---

## R1 重點對照（INDEX／HOW／禁區）

| 檢查項 | 結論 | 靜態證據 |
|--------|------|----------|
| `dapp.signTransaction` 鎖定不早退 `WALLET_LOCKED`；仍 `addPending`＋`openPopout` | **符合** | 使用 `signMessageEnqueueGateError`（無鎖定分支）；[`index.ts`](../../../../wallet/src/background/index.ts) L678–714 |
| enqueue `signAccountId`；`finishSignTransaction` 只簽該 id | **符合** | L705、L490–538 `keypairForAccountId(signAccountId)` |
| 無作用中／唯讀仍立刻 `NO_ACCOUNT`／`ACCOUNT_READ_ONLY` | **符合** | 與 signMessage 相同 enqueue gate |
| `ui.simulatePendingTx`；kind 不符 → `NOT_FOUND` | **符合** | L773–782 |
| popout 不自行打 RPC、不 deserialize 畫指令列 | **符合** | [`popout/main.ts`](../../../../wallet/src/popout/main.ts) 僅 `ui.simulatePendingTx`；明細用 `instructions[]` |
| 模擬參數 `sigVerify: false`、`replaceRecentBlockhash: true`；先 pre 再 post 差 | **符合** | [`simulate-pending-tx.ts`](../../../../wallet/src/background/simulate-pending-tx.ts) L260–337 |
| `addresses` 含凍結公鑰＋message 內其 SPL 帳戶（已存在者） | **部分** | L237–258；見 L3 |
| `unparseable` → 批准 disabled；直接 approve → `INVALID_TRANSACTION` | **符合** | popout `applyApproveFromSimulation`；SW L514–524 |
| 模擬 `fail`：notice「預計交易失敗」、同卡收合詳情、不自動拒絕 | **符合** | `renderSimulationNotice` L281–305 |
| 模擬 `rpc`：notice「無法模擬」、無 logs 詳情區（fail 才有） | **符合** | L269–279 vs fail 分支 |
| 批准不 `sendTransaction` | **符合** | `finishSignTransaction` 僅 `tx.sign`＋回傳 bytes |
| pending 不進 `chrome.storage`；結果只回原 tab | **符合** | pending Map；`sendBridgeResult(p.tabId, …)` |
| 關窗 `USER_REJECTED`（`Approval window closed`） | **符合** | `onRemoved` L1906–1933 |
| connect 仍 legacy JSON；signMessage 仍 0.9.0 分支 | **符合** | `showLegacyConnect`；`renderSignMessageBody` |
| 解鎖屏無 dock；解鎖鈕 `flex: none`；類 B `type="text"` | **符合** | [`style.css`](../../../../wallet/src/popout/style.css) L117–119；[`index.html`](../../../../wallet/src/popout/index.html) |
| 本窗解鎖 700ms hold；popup 解鎖 `onChanged` 無 hold | **符合** | `refreshAfterUnlock(true\|false)`；L667–672 |
| test-web 保留簽交易＋新增模擬失敗向量 | **符合** | [`test-web/src/main.ts`](../../../../test-web/src/main.ts) L263–303；[`index.html`](../../../../test-web/index.html) |
| 熟名 program 僅 HOW 靜態表 | **符合** | `PROGRAM_NAMES`／`instructionDesc` |
| diff 無真實助記詞／私鑰／密碼 | **符合** | test-web 用 `Keypair.generate()` 作 drain 目標 |

---

## 驗收對照（INDEX 出貨 checklist）

證據：**建置／靜態碼**；標 **需手驗** 者本審查未在 Chrome 執行。  
**測試：** 尚無整包測試指令（GUIDELINES）；僅執行 INDEX／Track 點名指令。

| 驗收項 | 結果 | 證據 |
|--------|------|------|
| 已解鎖、可解析交易：非 JSON 主畫面；標題、站點、凍結 widget、預期變動／查詢中／無變動；明細預設收合；批准後 dApp 得已簽交易、未廣播；審批期 popup 切帳不改 widget／簽名者 | **靜態通過**／**需手驗** | popout DOM／`signAccountId`／SW 簽名路徑 |
| 模擬 `value.err` 非空：notice「預計交易失敗」在上；原因一行；失敗詳情同卡收合；不自動拒絕；批准仍可簽回 | **靜態通過**／**需手驗** | test-web「預期模擬失敗」按鈕 |
| RPC 不可用：notice「無法模擬」；批准仍可按（可 deserialize） | **靜態通過**／**需手驗** | `outcome: "rpc"` UI |
| 無法 deserialize：無法模擬；批准 disabled；拒絕 `USER_REJECTED`；強制 approve → `INVALID_TRANSACTION` | **靜態通過**／**需手驗** | SW＋popout 分支 |
| 鎖定簽交易：不立刻 `WALLET_LOCKED`；整頁解鎖；本窗解鎖 700ms hold | **靜態通過**／**需手驗** | enqueue gate；hold |
| `ui.getPending` 失敗：請求已不在；兩鈕 disabled | **靜態通過** | `showGone` |
| connect JSON；signMessage 0.9.0 | **靜態通過**／**需手驗** | popout 分支 |
| 解鎖欄非 password；pending／模擬不進 storage；只回原 tab | **靜態通過** | 見上表 |
| `cd wallet && npm run build` | **通過** | 見測試記錄 |
| 文件與程式無真實秘密 | **靜態通過** | diff 抽樣 |

### Track 對照

| Track | 靜態是否具備 | 備註 |
|-------|----------------|------|
| 1 SW 鎖定開窗／凍結帳戶／`ui.simulatePendingTx` | **是** | typecheck 通過 |
| 2 signTransaction popout UI | **是** | |
| 3 test-web 失敗向量 | **是** | test-web build 通過 |

---

## 測試記錄

| 輪次 | 指令 | cwd | 結果 |
|------|------|-----|------|
| R1 | `npm run typecheck` | `wallet/` | **通過**（exit 0） |
| R1 | `npm run build` | `wallet/` | **通過**（`tsc --noEmit && vite build`，exit 0） |
| R1 | `npm run build` | `test-web/` | **通過**（exit 0） |
| R1 | Chrome 載入 `wallet/dist`＋test-web、INDEX checklist 手驗 | — | **通過**（使用者確認，2026-10-04） |

**整包測試：** 倉庫尚無統一 test runner 指令（GUIDELINES）；本版驗收以 INDEX 手驗與上表 narrow 指令為準。

### 需瀏覽器手驗（對 INDEX 驗收）

1. 已解鎖：test-web「簽交易」（0 lamport 自轉）→ popout「簽署交易」、凍結 widget、預期變動（或「無餘額變動」）、交易明細預設收合；批准後 dApp 得 `signedTransaction`；鏈上無錢包代送；審批中 popup 切 active 帳戶，popout widget 與簽名帳戶不變。
2. 「Sign transaction（預期模擬失敗）」→ notice「預計交易失敗」在預期變動上方；失敗詳情收合；批准仍可簽回（或使用者選拒絕）。
3. 人為斷 RPC／錯 cluster（Settings）→「無法模擬」；可解析交易時批准仍可點。
4. 餵入無法 deserialize 的 bytes（若 test-web 無向量則 devtools 改 pending payload 不屬本版範圍）→ 批准 disabled；`ui.resolvePending` approve → dApp `INVALID_TRANSACTION`。
5. 鎖定狀態觸發 signTransaction → popout 解鎖屏（無底欄）；本窗解鎖後約 700ms 批准 disabled；先在 popup 解鎖再簽則無 hold。
6. 無效 `requestId` 或關窗／逾時後開 popout →「請求已不在」。
7. connect 仍 JSON；signMessage 仍 0.9.0 版面。

隱私：本報告未寫入助記詞、私鑰、密碼、真實地址或生產 API key。

---

## 修復追蹤

| ID | 目標狀態 | 關閉條件 |
|----|----------|----------|
| M1 | 已關閉 | 使用者 Chrome 手驗 INDEX checklist |
| M2 | 已關閉 | 版本 bump 至 0.10.0 |
| M3 | 已關閉 | 實作單一 15s deadline |
| L1 | 開啟 | 與程式一併 commit |
| L2 | 開啟 | 可選 |
| L3 | 開啟 | 可選；邊界案例 |
| L4 | 開啟 | 資訊性 |

---

## Working tree 摘要（R1）

**已修改：** `wallet/src/background/index.ts`、`wallet/src/popout/*`、`wallet/src/shared/commands.ts`、`test-web/*`、`docs/design-demos/*`、`docs/roadmap/README.md`、`docs/roadmap/backlog/*` 等。

**未追蹤（與 0.10.0 相關）：** `docs/roadmap/0.10.0/`（含本檔）、`wallet/src/background/simulate-pending-tx.ts`、`wallet/src/shared/simulate-pending-tx-types.ts`、`docs/roadmap/backlog/sign-transaction-priority-fee.md`。
