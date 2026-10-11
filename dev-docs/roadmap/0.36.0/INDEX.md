# 0.36.0 — 簽署交易 CU：尊重 dApp 已設 limit／price

- **狀態：** `shipped`
- **上游版本：** [0.35.0](../0.35.0/INDEX.md)；CU 審批與 `workingTx` 契約接 [0.11.0](../0.11.0/INDEX.md)、[0.27.0](../0.27.0/INDEX.md)（本地 patch、不 decompile lookup）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** Jupiter swap demo：dApp 已嵌入 Compute Budget，錢包自動改寫 bytes 導致簽名與預期不符
- **秘密欄位：** 無

## 產品句

未簽 `signTransaction` 時，**僅在交易尚未設定** CU limit 或 CU price 時才自動寫入（可只補其中一項）；dApp 已設好的值**預設不改**。審批仍顯示解析出的 limit／price 與費用；使用者按「套用 CU」並改欄位後才寫入 `workingTx`。批准時無 `workingTx` 則簽原始 payload（與 0.11.0 相同）。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 自動寫入 | `parseCuFromMessage` 已有 **SetComputeUnitLimit（disc 2）** → **不**自動改 limit；已有 **SetComputeUnitPrice（disc 3）** → **不**自動改 price。兩者皆已有 → **不**呼叫 `writeCuToTransactionBytes`、**不**建立 `workingTx`；phase 2 模擬用**原始 bytes**。 |
| 缺欄補齊 | 只缺 limit → phase 1 估 limit + 只 patch limit（price 不動）。只缺 price → 用 Settings `defaultCuPrice` + 只 patch price。兩者皆缺 → 行為同舊版（估 limit + default price，一次或分 patch 皆可）。 |
| 使用者覆寫 | popout 僅在「套用 CU」之後的 `ui.simulatePendingTx` **帶齊** `cuLimit` + `cuPrice`（與 0.11.0 重試規則一致）。第一次進殼與週期重模擬**省略**兩欄，避免把「顯示用解析值」當成寫入指令。 |
| 費用卡 | 顯示與 `priorityLamports` 用**有效** limit／price：來自 tx 解析值，或自動補齊後的值，或使用者套用後的值。 |
| 已簽交易 | 仍唯讀、不寫 `workingTx`（0.11.0）。 |
| duplicate CB disc | 仍不寫入、`cuWriteError` 同現行。 |
| 非目標 | 改 Jupiter／test-web 組 tx；`signAndSendTransaction` 新行為；改 Default CU price Settings UI |

## 驗收

- [x] Jupiter（或已帶 limit+price 的 swap tx）：審批後 dApp 收到的簽名 message **與送出前相同**（除簽名槽）；模擬與費用卡顯示 dApp 的 CU
- [x] 無 Compute Budget 的簡單轉帳：仍自動補 limit+price，`workingTx` 存在，批准簽補齊後交易
- [x] 只缺 price：自動只加 price，limit 指令 bytes 不變
- [x] 手改 CU 並套用：仍寫 `workingTx`，批准簽改寫後交易
- [x] `cd wallet && npm run typecheck && npm run build`

## 錨點

| 路徑 | 用途 |
|------|------|
| `wallet/src/background/simulate/sign-tx-simulate.ts` | 自動／覆寫分支 |
| `wallet/src/background/simulate/compute-budget-tx.ts` | `CuBudgetPatch` 局部寫入 |
| `wallet/src/approval/shell.ts` | `cuUserOverride` 與 simulate payload |
