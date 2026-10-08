# HOW — 0.24.0

行為與 0.23.0 相同。本檔只定路徑、保留的 export 名、以及要寫進 `AGENTS.md` 的註解規則。

## 永久規則

實作 Track 1 時，把本節放進 `AGENTS.md`「工作習慣」之後，標題為「原始檔職責註解」。可以改成 `AGENTS.md` 的條列格式，不可以改門檻數字或適用範圍。不要把「0.24.0 只拆哪些檔」抄進去。

`wallet/src` 底下的 `.ts`：

- **少於 50 行**（以檔案總行數計，含空行）：可以不寫檔首註解。
- **50 行以上**：檔案最頂必須有英文區塊註解（職責說明），最多 **100 words**。
- 之後改到一個已達 50 行、卻還沒有註解的 `.ts`（含只改 import），同一輪必須補上。
- 平常一兩句，寫這個檔負責什麼，以及它不做的相鄰那一步。
- 註解需要描述第二件不同的事時，分檔，不要把註解寫長。
- 禁止用 `related logic`、`etc.`、`and so on` 帶過第二個職責。
- `index.ts` 寫它 re-export 這個資料夾的對外介面（可以含多個子資料夾）。
- 純資料表只寫這是哪一張表。
- 同一輪改動若碰到超過 400 行的 `.ts`、`.tsx` 或 `.css`，必須 review 要不要拆。
- `background/wallet/` 的命令檔：低於 150 行維持一個檔；達到或超過 150 行放進該組資料夾，裡頭把會一起改的函式放在同一個模組。150 行不遞迴。資料夾內模組可以超過 150 行，只要註解仍是一件事且檔案不超過 400 行。禁止把同一職責切成一命令一檔。一個職責只有一個 `handle*` 時，該檔可以只有這一個命令。

## 本版範圍

0.24.0 只拆本 HOW 點名的檔。這句留在本版契約，不寫進 `AGENTS.md`。

註解範例（約 25 words，不是要貼進產品碼的固定句子）：

```ts
/**
 * Groups closable token accounts into unsigned transactions and stores the plan
 * in memory. Does not sign or broadcast.
 */
```

## 命令樹

`wallet/src/background/wallet/index.ts` 仍 export 下表每一個函式，名字不變。`wallet-dispatch.ts` 不改命令字串。

新增 `commands/index.ts`，re-export 下面三個單檔以及 `account/`、`combined/`、`session/` 的 `index.ts`。`wallet/index.ts` 只從 `./commands` re-export。

低於 150 行、整檔搬進 `commands/`，不拆：

| 新路徑 | 函式 |
|--------|------|
| `commands/connection-commands.ts` | `handleDisconnectOrigin`、`handleDisconnectAllOrigins` |
| `commands/send-command.ts` | `handleBeginSend` |
| `commands/settings-command.ts` | `handlePatchSettings` |

`commands/account/`（刪除 `wallet/account-commands.ts`）：

| 檔 | 放哪些函式 | 職責一句 |
|----|------------|----------|
| `index.ts` | re-export 下面三檔的 `handle*`。不 export `invalidLabel` | 帳戶命令資料夾的對外介面 |
| `invalid-label.ts` | 現有 `invalidLabel`。同資料夾的命令檔可 import。錯誤碼 `INVALID_LABEL` 與現有 message 字串不變 | 帳戶命令的標籤錯誤回應。不建立帳戶 |
| `seed-accounts.ts` | `handleGenerateSeedAccount`、`handlePreviewSeedAccounts`、`handleImportSeedAccount` | 助記詞帳戶的產生、預覽、匯入。不含密鑰字串匯入 |
| `secret-key-accounts.ts` | `handleGenerateAccount`、`handleImportAccount`、`handleExportAccountSecret`，以及只被它們用的 `loadedFromSecretRaw` | 本地簽名密鑰的產生、匯入、匯出。不含助記詞 |
| `account-records.ts` | `handleSetActiveAccount`、`handleRenameAccount`、`handleDeleteAccount`、`handleAddReadOnlyAccount` | 帳戶紀錄的切換、改名、刪除、新增觀察帳戶。不產生密鑰 |

`commands/combined/`（刪除 `wallet/combined-commands.ts`）：

| 檔 | 放哪些函式 | 職責一句 |
|----|------------|----------|
| `index.ts` | re-export 下面兩檔 | 聚合命令資料夾的對外介面 |
| `create-combined.ts` | `handleCreateCombinedAccount` | 建立聚合帳戶。不增刪既有聚合的成員 |
| `combined-members.ts` | `handleAddCombinedSub`、`handleRemoveCombinedSub`、`handleSetCombinedMain` | 既有聚合的成員與主地址。不建立新聚合 |

`commands/session/`（刪除 `wallet/session-commands.ts`）：

| 檔 | 放哪些函式 | 職責一句 |
|----|------------|----------|
| `index.ts` | re-export 下面兩檔 | session 命令資料夾的對外介面 |
| `session-state.ts` | `handleGetState`、`handleLock` | 讀解鎖狀態與鎖定。不解密 vault、不建立金庫 |
| `vault-password.ts` | `handleUnlock`、`handleCreateVault`、`handleChangeVaultPassword` | 用密碼解密、建立或更換 vault。不組交易 |

`commands/session/` 是命令檔，不是 `background/session/`。密碼與解鎖金鑰仍只呼叫既有 `background/session` 的公開函式（經該資料夾 `index.ts`）。禁止把 vault 明文狀態搬進命令檔。

舊檔刪除後不留同名 re-export shim。

## 模擬

公開名字必須仍從 `wallet/src/background/simulate/index.ts` export：

- `SimDeadline`
- `buildInspectorUrl`
- `simulateTransactionRpc`
- `Phase2SimContext`
- `runPhase2Simulation`
- 以及本版開始前 `index.ts` 已從 `sign-tx-simulate.ts`、`compute-budget-tx.ts` export 的名字

刪除 `simulate-pending-tx.ts`。新檔與現有模擬檔同一層：

| 檔 | 內容 |
|----|------|
| `sim-deadline.ts` | `SimDeadline`。超時預算。不打 RPC、不算差額 |
| `tx-base64.ts` | `bytesToBase64` 的唯一實作。把位元組編成 base64。不組 URL、不打 RPC |
| `inspector-url.ts` | `buildInspectorUrl`。組 Explorer Inspector URL，base64 呼叫 `tx-base64.ts`。不模擬 |
| `resolve-account-keys.ts` | v0 帳戶金鑰展開與 address lookup table 解析，含現檔的 `expandV0AccountKeys`、`resolveAccountKeysFromTables`、`keysFromLoaded`、`v0LookupCount`。不打 `simulateTransaction`、不算餘額差額、不組指令列表 |
| `simulate-rpc.ts` | `simulateTransactionRpc`。對 RPC 做 `simulateTransaction`，請求體的 base64 呼叫 `tx-base64.ts`。不算 phase 2 餘額差額、不組指令列表 |
| `phase2-deltas.ts` | `runPhase2Simulation`、`Phase2SimContext`、餘額差額，以及只被這條路徑使用的 `buildInstructions`、`PROGRAM_NAMES`、`programLabel`、`ixAccounts`、`bytesToHex`、`shortPk`。不改交易位元組上的 CU、不打第一輪 `simulateTransaction` |

`sign-tx-simulate.ts` 改 import 到上述同層檔，不從 `./index` 再轉一圈。不改它的 phase 1／phase 2 步驟。這個檔本版只改 import，仍要補檔首註解。

其餘只被一個新檔使用的私有函式跟那個檔走。`decode-compiled-ix.ts` 與 `compute-budget-tx.ts` 不拆、不改職責。

## 收回租金

刪除 `close-empty-service.ts`。`commands.ts` 改為 import 新檔，三個 `handle*` 的名字與命令字串不變。`close-empty/index.ts` 仍只 export 這三個 handle。

| 檔 | 內容 |
|----|------|
| `list-closable.ts` | `listClosableTokenAccounts`、`getLastListClosableEntries`。掃描可關帳戶並記住這次清單。對 `home-tokens` 只 import `../home-tokens`（`getHomeTokensForOwners`、`homeTokensCacheFingerprint`、`getOwnerParsedTokenAccounts`）。不組交易、不送出 |
| `plan-close-empty.ts` | `planCloseEmpty`。只經 `getLastListClosableEntries` 取本次清單；選中帳戶不在這份清單仍回 `INVALID_PAYLOAD`。不讀 `closable-cache` 代替這份清單。把選中的帳戶組成未簽交易、估算費用、寫入記憶體 plan。不簽名、不廣播 |
| `commit-close-empty.ts` | `commitCloseEmpty`，以及現況只被它使用的 `feeTotalForPlan`、`assertPlanNotStale`、`classifyPlanResult`、`flattenResults`。依 planId 簽名並送出，分類已確認／鏈上失敗／已過期。不重新掃描清單 |

`getLastListClosableEntries` 不加入 `close-empty/index.ts`。`home-tokens/index.ts` 補上 `getOwnerParsedTokenAccounts` 的 re-export，不改該函式本體。`closable-enrich.ts` 本版不改，既有深層 import 留到下次碰到該檔。

兩步以上才共用的私有函式放進**已經存在**且職責相符的檔：`plan-store.ts`、`closable-cache.ts`、`build-close-txs.ts`、`closable-scan.ts`。禁止新建 `close-empty-service.ts` 的替代巨檔。計畫本體仍只在 `plan-store` 的記憶體，不進 `chrome.storage`。
