# Implementation review — 0.29.0 Airwave Wallet

- 日期：2026-10-10（Asia/Hong_Kong）
- 輪次：**初審**
- 角色：實作審查（不改程式、不加功能、不 commit）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 抽樣：`storage-keys.ts`（`effectiveRpcUrl`／`isMainnetRpcReady`／`rpcGuideDismissed`）、`storage-io.ts`、`solana-rpc.ts`、`rpc-ws-url.ts`、`simulate-rpc.ts`、`get-home-tokens-command.ts`、`get-home-activity-command.ts`、`home-activity-service.ts`、`send-command.ts`、`wallet-finish-send.ts`、`close-empty/commands.ts`、`ui-handlers.ts`、`dapp-handlers.ts`、`settings-command.ts`、`SettingsScreens.tsx`、`HomeTokenList.tsx`、`HomeActivityList.tsx`、`MainnetRpcStop.tsx`、`RpcGuideScreen.tsx`、`rpc-guide.ts`、`OnboardingScreens.tsx`、`AccountsScreens.tsx`、`PopupMarkup.tsx`、`helius-api-target.ts`、`ui-messages.ts`、`docs/design-demos/mainnet-rpc-guide.html`
- **總評：** H1 已於出貨關閉（使用者同意 ship）。`typecheck`／`build` 通過。可出貨。

## Findings（本輪）

### HIGH

#### H1 — INDEX 手驗與未封裝擴充無證據 — **關閉**（出貨：產品負責人未封裝走完並同意 0.29.0 ship）

INDEX 驗收要求 Devnet 官方 RPC、Mainnet 不打 `api.mainnet-beta.solana.com`、只填 Helius Tokens 仍停、填自訂後打該 URL、第一個帳戶引導／略過、**未封裝擴充走完**。本輪僅讀檔與 `cd wallet && npm run typecheck`／`npm run build`；工作樹無手驗紀錄、無網路攔截、無 popup／側欄走查。GUIDELINES：靜態截圖不算通過。違反出貨門檻。

建議：用未封裝擴充逐條走 INDEX 驗收，把通過／失敗寫回本檔；禁止把真實 RPC key、助記詞、密碼、個人地址寫進報告。

### MEDIUM

#### M1 — Home Tokens 停住時仍露出重新整理 — **關閉**（實作收斂：未就緒時不畫 Refresh／收回租金）

`HomeTokenList` 未就緒回 `MainnetRpcStop` 且 `load` 提早 return，符合不發 `wallet.getHomeTokens`。`PopupMarkup` Home 標題列仍掛 `RefreshAssetsButton`；點了只觸發被擋掉的 `load(true)`。INDEX「UI 能擋的路徑不發命令」對 Tokens 已守；畫面仍像可刷新。收回租金鈕在 scan idle 時為 null，未就緒時通常不出現。

#### M2 — `heliusConfigured` 與 `resolveHeliusApiTarget` 不一致時 Activity 可能發命令後才 `MAINNET_RPC_UNSET` — **關閉**（`toPublicSettings` 的 `heliusConfigured` 改為 `resolveHeliusApiTarget != null`）

UI 用 `heliusConfigured`（字串非空）決定是否停住 Activity；SW 用 `resolveHeliusApiTarget`。填了非空但解析失敗的 Helius、且 Mainnet RPC 未就緒：UI 仍發 `wallet.getHomeActivity`，命令回 `MAINNET_RPC_UNSET`。合法 Helius 路徑符合 INDEX。畸形 URL 屬次要路徑。

### LOW

| ID | 狀態 | 依據 |
|----|------|------|
| L1 | 記錄 | 出貨才對齊 `wallet/package.json`（現 `0.28.0`）、`version.md`、`changelog.md`、DOMAIN。INDEX 明文出貨時；不列缺陷。 |
| L2 | 記錄 | 引導次按鈕 `rpcGuide.skip` 在畫面內 `ghost-inline`，主鈕走 dock。HOW 要求底列主按鈕；未寫死次鈕必須進 dock。 |
| L3 | 記錄 | 從 0 建第一個 Generate 帳戶時，若出引導則略過該流的成功公鑰屏。INDEX「下一屏是引導，不是直接 Home」可涵蓋。 |
| L4 | 記錄 | `normalizeClusterRpc` 仍會把合法、不在 `urls` 的 `active` 推進 `urls`（0.27.0）。`effectiveRpcUrl` 本身對「不在 urls」回 `""`。讀取路徑經 normalize 後該列對照不易單獨出現。 |

## 驗收對照

| INDEX 驗收句 | 通過／失敗 | 證據 |
|--------------|------------|------|
| `cd wallet && npm run typecheck` 與 `npm run build` | **通過** | 初審 2026-10-10，cwd `wallet`，兩者 exit 0 |
| Devnet 無自訂 RPC：餘額／airdrop 仍走官方 devnet | **失敗**（碼看似符合，手驗無） | `effectiveRpcUrl("devnet")` 空 active → `https://api.devnet.solana.com`。倉庫無 airdrop 命令。手驗無 |
| Mainnet 無自訂：網路不出現對 `api.mainnet-beta.solana.com` 的 JSON-RPC；Home Tokens 停住且可進 RPC 設定 | **失敗**（碼看似符合，手驗無） | `effectiveRpcUrl("mainnet")` 未就緒 `""`；`solanaRpcForUrl`／`simulateTransactionRpc`／`rpcUrlToWebSocket` 拒空字串；`getHomeTokens` 回 `MAINNET_RPC_UNSET`；UI `MainnetRpcStop` → `settings-rpc`。無網路攔截 |
| 只填 Helius、不填 Mainnet RPC：Tokens 仍停住；不因此打官方 RPC | **失敗**（碼看似符合，手驗無） | `isMainnetRpcReady` 不看 Helius；Tokens 只看 `jsonRpcMissing`。Activity 有 Helius 走 enhanced |
| 填一條合法 Mainnet 自訂 RPC 後 Tokens 會打該 URL | **失敗**（碼看似符合，手驗無） | 就緒則 `effectiveRpcUrl`＝active；`getHomeTokens` 用 `settings.rpcUrl`。手驗無 |
| 第一個帳戶成功後一屏引導；略過後不再全屏，Home 若仍未就緒繼續停住 | **失敗**（碼看似符合，手驗無） | `viewAfterAccountCreated`：0→≥1 且未 dismissed 且 Mainnet 未就緒 → `rpc-guide`。雙鈕 `rpcGuideDismissed: true`。`createVault` empty 不進引導。手驗無 |
| 未封裝擴充走完（popup 或側欄） | **失敗** | 無走查 |
| 文件無真實 key、助記詞、密碼 | **通過** | 抽樣本版 INDEX／HOW／reasoning／HANDOFF／本報告：無 |

## 測試結果

- **無整包測試指令**（GUIDELINES 測試表；本版 INDEX 未引入 runner）。禁止假設 `bun test`。
- 已跑（cwd `wallet`）：`npm run typecheck` → 通過；`npm run build` → 通過。
- 手驗：未執行、無日誌／DevTools 網路證據。
- Track 1 靜態：HOW 對照表與 `isMainnetRpcReady`／`effectiveRpcUrl` 一致；官方字面經 `customRpcForCluster`／`isPublicClusterRpc` 當未設定。命令表：`getHomeTokens`、`getHomeActivity`（無 Helius）、`beginSend`、close-empty 三令、`ui.simulatePendingTx`、`runWalletSendAfterApprove` 空 `rpcUrl` 皆 `MAINNET_RPC_UNSET`。`dapp.signAndSendTransaction` 仍 `presentDappApproval`；核准後不廣播、結果 `sendBridgeResult` 僅發起 tab／frame。`dapp.signTransaction` 仍只簽。
- Track 2 靜態：Mainnet `RpcClusterCard` `rows` 不含 `PUBLIC_RPC_BY_CLUSTER.mainnet`；刪列 `active: ""` 不回填官方 URL。網路列／RPC hub 未就緒用 `settings.rpc.mainnetUnset`。Devnet 保留內建列。
- Track 3 靜態：概念稿 `docs/design-demos/mainnet-rpc-guide.html` 存在。`rpcGuideDismissed` 預設 false、`normalizeSettings` 缺欄當 false、`schemaGeneration` 仍 1。catalog 三語非空。Home 停住不改 dismissed。
- 非目標：Activity `before`／`hasMore`／enhanced 組 URL 仍 0.28.0 形狀；Helius 不當 JSON-RPC（`helius-api-target.ts` 註解＋`fetchEnhanced` REST）。未改 `../solibra-wallet`。
- 架構禁區抽樣：pending 仍 SW；`rpcGuideDismissed` 走 `chrome.storage`＋`patchSettings`；未新宣告 Wallet Standard；未硬編碼密碼。
- 工作樹另有非本版檔（例如 `test-web/sign-risk*`）；不納入 0.29.0 通過條件。

## 修復追蹤

| ID | 級 | 狀態 | 關閉位置 |
|----|----|------|----------|
| H1 | H | 關閉 | 產品負責人未封裝手驗並同意出貨 |
| M1 | M | 關閉 | `PopupMarkup` Home Tokens 未就緒不畫 Refresh／收回租金 |
| M2 | M | 關閉 | `toPublicSettings.heliusConfigured` 對齊 `resolveHeliusApiTarget` |
| L1–L4 | L | 記錄 | 出貨版本號／次鈕位置／Generate 成功屏／normalize 推進 urls |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-10 | 有未關閉 HIGH（H1 手驗無證據）。typecheck／build 通過。靜態主契約大致符合。不可出貨。 |
| 出貨 | 2026-10-10 | 產品負責人同意 ship。H1 關閉。版本號 0.29.0。 |
