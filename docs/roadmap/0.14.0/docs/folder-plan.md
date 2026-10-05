# 0.14.0 — 目錄計畫

產品語意以 [INDEX](../INDEX.md) 為準。本檔只寫 **檔案搬到哪、命令拆到哪、什麼不准動**。

## 整檔搬家（保留檔名）

### `wallet/src/background/`

| 現路徑 | 新路徑 |
|--------|--------|
| `ext-respond.ts` | `messaging/ext-respond.ts` |
| `origin-notify.ts` | `messaging/origin-notify.ts` |
| `open-popout.ts` | `messaging/open-popout.ts` |
| `session.ts` | `session/session.ts` |
| `vault-persist.ts` | `session/vault-persist.ts` |
| `vault-write-queue.ts` | `session/vault-write-queue.ts` |
| `sign-gates.ts` | `session/sign-gates.ts` |
| `account-ids.ts` | `session/account-ids.ts` |
| `active-account.ts` | `session/active-account.ts` |
| `storage-io.ts` | `storage/storage-io.ts` |
| `pending.ts` | `pending/pending.ts` |
| `pending-timeout.ts` | `pending/pending-timeout.ts` |
| `finish-pending.ts` | `pending/finish-pending.ts` |
| `sign-tx-pending-state.ts` | `pending/sign-tx-pending-state.ts` |
| `simulate-pending-tx.ts` | `simulate/simulate-pending-tx.ts` |
| `sign-tx-simulate.ts` | `simulate/sign-tx-simulate.ts` |
| `compute-budget-tx.ts` | `simulate/compute-budget-tx.ts` |
| `wallet-begin-send.ts` | `send/wallet-begin-send.ts` |
| `wallet-finish-send.ts` | `send/wallet-finish-send.ts` |
| `wallet-send-abort.ts` | `send/wallet-send-abort.ts` |
| `wallet-send-state.ts` | `send/wallet-send-state.ts` |
| `wallet-send-broadcast.ts` | `send/wallet-send-broadcast.ts` |
| `home-tokens-service.ts` | `home-tokens/home-tokens-service.ts` |
| `dapp-handlers.ts` | `handlers/dapp-handlers.ts` |
| `ui-handlers.ts` | `handlers/ui-handlers.ts` |
| `wallet-handlers.ts` | Track 1：`handlers/wallet-handlers.ts`。Track 2：**刪除**並改為下表 |

`background/index.ts` 留在原位。

每個子資料夾新增 `index.ts`，re-export 該資料夾現有對外函式（今日被其他 background 檔 import 的那些）。不要 re-export 僅供同檔使用的函式，除非移檔後跨檔需要。

### `wallet/src/popup/`

| 現路徑 | 新路徑 |
|--------|--------|
| `tokens-ui.ts`、`home-tokens.ts` | `home/` |
| `send-flow.ts`、`approval-host.ts` | `send/` |
| `accounts-ui.ts`、`combined-ui.ts` | `accounts/` |
| `settings-ui.ts` | `settings/` |
| `import-seed-flow.ts`、`generate-seed-flow.ts`、`import-secret.ts` | `onboarding/` |
| `password-input.ts`、`dom.ts`、`format.ts`、`icons.ts`、`session.ts` | `lib/` |

留在 `popup/` 根目錄：`main.ts`、`types.ts`、`index.html`、`style.css`。

上列每個子資料夾一個 `index.ts`。`index.ts` 必須 re-export **任何其他 popup 資料夾今日會 import 的符號**，不能只抄 `main.ts` 的 import 清單。至少包含：

| 符號 | 定義搬到 | 跨資料夾使用者 |
|------|----------|----------------|
| `SVG_PLUS`、`SVG_TRASH`、`SVG_CHECK`、`SVG_EYE`、`SVG_COPY` | `lib/icons.ts` | accounts、settings、onboarding |
| `navigateTo`、`syncShellDock`、`refresh`、`clearError`、`showError`、`applyViewChrome` | `lib/session.ts` | 各畫面檔 |
| `hardenApiKeyInput` | `lib/password-input.ts` | settings |
| `avatarLetter` | `lib/format.ts` | accounts |
| `NATIVE_SOL_ID`、型別 `HomeTokenRow` | `home/home-tokens.ts` | send（值）；tokens-ui（值） |
| `findTokenRowById` | `send/send-flow.ts` | home／tokens-ui |
| `refreshHomeAssets` | `home/tokens-ui.ts` | send／approval-host |

`main.ts` 今日已 import 的函式也要從對應 `index.ts` 匯出。不要為了湊 export 改 `navigateTo` 或 `render`。`types.ts` 仍由各畫面直接 import（`../types` 或同等相對路徑），不必再包一層。

`home/` 與 `send/` 今日已有值引用循環（`tokens-ui` ↔ `send-flow`，以及 `approval-host` → `tokens-ui`、`send-flow` → `home-tokens`）。准許經對方 `index.ts` 互引。禁止為了解這個循環去改導航。若 barrel 初始化在 typecheck 之外的執行期爆掉，維持檔案路徑，改由 `main.ts` 傳回呼，行為仍須與搬家前相同。

## Track 2 命令分組

`handlers/wallet-dispatch.ts` 的 `handleWalletCommand` 只做 `req.command` 分支並 return 對應函式結果。業務步驟放下列檔。函式可叫 `handleX`，但 **command 字串必須與下表完全一致**。

| 檔 | `req.command` |
|----|----------------|
| `wallet/session-commands.ts` | `wallet.getState`、`wallet.lock`、`wallet.unlock`、`wallet.changeVaultPassword`、`wallet.createVault` |
| `wallet/account-commands.ts` | `wallet.generateSeedAccount`、`wallet.generateAccount`、`wallet.importAccount`、`wallet.previewSeedAccounts`、`wallet.importSeedAccount`、`wallet.setActiveAccount`、`wallet.renameAccount`、`wallet.exportAccountSecret`、`wallet.addReadOnlyAccount`、`wallet.deleteAccount` |
| `wallet/combined-commands.ts` | `wallet.createCombinedAccount`、`wallet.addCombinedSub`、`wallet.removeCombinedSub`、`wallet.setCombinedMain` |
| `wallet/connection-commands.ts` | `wallet.disconnectOrigin`、`wallet.disconnectAllOrigins` |
| `wallet/send-command.ts` | `wallet.beginSend`（組交易仍呼叫 `send/wallet-begin-send.ts` 既有 export，不把組交易正文再搬一次） |
| `wallet/settings-command.ts` | `storage.patchSettings` |
| `home-tokens/get-home-tokens-command.ts` | `wallet.getHomeTokens` |

未知 command 的回應維持拆分前同一種錯誤形狀（讀現有 `wallet-handlers.ts` 檔尾，原樣留在 dispatch）。

`background/wallet/index.ts` re-export 上述 handle 函式，供 dispatch import。`home-tokens/index.ts` 同時 re-export 服務函式與 get 命令。

## Track 4 審批抽出

從 `approval/shell.ts` 抽出時，只搬 **不讀** 該檔模組級 `let`（DOM 參照、`shellConfig`、`requestId`、`shellDomBound` 等）的函式。

下列判定已對過現碼，Track 4 **照表做**，不要再改函式簽名來湊「能搬」：

| 函式 | 決定 |
|------|------|
| 純字串／位元組（lamport 顯示、短公鑰、hex、UTF-8 可否顯示、短簽名、avatar 字母、origin 顯示等今日已是純函式者） | 搬到 `approval/format.ts` |
| `renderSimulationNotice` | 只吃 `sim`。搬到 `approval/cards/simulation-notice.ts` |
| `renderDeltaCard` | 讀 `simulating`／`cuDirty`／`txCuEditable` 並呼叫 `runSimulation`。**留在** `shell.ts` |
| `renderFeeCard` | 讀寫 CU 草稿、`feeDetailsOpen`、`lastSim`、`requestId`。**留在** `shell.ts` |
| `renderTxDetails` | 讀模組級 `txRawHex`。**留在** `shell.ts` |
| `approval/cards/index.ts` | 只 re-export 實際抽出的卡片（本版即 simulation notice）。沒抽出的不建空檔 |

`approval/shell.ts` 留在 `approval/shell.ts`（不進子資料夾）。popup／popout 繼續 `import { mountApprovalShell, disposeApprovalShell } from "../approval/shell"`（路徑深度依檔案位置維持能編過即可，**函式名不變**）。

抽出後若某卡片檔沒有模組級狀態，不要加空的 reset。若有，`disposeApprovalShell` 必須呼叫它，且第二次 `mountApprovalShell` 不得看到上一次的 DOM 或旗標。

## 依賴方向（background）

```text
handlers → wallet、home-tokens、以及下層 index
wallet → session、storage、pending、send、messaging、home-tokens 的 index
home-tokens 服務 → storage、session 等下層，不可 import handlers 或 wallet
send、simulate、pending、session、messaging、storage → 只可互相經 index，不可 import handlers 或 wallet
background/index.ts → handlers 的 index（以及今日已直接用到的下層），不可堆業務
```

Popup 子資料夾可 import `popup/types.ts`、`popup/lib` 的 index、`shared`、`approval/shell`。畫面資料夾之間的既有呼叫改 import 對方 `index.ts`。`home` 與 `send` 的循環見上一節。**禁止**為了解循環去改導航行為。

`pending/` 與 `send/` 今日已互相值引用（`pending-timeout` ↔ 送出狀態，送出結束／中止 ↔ `pending`）。搬家後經雙方 `index.ts` 互引，**維持這條路徑**。禁止把這段邏輯搬回 `background/index.ts`。若 typecheck 通過但執行期 barrel 未初始化，才把共用葉改為同層檔案直連，仍不得改行為。

## 明確不做

- 不改 `shared/` 檔名與位置
- 不拆 `style.css`、不改 HTML
- 不把 `home-tokens-service.ts` 再切成多個業務檔（`get-home-tokens-command.ts` 只是命令包裝）
- 不上框架
