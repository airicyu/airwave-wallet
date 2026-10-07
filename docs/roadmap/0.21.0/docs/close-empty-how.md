# HOW — 0.21.0 清理空 token account

INDEX 衝突以 INDEX 為準。優先費進位與 Default CU price 見 [0.11.0 sign-tx-budget-how](../../0.11.0/docs/sign-tx-budget-how.md)。Kit RPC 端點規則見 [0.20.0 kit-migration-how](../../0.20.0/docs/kit-migration-how.md)。

## 不改

- dApp 簽署、`walletSend`、pending／popout 生命週期
- 持倉列仍濾掉餘額 0（本功能另掃鏈上空帳戶）
- 不新增 `chrome.storage` key、不新增 pending kind

## 命令

### `wallet.listClosableTokenAccounts`

- 呼叫者：popup
- payload：`{ force?: boolean }`（`true` 時略過 SW 60s 掃描快取）。持倉 `getHomeTokens` 重新整理時應帶 `force: true`
- 成功：

```ts
{
  entries: ClosableEntry[];
  /** 掃描中部分 owner 失敗時仍可回已掃到的 entries；全失敗則 ok: false */
}
```

`ClosableEntry`：

| 欄 | 型別 | 說明 |
|----|------|------|
| `tokenAccount` | string | base58 |
| `owner` | string | 可簽成員公鑰 |
| `ownerAccountId` | string | 本機帳戶 id（聚合時分組用） |
| `ownerLabel` | string | 帳戶顯示名 |
| `mint` | string | base58 |
| `symbol` | string | 持倉有則用；wSOL mint 無列時 `wSOL`；否則 mint 前 4…後 4 |
| `tokenProgram` | `"spl-token"` \| `"token-2022"` | |
| `rentLamports` | string | 十進位整數字串；該 token account 的 lamports 餘額 |

- 失敗：`NO_ACCOUNT`、`ACCOUNT_READ_ONLY`。**鎖定仍允許**（不回 `WALLET_LOCKED`）
- RPC **全部** owner 掃描失敗：`ok: false`，`error.code` `RPC_ERROR`。部分 owner 失敗：`ok: true` 且 `entries` 為已成功部分（可選 `partialScan: true` 旗標）

### `wallet.planCloseEmpty`

確認頁開啟前由 popup 呼叫。payload：

```ts
{
  tokenAccounts: string[]; // 使用者勾選的 token account 地址，順序不限
}
```

成功：

```ts
{
  planId: string; // SW 記憶體 uuid，15 分鐘 TTL
  accountCount: number;
  txCount: number;
  reclaimLamports: string; // 勾選戶 rent 加總，未扣手續費
  fee: {
    totalLamports: string;
    signatureLamports: string;
    priorityLamports: string;
  };
  txs: Array<{
    ownerAccountId: string;
    owner: string;
    cuLimit: number; // 僅展示與寫入 CB ix；不做 lamports 加減
    cuPrice: number; // 同上；來自 settings.defaultCuPrice
    signatureLamports: string;
    priorityLamports: string;
    totalLamports: string;
    accounts: Array<{ tokenAccount: string; symbol: string; rentLamports: string }>;
  }>;
}
```

失敗：`INVALID_PAYLOAD`（空陣列、地址不在上次 list 結果、重複）、`NO_ACCOUNT`、`ACCOUNT_READ_ONLY`、`CU_ESTIMATE_FAILED`。**鎖定仍允許**（不回 `WALLET_LOCKED`）。

SW 在 `planId` 下存：每筆 **未簽** wire bytes（已寫入 CU limit／price）、`lastValidBlockHeight`、token account 列表、費用快照、`ownerAccountId`→signer。不寫 storage。

估 CU：對每筆未簽 message 呼叫 Kit **`estimateResourceLimitsFactory`**（或 `@solana/kit-plugin-rpc` 同等），取回 `computeUnitLimit`（已含套件緩衝、封頂 1_400_000）。再 `@solana-program/compute-budget` 寫入 `SetComputeUnitLimit` 與 `SetComputeUnitPrice`（price＝`settings.defaultCuPrice`）。任一筆估算失敗 → 整個 `planCloseEmpty` `ok: false`，`error.code` `CU_ESTIMATE_FAILED`。

優先費加總用 0.11 公式：`ceil(cuLimit * cuPrice / 1_000_000)`，且結果 `> 0` 且 `< 1` 時取 `1` lamport。用 `BigInt` 實作後再轉字串回傳。

### `wallet.commitCloseEmpty`

payload：

```ts
{
  planId: string;
}
```

流程：

1. 未解鎖 → `WALLET_LOCKED`
2. 找不到 `planId` 或 TTL 過期 → `INVALID_PAYLOAD`
3. **Stale 檢查**（見下）→ `STALE_LIST`
4. 依 `plan` 內每筆 tx 用對應 `ownerAccountId` 的 signer **順序簽完**（不穿插 RPC）
5. `parallelInstructionPlan` 不適用（已是 tx 層）；對已簽 tx 建 **parallel** transaction plan，用 `rpcTransactionPlanExecutor`：`estimateResourceLimits: false`、`skipPreflight: false`，**不傳** `maxConcurrency`
6. `passthroughFailedTransactionPlanExecution(executor(plan))`
7. 走結果樹，對每 leaf 分類：successful → 已確認；failed → 鏈上失敗或已過期（依 err／blockhash）；canceled → 已過期
8. 回傳結果摘要；刪除 `planId` 狀態

整段 1–8 在 **同一個** `commitCloseEmpty` handler 內 `await` 完成後才 `return` 給 popup。禁止 fire-and-forget 後立刻回 `{ accepted: true }`。

未解鎖 → `WALLET_LOCKED`（僅此命令）。

成功 body：

```ts
{
  confirmedCount: number;
  failedCount: number;
  expiredCount: number;
  reclaimedLamports: string; // 僅成功關閉的 rent 加總
  signatures?: string[]; // 可選，成功筆的 sig
}
```

## Stale 檢查（`STALE_LIST`）

在簽名前，對 plan 內每個 token account 再 `getAccount`（或 parsed token account）：

- 帳戶不存在
- amount ≠ 0
- owner ≠ plan 記錄
- Token-2022 新出現 extension 或凍結

任一成立 → `STALE_LIST`，不簽、不送。

另：以**當下** `defaultCuPrice` 與同一批帳戶重跑 `planCloseEmpty` 的費用加總（可只重算費用、不必重建整 plan UI）。若 `fee.totalLamports` 與記憶體 plan 快照字串不同 → `STALE_LIST`（使用者改過 Settings 或鏈上狀態變了）。

## 掃描

對「目前作用中帳戶」解析出一組 `{ ownerAccountId, ownerPubkey, canSign }`：

- `signing`：一組
- `combined`：subs 裡 `kind === "signing"` 的成員
- `read-only` 或無可簽成員：list 命令 `ACCOUNT_READ_ONLY` 或空 entries（入口不畫）

每個 owner 並行或串行（實作自決）：

- `getParsedTokenAccountsByOwner` legacy Token 與 Token-2022（與 home-tokens 相同 RPC）
- 濾：`parsed.info.tokenAmount.amount === "0"`（字串比較）
- legacy：未 frozen
- Token-2022：`extensions` 陣列為空或不存在；未 frozen（依 parsed）
- owner 必須等於掃描的 owner 公鑰
- close authority：若 parsed 有 `closeAuthority` 且不等於 owner，丟棄

`rentLamports`＝該 token account 的 lamports（`getAccount` 或 parsed 同值）。

掃描結果可快取在 SW 記憶體 60s，key＝`activeAccountId + cluster + rpcUrl`；`list` 可帶 `force` 未必要（重新整理持倉時 popup 可順便 force list）。

## 組 Close 交易

每筆交易：

- fee payer＝owner（可簽成員）
- ix：多個 `getCloseAccountInstruction`（`@solana-program/token` 或 `token-2022`），`account`＝token account，`destination`＝owner，`owner`＝owner signer
- 同一筆內僅同一 `tokenProgram`、同一 owner
- `getLatestBlockhash`（`confirmed`）每筆一個 blockhash（可共用同一輪查詢結果）

## 打包（shared 純函式）

輸入：有序或無序的 `{ tokenAccount, owner, tokenProgram, serializedIxSize? }`；實作用「先組 message 試塞」或保守常數：

- 對每個 (owner, program) 分組
- 貪婪塞入 Close ix，直到再塞會超 **1232** bytes serialized tx（含簽名槽、雙 CB ix 後的 message）；超過開新筆
- 輸出 `txGroups: string[][]`（每組 token account 地址）

popup 的 `m` 與 SW `planCloseEmpty` 必須呼叫此函式。

## Popup 畫面

| view | 說明 |
|------|------|
| `home-token` | 標題列回收＋刷新；點回收 → `close-empty-pick` |
| `close-empty-pick` | 勾選；殼底「下一步」→ 呼叫 `planCloseEmpty` → `close-empty-confirm` |
| `close-empty-confirm` | 費用與分組；「確認」→ `commitCloseEmpty` → `close-empty-sending` |
| `close-empty-sending` | 確認中 spinner（design-principles 送出狀態，文案「確認中」「等待這一波結束」） |
| `close-empty-result` | 三數＋「完成」→ `home-token` 並 `list`+`getHomeTokens` |

離開 pick／confirm（Back 除外規則見 INDEX）清 state。`planId` 在 commit 成功或失敗結束後丟棄。

## Kit 依賴

- 新增 `@solana/kit-plugin-rpc`（與 `@solana/kit` ^8.4 相容之版；以 npm 解析為準）
- 使用 `createSolanaRpc`／`createSolanaRpcSubscriptions`（wss 由 `rpcUrl` 推導），`rpcTransactionPlanExecutor`
- 禁止 `createClient().sendTransactions` 高階路徑當唯一實作（須能設定 `estimateResourceLimits: false`）

## 錯誤碼補充

| code | 時機 |
|------|------|
| `CU_ESTIMATE_FAILED` | `planCloseEmpty` 任一笔估 CU 失敗 |
| `RPC_ERROR` | 掃描全失敗 |
| `STALE_LIST` | commit 前重讀不符 |
