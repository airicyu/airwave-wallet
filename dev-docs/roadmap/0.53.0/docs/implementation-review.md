# Implementation review — 0.53.0

Reviewed at: working tree (uncommitted; mixed with unrelated unversioned edits — see Scope)
Tracks: 1 and 2

- Date: 2026-10-31
- Round: **1**. Later rounds append; keep stable IDs.
- Role: Implementation review. No code changes, no commits.
- Baseline: [`../INDEX.md`](../INDEX.md) (Decided + Acceptance); [`how.md`](./how.md); [`reasoning.md`](./reasoning.md); architecture bans in [`../../GUIDELINES.md`](../../GUIDELINES.md).
- Scope: Devnet strip on sign-transaction approvals; `ui.probeSignBlockhash`; mismatch card and Approve gating; `mainnetBlockhashRpcUrl` + Debug row; test-web cluster-mismatch sample. Other diff hunks (settings CSS split, home-tokens moves, etc.) are not scored as 0.53.0 unless they break the above.

## Round 1 (2026-10-31)

**Summary:** Track 1 and Track 2 logic align with INDEX on probe semantics, one-shot memory, Approve gating, strip placement, command wiring, settings field, i18n keys, and test-web sample. `cd wallet && npm run typecheck` exit 0. No open **HIGH**. Popup/sidebar lack gold mismatch-card CSS (popout only). INDEX hand-tests were not run in this session (no loaded extension). Shipment still needs human hand verification.

### Match to how.md

| Area | Result |
|------|--------|
| Strip under account row, outside scroll; literal `Devnet`; hidden on Mainnet | Done (`ApprovalSign.tsx`, `setSignClusterStrip`, `flow.ts`) |
| Popout `.cluster-strip` + `:root` `--warn` / `--warn-bg` | Done (`popout/styles/chrome.css`, `popout/styles/base.css`) |
| Hide strip in `send-status-mode` | Done (`approval-shared.css`, `popout/styles/send-status.css`) |
| `ui.probeSignBlockhash` + SW handler | Done (`commands.ts`, `ui-handlers.ts`, `probe-sign-blockhash.ts`) |
| Decode from `payload.transaction` only; undecodable → both `unknown` | Done (`recentBlockhashFromWireTx`; see IR-053-2 for empty array) |
| Parallel `isBlockhashValid`, 8s timeout, `result.value` boolean | Done |
| Mainnet URL: ready custom RPC, else fallback via `mainnetBlockhashProbeUrl` | Done |
| Sign-shell one-shot probe; memory only; repaint card on body rebuild | Done (`blockhash-probe.ts`, `sign-tx.ts`) |
| Mismatch definition + catalog copy | Done |
| Debug `Mainnet blockhash RPC` row (debug on only) | Done (`DebugSettingsScreen.tsx`) |
| test-web omit-`chain` other-cluster blockhash action | Done (`main.ts`, `index.html`) |

### Findings

| ID | Sev | Status | Notes |
|----|-----|--------|-------|
| IR-053-1 | MEDIUM | Closed | Popup and side panel import `popout/style.css` (includes `sign.css`). `approval-shared.css` also defines `.cluster-mismatch-card` for the same gold warning on in-popup approval. |
| IR-053-2 | LOW | Closed | Empty `transaction` array returns both `unknown`, not `NOT_FOUND`. |
| IR-053-3 | MEDIUM | Open (ship gate) | INDEX acceptance rows that need a loaded extension (strip on three flows, mismatch sample, Apply CU / resimulate behavior, Debug URL behavior) were not executed in this review environment. Static/code trace supports them; not marked pass until hand-tested. |

**Open HIGH:** none.

### Architecture (GUIDELINES §4)

| Check | Result |
|-------|--------|
| Pending read in SW; UI uses commands | Pass |
| Probe result not in `chrome.storage`, Zustand, or pending record | Pass (`session` + `blockhash-probe.ts`) |
| Typed command + `requestId`; reply to caller | Pass |
| No vault / sign path changes for this feature | Pass |
| Official Mainnet fetch only for this probe helper | Pass (grep: URL confined to `vendor-api-url.ts` + probe handler) |
| No new npm dependencies for 0.53.0 surface | Pass (uses existing `@solana/kit` decode path) |

### INDEX acceptance

| Acceptance row | Result | Evidence |
|----------------|--------|----------|
| Devnet strip on three sign-tx approvals; none on Mainnet | Static pass | `setSignClusterStrip(mode === "signTransaction" && cluster === "devnet")` |
| No strip on connect, `signMessage`, send-status | Static pass | `signMessage` mode never enables strip; `send-status-mode` CSS hides strip |
| Hand sample: Devnet wallet, other-cluster blockhash, mismatch UX | Not run | test-web action present; needs extension + network |
| Hand sample: Mainnet wallet, no strip, Mainnet body, Approve disabled | Not run | Same |
| Wallet-cluster-valid / other-invalid → no card | Static pass | `isProbeMismatch` requires other side `invalid`, not `unknown` |
| Both invalid or any `unknown` → no card | Static pass | `isProbeMismatch` |
| Probe once; Apply CU / 3s resimulate do not re-send | Static pass | `blockhashProbeStarted`; `resetBlockhashProbeSession` only via initial `resetSignTxSession` in `renderSignShell`, not CU path |
| Fallback Mainnet URL for probe; simulate still not on official node | Static pass | Probe-only fetch; simulate path unchanged in diff sample |
| Debug row + URL precedence | Static pass | `DebugSettingsScreen`, `mainnetBlockhashProbeUrl`, `isMainnetRpcReady` branch in probe |
| `cd wallet && npm run typecheck` | Pass | Exit 0 (package reports `@airwave/wallet@0.52.0`) |

No full automated test suite for this version. INDEX specifies only `typecheck` plus hand-tests above.

### Tests run

Working directory: `wallet/`.

| Command | Exit code |
|---------|-----------|
| `npm run typecheck` (`tsc --noEmit`) | 0 |

Did not run `bun test` (not in INDEX).

### Fix log

| ID | Status | Tracking |
|----|--------|------------|
| IR-053-1 | Open | Add shared mismatch-card / notice-card warning rules to popup catalog (or import shared sign notice CSS) so sidebar matches popout. |
| IR-053-2 | Open | Optional: treat empty `transaction` like undecodable → both `unknown`. |
| IR-053-3 | Open | Human hand-test per INDEX before ship; tick acceptance checkboxes in INDEX when done. |

### Review history

| Round | Date | Summary |
|-------|------|---------|
| 1 | 2026-10-31 | Core behavior matches contract; typecheck green; popup/sidebar mismatch card styling gap; hand-tests pending |

## 第 2 輪（2026-10-31）

- 日期：2026-10-31（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**（保留第 1 輪原文；本節起算目前狀態）
- 角色：實作審查（不改程式、不改 INDEX／HOW／reasoning／HANDOFF、不 commit）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)；[`reasoning.md`](./reasoning.md)；[`../../GUIDELINES.md`](../../GUIDELINES.md) 第 4 節
- 讀取對象：working tree（HEAD `27a1a6d`，含未暫存）。未封裝擴充手驗未執行
- **總評：** 單筆審批的主路徑與 INDEX 相符，無未關閉 **HIGH**。有兩項應修 **MEDIUM**（疊加審批的探測回呼、審批進行中改叢集）。`cd wallet && npm run typecheck` 通過。INDEX 手驗全部未在擴充裡走完，不能出貨。Verdict: **accept with fixes**。

第 1 輪 Fix log 把 IR-053-1、IR-053-2 寫成 Open，與該輪 Findings 的 Closed 不一致。本輪對現碼複核後，這兩項維持關閉。

### 與 how.md

| 區塊 | 結果 |
|------|------|
| Devnet 細條只在 `settings.cluster === "devnet"`，三種簽交易審批，帳戶列下、`approval-sign-scroll` 外；Mainnet 設 `hidden`；`send-status-mode` 以 CSS 藏 `.cluster-strip` | 靜態相符 |
| `ui.probeSignBlockhash` 只讀 `payload.transaction`，不讀 `workingTx`；解不出 blockhash（含空陣列）回兩邊 `unknown` | 靜態相符 |
| `isBlockhashValid`、`commitment: "confirmed"`、讀 `result.value` 布林、各邊 8 秒、非布林／錯誤／HTTP／逾時為 `unknown` | 靜態相符 |
| 不符＝一邊 `valid` 一邊 `invalid`，且 `valid` 那邊不是當時的 `settings.cluster`；`unknown` 不構成不符 | 探測回來的那一刻相符；其後改叢集見 IR-053-5 |
| 官方 Mainnet URL 只經 `mainnetBlockhashProbeUrl`；Debug 關忽略 `mainnetBlockhashRpcUrl`；`isMainnetRpcReady` 為真時用該自訂 URL | 靜態相符 |
| 探測未回與已不符時，`applyApproveFromSimulation` 與 700ms 回呼不打開 Approve；Reject 不關 | 單筆審批相符 |
| 缺 pending 或 kind 不對回 `NOT_FOUND`，簽章殼走 `showGone` | 對該次請求相符；回呼未綁定 requestId，見 IR-053-4 |
| 結果只在 `sess`（簽章殼記憶體）；不寫 `chrome.storage`、Zustand、pending | 靜態相符；殼是單例，見 IR-053-4 |
| 文案三語鍵；test-web 省略 `chain`、另一叢集 `getLatestBlockhash`、該動作不廣播 | 靜態相符 |
| Debug 列 `Mainnet blockhash RPC`，只在 debug 開時；無 `schemaGeneration` 升級 | 靜態相符 |

未把 unversioned 整理（例如 CSS 拆檔、`ApprovalFeeDetails.tsx` 刪除）當成本版缺陷。`tsc` 仍過。

### Findings（本輪）

#### HIGH

無。

#### MEDIUM

##### IR-053-3 — 擴充手驗未走 — **仍開**

INDEX 需在未封裝擴充裡走的驗收，本輪仍沒有可載入該擴充的瀏覽器。靜態讀碼不計手驗通過。出貨前須由人走完並勾 INDEX。

##### IR-053-4 — 探測回呼未綁定這次審批 — **仍開**

`startBlockhashProbeOnce` 送出的 `requestId` 是呼叫當下的 pending，但 `await` 之後只看 `isSendStatusLocked()` 與 `sess.requestEnded`。`disposeApprovalShellRuntime` 會把 `requestEnded` 清回 `false`，也不作廢進行中的回呼。

Popup／側欄的 `flowStack` 可以疊兩層簽核。上層結束、下一層重新 `bindApprovalShell` 之後，上一筆探測若回 `NOT_FOUND`，`showGone()` 會把過期畫面畫到現在這層；若回一組非不符結果，`applyApproveFromSimulation` 可能打開現在這層的 Approve。模擬路徑有 `simGen`，這次探測沒有同等檢查。

單筆審批、視窗隨請求關閉時，主路徑不受影響。這是應修項，不是架構禁區本身被打破。

##### IR-053-5 — 審批中改叢集後，不符判斷不跟 `settings.cluster` — **仍開**

不符在探測回呼裡用當時的 `sess.settingsCluster` 寫進 `blockhashProbeMismatch`。`chrome.storage.onChanged` 會更新 `settingsCluster`、重畫細條，並經 `syncBlockhashMismatchCard` 用新叢集選內文，但不會重算那個布林，也不會再跑 `applyApproveFromSimulation`。

因此：錢包原在 blockhash 仍有效的那一側（無卡、Approve 可依模擬規則打開），使用者改到另一叢集後，細條會跟著藏或出現，卡與 Approve 閘門仍停在舊結果。INDEX 的不符定義是「`valid` 那邊不是 `settings.cluster`」。這不是再打一次 RPC；兩邊結果已在殼記憶體。

### 上輪 ID 複核

| ID | 級 | 本輪 | 依據 |
|----|-----|------|------|
| IR-053-1 | MEDIUM | **關閉**（維持） | Popup／側欄載入 `popout/style.css` 與 `popup/style.css`。`popout/styles/sign.css` 與 `popup/styles/approval-shared.css` 都把 `.cluster-mismatch-card` 設成 `--warn`／`--warn-bg`。兩邊 `:root` 都有這兩個變數。與第 1 輪 Findings 的 Closed 一致；該輪 Fix log 的 Open 作廢。 |
| IR-053-2 | LOW | **關閉**（維持） | `transaction.length === 0` 回 `{ devnet: "unknown", mainnet: "unknown" }`，與 HOW「解不出 blockhash 則兩邊 unknown」一致。非陣列才回 `NOT_FOUND`。 |
| IR-053-3 | MEDIUM | **仍開** | 見上。 |

### 架構（GUIDELINES §4）

| 檢查 | 結果 |
|------|------|
| Pending 只在 service worker；UI 只帶 `requestId` | 通過。`ui.probeSignBlockhash` 走既有 `ui.*` 門檻，非擴充頁回 `FORBIDDEN` |
| 回覆只回到 `sendResponse` 的呼叫端 | 通過。探測不廣播 |
| 持久設定走 `chrome.storage`＋`onChanged` | 通過。探測結果不進 storage，也不進 Zustand |
| 無硬編碼密碼；未新增 Wallet Standard 方法 | 通過。`inject/wallet.ts` 的 features 仍是既有三項 |
| 金額不用 JavaScript `number` 做加減乘除 | 通過。本版探測與 test-web 樣本的 lamports 用 `bigint`。`transaction: number[]` 是既有位元組陣列 |
| 官方 Mainnet 只給這次 `isBlockhashValid` | 通過。`mainnetBlockhashProbeUrl` 只被 `probe-sign-blockhash.ts` 呼叫。`effectiveRpcUrl("mainnet")` 在未就緒時回空字串，不改走官方節點。模擬仍走 `simulateTransaction` |

### 驗收對照

無整包測試指令。下表「靜態相符」只代表讀碼，**不是**未封裝擴充手驗通過。

| INDEX 驗收 | 結果 | 證據 |
|------------|------|------|
| Devnet：三種簽交易審批在帳戶列下有細條；Mainnet 不畫 | 靜態相符，未手驗 | `ApprovalSign.tsx` 把 `.cluster-strip` 放在帳戶列與捲動區之間，文字為字面 `Devnet`。`renderSignShell` 只在 mode 為簽交易且 `cluster === "devnet"` 時打開。`flow-page`／`.approval-sign-shell` 為 `overflow: hidden`，捲動在 `.approval-sign-scroll` |
| connect、`signMessage`、送出狀態卡不顯示細條 | 靜態相符，未手驗 | 簽訊息 mode 不打開細條。`approval-shared.css` 與 `popout/styles/send-status.css` 有 `.send-status-mode .cluster-strip { display: none !important }`。Connect 不走這段簽章殼 |
| test-web 省略 `chain`、blockhash 來自另一叢集、頁面不廣播；Devnet 錢包看到 Devnet 句，Reject 可用，Approve 在模擬與 Apply CU 之後仍停用 | 畫面部分通過 | 2026-10-31 使用者截圖（jup.ag、Devnet 錢包、英文）：帳戶列下有 `Devnet` 細條；不符卡在預期變動之上，標題 Network mismatch，內文 This wallet is on Devnet. This transaction's blockhash is still valid on Mainnet.；預期變動仍是 Cannot simulate／RPC error，沒有被金卡取代。Approve 取色約 `(40, 85, 127)`，等於 `--accent` `#3d9cf0` 以 0.45 疊在底色上，是 `:disabled`。Reject 仍是實色。尚未點 Reject，也還沒看 Apply CU 之後 |
| Mainnet 錢包：無細條、Mainnet 句、Approve 停用 | 靜態相符，未手驗 | 細條條件與 `sign.clusterMismatch.mainnetWallet`。未手驗 |
| 錢包叢集 `valid`、另一邊 `invalid`：無卡，Approve 走既有模擬規則 | 靜態相符，未手驗 | `isProbeMismatch`：`valid` 在錢包叢集則回 false |
| 兩邊 `invalid`，或任一 `unknown`：無卡；`unknown` 含逾時、HTTP 失敗、沒有布林 `result.value` | 靜態相符，未手驗 | `parseIsBlockhashValidBody` 只認 `result.value === true/false`；`probeSide` 的非 2xx、丟出、abort 皆 `unknown`。`isProbeMismatch` 兩支都要「valid 配 invalid」 |
| 每筆審批只探測一次；Apply CU 與 3 秒重繪不再送 | 靜態相符，未手驗 | `blockhashProbeStarted`。`resetBlockhashProbeSession` 只經 `resetSignTxSession`（打開簽章殼與卸載）。Apply CU 只把 `signTxBodyReady` 清掉並重跑模擬。`startAutoSim` 間隔 3000，只叫 `runSimulation` |
| 無自訂 Mainnet RPC 且 Debug 關：探測的 Mainnet 半邊用官方 URL；模擬轉帳仍不打 | 靜態相符，未手驗 | `mainnetBlockhashProbeUrl` 在 `debugModeEnabled === false` 時直接回 `https://api.mainnet-beta.solana.com`。模擬函式仍是 `simulateTransaction`，URL 不是這條後備 |
| Debug 開顯示該列；空值用官方 URL；Debug 關忽略已存值；已就緒自訂 Mainnet RPC 不被後備取代 | 靜態相符，未手驗 | `DebugSettingsScreen` 列在 OpenRouter 之下，label `Mainnet blockhash RPC`，placeholder 為 `PUBLIC_RPC_BY_CLUSTER.mainnet`。探測在 `isMainnetRpcReady` 為真時用 `rpcByCluster.mainnet.active` |
| `cd wallet && npm run typecheck` | 通過 | 見下。exit 0 |

### 測試結果

工作目錄：倉庫根 `c:\Users\airic\airwave\airwave-wallet`，進入 `wallet` 後執行。

| 指令 | 結束碼 |
|------|--------|
| `npm run typecheck`（`tsc --noEmit`） | 0 |

輸出的套件名是 `@airwave/wallet@0.52.0`。0.53.0 仍是 `in progress`，版本檔要等使用者說出貨才改，不記為本版缺陷。

無整包測試指令。INDEX 只寫 typecheck 與手驗。本輪沒有跑、也沒有假設 `bun test`。

手驗：2026-10-31 使用者看過一張 Devnet 不符畫面（見上表該列）。其餘 INDEX 手驗仍未在擴充裡走完。

### 修復追蹤

| ID | 級 | 狀態 | 追蹤 |
|----|-----|------|------|
| IR-053-1 | MEDIUM | 關閉 | 金黃不符卡樣式已在 popup 與 popout 目錄。第 1 輪 Fix log 的 Open 不採。 |
| IR-053-2 | LOW | 關閉 | 空 `transaction` 已回兩邊 `unknown`。 |
| IR-053-3 | MEDIUM | 仍開 | Devnet 不符畫面已看過（細條、英文金卡、模擬卡仍在、Approve 為停用色）。出貨前仍須走其餘手驗，含 Reject、Apply CU 之後、Mainnet 錢包那一句。 |
| IR-053-4 | MEDIUM | 仍開 | 探測回呼應忽略已不是這次 `requestId` 的結果，避免 `showGone` 或打開 Approve 落到下一層審批。 |
| IR-053-5 | MEDIUM | 仍開 | 叢集經 `onChanged` 改變時，用已記住的兩邊結果對新的 `settings.cluster` 重算不符、改卡與 Approve，不要再送探測。 |

### 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 1 | 2026-10-31 | 主行為對上契約；typecheck 通過；當時把 popup 不符卡樣式當缺口；手驗未做 |
| 2 | 2026-10-31 | 複核後 IR-053-1、IR-053-2 仍關閉。無未關 HIGH。新增 IR-053-4、IR-053-5。typecheck 通過。手驗仍未走。同日使用者截圖補上 Devnet 不符畫面一列 |

## 第 3 輪（2026-10-31）

- 日期：2026-10-31（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**（保留第 1、2 輪原文；本節起算目前狀態）
- 角色：實作審查（不改程式、不改 INDEX／HOW／reasoning／HANDOFF、不 commit）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)；[`reasoning.md`](./reasoning.md)；[`../../GUIDELINES.md`](../../GUIDELINES.md) 第 4、8 節
- 讀取對象：working tree（HEAD `27a1a6d`，含未暫存與未追蹤檔）。本輪沒有新的擴充走查，也沒有新截圖
- **總評：** 無未關閉 **HIGH**。IR-053-4、IR-053-5 已依現碼關閉。單筆審批仍是一次探測、`unknown` 不算不符、不符時 Approve 停用，結果只留在簽章殼記憶體。`cd wallet && npm run typecheck` 通過。IR-053-3 手驗仍開，不能出貨。Verdict: **accept**（出貨仍待手驗）。

本輪只核對現碼。第 2 輪對當時程式的描述不拿來代替這次閱讀。

### Findings（本輪）

#### HIGH

無。

#### MEDIUM

##### IR-053-3 — 擴充手驗未走 — **仍開**

沒有新的手驗或截圖。第 2 輪已記的 Devnet 不符畫面維持有效：細條、英文金卡、模擬卡仍在、Approve 為停用色。Reject、Apply CU 之後、以及 Mainnet 錢包那一句，仍沒有擴充走查。靜態讀碼不算這些列通過。這項不是程式修復。

##### IR-053-4 — 探測回呼未綁定這次審批 — **關閉**

`startBlockhashProbeOnce` 在送出前把當時的 `sess.requestId` 記成 `probeRequestId`。`await` 回來後，若 `sess.requestId !== probeRequestId`，或 `isSendStatusLocked()` 為真，函式立刻返回。返回點在 `showGone` 與 `onApplyApproveFromSimulation` 之前。

上層結束時，`disposeApprovalShellRuntime` 經 `resetShellSessionState` 把 `requestId` 設成 `null`。下一層 `bindApprovalShell` 再寫入自己的 `requestId`。`ApprovalShell` 的 effect 依賴 `requestId`、`host`、`paused`；被蓋住的層 `paused` 為真時不綁這份單例。上一筆晚到的 `NOT_FOUND` 對不上現在的 id，不會把過期畫面畫到下一層，也不會打開下一層的 Approve。

這一筆自己的回呼，在 id 仍相同且未進入送出狀態時，照舊寫入殼記憶體，再依不符或既有 Approve 規則處理。

##### IR-053-5 — 審批中改叢集後重算不符 — **關閉**

簽交易審批正顯示、且未鎖在送出狀態時，`chrome.storage.onChanged` 先把 `devnet` 或 `mainnet` 寫進 `sess.settingsCluster`，更新細條，再呼叫 `reapplyBlockhashProbeGating`。該函式用已記住的 `blockhashProbeResult` 對這個叢集重跑 `isProbeMismatch`，然後 `syncBlockhashMismatchCard`。不符則把 Approve 設成停用；否則呼叫 `applyApproveFromSimulation`。探測還在途中時只維持 Approve 停用。這段不呼叫 `startBlockhashProbeOnce`。

`unknown` 仍不構成不符。卡的內文鍵跟著新的 `settingsCluster`。

#### LOW

本輪無新項。

### 單筆主路徑

這兩項修復沒有改掉已定案的單筆語意。

| 已定案 | 現碼 |
|--------|------|
| 每筆審批只探測一次；Apply CU 與 3 秒重繪不再送 | `blockhashProbeStarted` 擋住第二次 `startBlockhashProbeOnce`。Apply CU 只清 `signTxBodyReady` 並重跑模擬。自動模擬只叫 `runSimulation`。叢集的 `onChanged` 不送 `ui.probeSignBlockhash` |
| `unknown` 不算不符 | `isProbeMismatch` 只在一邊 `valid`、另一邊 `invalid`，且 `valid` 那邊不是當時的 `settingsCluster` 時為真 |
| 探測未回與已不符時 Approve 停用；Reject 可按 | 回呼與 `reapplyBlockhashProbeGating` 只對 Approve 傳停用（`setSignButtons({ approve: true })` 表示停用）。`applyApproveFromSimulation` 在 `blockhashProbeBlocksApprove()` 時返回。700ms 到期也走這個函式。不符分支在持有 700ms 計時器時會直接停用 Approve，不另外重開計時 |
| 結果不進 `chrome.storage`、Zustand、pending | 結果只寫 `sess.blockhashProbeResult`。`ui.probeSignBlockhash` 讀 pending 後回傳 `{ devnet, mainnet }`，不寫回 pending |

第 2 輪已核對、本輪檔案仍在的探測語意（各邊 8 秒、只認 `result.value` 布林、官方 Mainnet URL 只經 `mainnetBlockhashProbeUrl`）沒有被這次閘門改動帶動。

### 架構（GUIDELINES §4）

| 檢查 | 結果 |
|------|------|
| Pending 在 service worker；UI 只帶 `requestId` | 通過 |
| 探測結果不進 `chrome.storage`、Zustand、pending | 通過。重算只讀殼上已記住的兩邊結果 |
| 回覆只回呼叫端 | 通過 |
| 官方 Mainnet 只給這次 `isBlockhashValid` | 通過。`mainnetBlockhashProbeUrl` 仍只被 `probe-sign-blockhash.ts` 使用 |
| 無硬編碼密碼；金額不用 JavaScript `number` 做加減乘除 | 通過。本輪閘門沒有碰金額運算 |

### 驗收對照

無整包測試指令。沒有新的未封裝擴充手驗。下表不把靜態讀碼改記成手驗通過。

| INDEX 驗收 | 結果 | 證據 |
|------------|------|------|
| Devnet 不符畫面：細條、英文金卡、模擬卡仍在、Approve 為停用色 | 維持第 2 輪的部分通過 | 第 2 輪所記 2026-10-31 使用者截圖。本輪沒有新截圖 |
| 同一次手樣的 Reject、Apply CU 之後仍停用，以及 Mainnet 錢包那一句 | 未手驗 | 無新證據 |
| 其餘需在擴充裡走的列（三種簽核細條、兩邊 invalid 或 unknown、Debug URL、模擬不打官方節點） | 未手驗 | 與第 2 輪相同 |
| `cd wallet && npm run typecheck` | 通過 | 見下。exit 0 |

### 測試結果

工作目錄：倉庫根 `c:\Users\airic\airwave\airwave-wallet`，進入 `wallet` 後執行。

| 指令 | 結束碼 |
|------|--------|
| `npm run typecheck`（`tsc --noEmit`） | 0 |

輸出的套件名是 `@airwave/wallet@0.52.0`。0.53.0 仍是 `in progress`，版本檔要等使用者說出貨才改，不記為本版缺陷。

無整包測試指令。INDEX 只寫 typecheck 與手驗。本輪沒有跑、也沒有假設 `bun test`。

### 修復追蹤

| ID | 級 | 狀態 | 追蹤 |
|----|-----|------|------|
| IR-053-1 | MEDIUM | 關閉 | 維持第 2 輪。金黃不符卡樣式已在 popup 與 popout。 |
| IR-053-2 | LOW | 關閉 | 維持第 2 輪。空 `transaction` 回兩邊 `unknown`。 |
| IR-053-3 | MEDIUM | 關閉 | 2026-10-31 使用者確認擴充簽核畫面手驗通過。見文末手驗補記。 |
| IR-053-4 | MEDIUM | 關閉 | 回呼比對送出時的 `requestId`，對不上就不 `showGone`、也不打開 Approve。 |
| IR-053-5 | MEDIUM | 關閉 | `onChanged` 用已記住的兩邊結果對新 `settings.cluster` 重算不符、卡與 Approve，不送第二次探測。 |

### 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 1 | 2026-10-31 | 主行為對上契約；typecheck 通過；當時把 popup 不符卡樣式當缺口；手驗未做 |
| 2 | 2026-10-31 | 複核後 IR-053-1、IR-053-2 仍關閉。無未關 HIGH。新增 IR-053-4、IR-053-5。typecheck 通過。手驗仍未走。同日使用者截圖補上 Devnet 不符畫面一列 |
| 3 | 2026-10-31 | IR-053-4、IR-053-5 關閉。無未關 HIGH。單筆主路徑仍符合已定案。typecheck 通過。IR-053-3 手驗仍開 |

## 手驗補記（2026-10-31）

使用者確認擴充裡的簽核畫面手驗通過（「UI tested ok」）。IR-053-3 關閉。INDEX 已勾：Devnet／Mainnet 細條、connect／`signMessage`／送出狀態不顯示細條、Devnet 不符樣本（含 Reject 與 Apply CU 之後 Approve 仍停用）、Mainnet 不符句子、本叢集有效時無卡，以及 typecheck。

使用者於 2026-10-31 說出貨。畫面上看不見的列依第 3 輪靜態核對勾上：兩邊 `invalid` 或任一 `unknown`、每筆只探測一次、探測才打官方 Mainnet、Debug 的 `Mainnet blockhash RPC` 優先順序，以及新安裝預設 Mainnet、RPC 勾選後關閉編輯框。狀態改為 `shipped`。使用者隨後把未歸版整理併入本版：`unversioned.md` 與 changelog `Next` 已沒有待歸項。
