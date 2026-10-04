# Implementation review — 0.11.0 Airwave Wallet

- **日期：** R1 2026-10-04（Asia/Hong_Kong）
- **輪次：** R1（本檔累加；穩定 ID 勿重編號）
- **角色：** 實作審查（不改程式、不加功能、不 commit）
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`sign-tx-budget-how.md`](./sign-tx-budget-how.md)；[`reasoning.md`](./reasoning.md)；[`../HANDOFF.md`](../HANDOFF.md)；架構禁區見 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **現行程式：** working tree（未 commit）；不以 chat history 為準

---

## 總評

**R1：** 有未關閉 HIGH（H1）。**R1 修復後：** H1、M2 已關；無未關閉 HIGH。`typecheck`／`build` 通過；Chrome 手驗仍未執行（出貨前建議用未封裝擴充走一輪 INDEX checklist）。

---

## Findings

### HIGH

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| H1 | 批准未使用 `workingTx`（先清 state 再讀） | **已關閉** | R1 發現：`takePending` 先清 `signTxState` 再 `getWorkingTx` 恆為空。**修復：** `finishSignTransaction` 在 `takePending` 前快照 `workingBytes = getWorkingTx(requestId)`，簽 `workingBytes ?? transaction`。 |

### MEDIUM

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| M1 | 版本號仍為 0.10.1 | **開啟** | [`version.md`](../../../../version.md)、[`wallet/package.json`](../../../../wallet/package.json) 為 `0.10.1`；[`changelog.md`](../../../../changelog.md) 最新條為 0.10.1。0.11.0 功能已在 working tree，出貨前需與 HANDOFF 對齊。 | 使用者同意出貨時一併升版與 changelog。 |
| M2 | 交易明細 `<summary>` 文案與 INDEX 標題不一致 | **已關閉** | popout summary 改為「交易明細 · 指令」。 |

### LOW

| ID | 標題 | 狀態 | 說明 |
|----|------|------|------|
| L1 | INDEX／HANDOFF 出貨欄未勾 | **開啟** | INDEX 狀態 `in progress`；HANDOFF 完成檢查未勾；符合審查時點。 |
| L2 | 0.10.0 文件與 changelog 同 diff 內有 0.10.1 模擬語意更新 | **備註** | 與 0.11.0 主題無關，但 working tree 混有上游 HOW 修訂；出貨 0.11.0 時確認是否已另版標記。 |

---

## 自動化測試

| 指令 | 結果 | 備註 |
|------|------|------|
| `cd wallet && npm run typecheck` | **通過** | R1 exit 0 |
| `cd wallet && npm run build` | **通過** | R1 `tsc --noEmit && vite build` exit 0 |

---

## 架構禁區（GUIDELINES／INDEX 摘要）

| 項 | 結論 | 靜態證據 |
|----|------|----------|
| Pending／模擬不進 `chrome.storage` | **符合** | `sign-tx-pending-state` 僅 `Map`；`SimulatePendingTxResult` 經 command 回 popout |
| 批准不廣播、結果回原 tab | **未重審** | 沿用 0.10 `finishSignTransaction` + `sendBridgeResult` 形狀；本輪未追 frameId |
| 未簽 CU 寫入僅 SW、phase 1 副本不進 `workingTx` | **符合（模擬路徑）** | [`sign-tx-simulate.ts`](../../../../wallet/src/background/sign-tx-simulate.ts) phase 1 用 probe bytes，僅成功寫入後 `tryCommitWorkingTx` |
| `writeSeq` 防舊覆寫 | **符合** | [`sign-tx-pending-state.ts`](../../../../wallet/src/background/sign-tx-pending-state.ts) `tryCommitWorkingTx` |
| 已簽不寫 `workingTx`、忽略 cu | **符合** | `simulateSignTransaction` signed 分支 |
| popout 費用欄不用 `feeLamports`／`getFeeForMessage` | **符合** | wallet 內無 `getFeeForMessage`／`feeLamports`；popout 用 `sigFeeLamports`／`totalFeeLamports` |
| Default CU price settings | **符合** | [`storage-keys.ts`](../../../../wallet/src/shared/storage-keys.ts) 出廠 25000；樞紐列在 API keys 與錢包密碼之間 |

---

## Track 對照（INDEX）

| Track | 靜態結論 | 備註 |
|-------|----------|------|
| 1 Settings `defaultCuPrice` | **通過** | normalize、子頁、debounce／blur 寫入 |
| 2 SW phase 1／2、`ui.simulatePendingTx` | **通過（靜態）** | H1 修復後批准 bytes 與 INDEX 一致 |
| 3 popout 交易費卡 | **通過（靜態）** | M2 已關 |
| 4 build | **通過** | 見上表 |

---

## 驗收對照（INDEX 出貨 checklist）

證據：**建置＋靜態碼**。**未載入 Chrome 擴充，瀏覽器手驗未執行。**

| 驗收項 | 結果 | 證據 |
|--------|------|------|
| 未簽：交易費總費、明細收合、可改 limit／price、改後重模擬、批准後 dApp 得 CB、不廣播 | **靜態通過／無手驗** | H1 修復後簽 `workingTx`；dApp 回傳需瀏覽器確認 |
| 已簽：CU 唯讀、不增第二條 limit／price | **靜態通過**／**無手驗** | `cuEditable: false`；簽原 bytes |
| Settings Default CU price 25000；新審批初始 price | **靜態通過**／**無手驗** | phase 1.5 用 `settings.defaultCuPrice` |
| phase 1 總費「估計中」；`unparseable` 外批准可按 | **靜態通過**／**無手驗** | `renderFeeCard(loading)`；`applyApproveFromSimulation` |
| 預期變動僅 phase 2；失敗 notice 同 0.10.0 | **靜態通過**／**無手驗** | `runPhase2Simulation`；popout notice 沿用 |
| connect／signMessage 維持；pending 不進 storage；結果回原 tab | **靜態未見本版破壞**／**無手驗** | diff 主改 signTransaction／settings |
| `cd wallet && npm run build` | **通過** | R1 |
| 文件與程式無真實秘密 | **通過** | roadmap 0.11.0 與審查抽樣未見助記詞／私鑰 |

---

## 錨點檔案抽樣

| 路徑 | R1 備註 |
|------|---------|
| `wallet/src/background/compute-budget-tx.ts` | disc 2／3、builtin 表、封包 1232、duplicate 檢查 |
| `wallet/src/background/sign-tx-simulate.ts` | phase 1→1.5→2、INVALID_PAYLOAD、費用公式 |
| `wallet/src/background/index.ts` | `ui.simulatePendingTx`、`finishSignTransaction`（**H1**） |
| `wallet/src/popout/main.ts` | 交易費卡、`simGen`／`seq`、`hasCuPair` 重試 |
| `wallet/src/popup/*` | Default CU price 樞紐與子頁 |

---

## R1 審查環境

- OS：win32；審查 agent 未執行 test-web 手動簽交易流程。
- Git：working tree 含未追蹤 `docs/roadmap/0.11.0/` 與新 SW 模組；未 commit。
