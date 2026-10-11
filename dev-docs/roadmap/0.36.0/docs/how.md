# 0.36.0 — 實作 HOW

## SW：`simulateSignTransaction`

未簽、payload **未**帶齊 `cuLimit`+`cuPrice`、且尚無 `workingTx`：

1. `parsed = parseCuFromMessage(compiled)`
2. 若 `parsed.limit != null && parsed.price != null` → `runPhase2WithFees(originalBytes, …, parsed.limit, parsed.price)`，**return**（不 `tryCommitWorkingTx`）
3. 若 `hasDuplicateCbDisc` → phase 2 原文，費用欄用已解析值（可 null），`cuWriteError`
4. 組 `CuBudgetPatch`：`limit` 僅當 `parsed.limit == null`（值來自 phase 1）；`price` 僅當 `parsed.price == null`（值為 `defaultCuPrice`）
5. `writeCuToTransactionBytes(originalBytes, patch)`；成功則 `tryCommitWorkingTx`；phase 2 用寫入後 bytes，費用欄用 patch 後的有效 limit／price

payload **帶齊**兩欄：與 0.11.0 相同，寫入該組合再 phase 2。

已有 `workingTx` 且 payload 省略兩欄：只 phase 2 `workingTx`（不變）。

## `writeCuToTransactionBytes`

簽名改為 `patch: { limit?: number; price?: number }`。至少一項；只 `upsertDisc` 有提供的 disc。驗證只檢查被 patch 的 disc 數量與解析值。

Phase 1 探針：`{ limit: CU_LIMIT_MAX, price: 0 }`（不 commit）。

## Popout `approval/shell.ts`

- `cuUserOverride`：套用 CU 時設 `true`；新 request／reset 時 `false`
- `runSimulation`：僅 `cuUserOverride && hasCuPair()` 時帶 `cuLimit`／`cuPrice`

批准仍：`finishSignTransaction` 使用 `workingTx ?? original`（0.11.0）。
