# Design review — 0.17.0 Airwave Wallet

- 日期：2026-10-07（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**（同一檔累加；初審 2026-10-06；第 2 輪 2026-10-07）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`sign-and-send-how.md`](./sign-and-send-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 上游行為契約：[`../../0.16.0/INDEX.md`](../../0.16.0/INDEX.md)（本版不重做 popup session）、[`../../0.13.0/INDEX.md`](../../0.13.0/INDEX.md)（宿主／confirmed 頁）、[`../../0.12.0/INDEX.md`](../../0.12.0/INDEX.md)（廣播／`broadcastSig`／60s）、[`../../0.10.0/INDEX.md`](../../0.10.0/INDEX.md)（只簽／凍結帳戶）、[`../../0.11.0/docs/sign-tx-budget-how.md`](../../0.11.0/docs/sign-tx-budget-how.md)（CU／`workingTx`）。`docs/roadmap/backlog/` 僅構想，不當已定案。
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：INDEX 錨點檔（現碼未實作本版 ≠ 設計 HIGH）
- **總評：** 無未關閉 HIGH；H1–H4、M1–M4、L1–L4 已寫進現 INDEX／HOW／HANDOFF／reasoning（規劃採 H1-A、H3-A；本輪核對 H4／M3／M4 已落檔）。無應修 MEDIUM。提案可行，待拍板為空，HANDOFF 含 paste-ready。**設計審查門檻通過**。非不可行。

Findings 關閉＝已寫進 INDEX／HOW／HANDOFF（或 reasoning 否決句）；仍開＝契約仍分叉或主路徑可被誤解。穩定 ID 不重編號。本檔不是產品契約。

---

## Findings（第 3 輪複審）

關閉項保留初審／第 2 輪題旨，並寫關閉位置。新 ID 自 L5 起，不重編舊號。

### HIGH

#### H1 — 「確認失敗可再批」與「有 `broadcastSig` 的逾時 → `BROADCAST_UNCONFIRMED`」未定義「逾時」是哪一層 — **關閉**

**初審題旨：** 已定案把 60s 確認失敗「可再批、不 bridge」與「關窗／逾時 → `BROADCAST_UNCONFIRMED`」捆在一起；Track 2 又把逾時與 onRemoved 寫成無 sig → `USER_REJECTED`。與現碼 `cancelPendingTimeout`、60s 只 progress、dApp 批准前 `TIMEOUT` 三層衝突。規劃採 **H1-A**。

**核對（維持關閉）：** INDEX Pending／批准後／拒絕列；Track 2 不做 60s 結束 dApp、不做把批准前 `TIMEOUT` 改成 `USER_REJECTED`；HOW 關窗末段；reasoning 否決「60s 也 `BROADCAST_UNCONFIRMED`」「批准後仍靠 120s pending timer」。

#### H2 — 拒絕／無 sig 的 abort 若抄 `walletSend` 結束路徑，dApp 收不到 `USER_REJECTED` — **關閉**

**初審題旨：** 批准對齊 walletSend 時，實作者易整段複製 `finishWalletSendUserAbort`（永不 `sendBridgeResult`）。onRemoved 成功 1s 關窗須 no-op。

**核對（維持關閉）：** INDEX 禁止只呼叫 `finishWalletSendUserAbort`；無 sig 拒絕／批准前關窗 → `USER_REJECTED`；HOW 審批殼拒絕列＋onRemoved；HANDOFF／paste-ready。有 sig 再點拒絕已另關 **M3**，不重開 H2。

#### H3 — inject `bridgeRequest` 120s 從發起起算，蓋不住「思考時間 + ≤60s confirmed」 — **關閉**

**初審題旨：** 全命令 `TIMEOUT_MS = 120_000`；使用者於 t≈70s 批准、鏈於 t≈130s confirmed 時 inject 已 timeout。規劃採 **H3-A**。

**核對（維持關閉）：** INDEX「inject 等待」僅本命令 ≥ `PENDING_TIMEOUT_MS`＋60s；HOW `bridge-client.ts`；驗收／Track 2 ≥180s；reasoning 否決全命令 120s、否決本版重置倒數。殼 `armExpiry` 已另關 **H4**，不重開 H3。

#### H4 — 審批殼 `armExpiry` 仍以 enqueue＋120s 把確認中畫面打成「已過期」，可關窗誤殺 dApp — **關閉**

**第 2 輪題旨：** H3-A 只延長 inject；SW 批准後 cancel pending timer。契約未寫死批准後拆除殼過期 → 長思考後 `showGone`，關窗可誤發 `BROADCAST_UNCONFIRMED`／`USER_REJECTED`。

**本輪核對（已落檔）：**

- INDEX「審批 UI」：進入確認中立刻清 `armExpiry`／`expiryTimer`；確認等待、確認失敗還原審批、已確認頁**禁止** `showGone`；過期頁只服務批准前（與 SW `PENDING_TIMEOUT_MS` 同界）。
- INDEX Track 3：進入確認中立刻清 `armExpiry`；確認中／還原審批／已確認禁止 `showGone`。
- HOW 殼內三閘第四列：`armExpiry`／`expiryTimer` 同上。
- HANDOFF 禁區＋paste-ready：禁止確認中被 `armExpiry`／`showGone`；進入確認中清 `armExpiry`。
- reasoning 否決「確認中仍跑殼 `armExpiry`」；選定「確認中禁止殼 `armExpiry` `showGone`」。

現碼 `enterWalletSendConfirming` 仍不清 timer ≠ 設計 HIGH。

### MEDIUM

#### M1 — 共用殼三處現碼只認 `walletSend`，HOW 未點名閘門 — **關閉**

HOW「殼內三閘」；INDEX Track 3 禁止 `closeHost()` 預設支；HANDOFF 同禁。`restoreWalletSendReviewAfterError` 適用本 kind 已寫。

#### M2 — 0.11.0 CU／`workingTx` 對本 kind 只靠「同一套殼」暗示 — **關閉**

INDEX「審批 UI」完整走 0.11.0 HOW；文件地圖鏈該檔；HOW：未簽可寫、非零簽名不改 ix。

#### M3 — 已有 `broadcastSig` 後還原審批再點拒絕，與關窗碼不一致 — **關閉**

**第 2 輪題旨：** INDEX 曾寫 reject「一律」`USER_REJECTED`；關窗／abort 有 sig → `BROADCAST_UNCONFIRMED`；60s 失敗還原後拒絕鈕回來，次要路徑會把已送出看成從未送出。

**本輪核對（已落檔）：**

- INDEX「拒絕／關窗／abort」：reject 尚無 sig → `USER_REJECTED`；**已有** sig → 與關窗／abort 同一碼 `BROADCAST_UNCONFIRMED`（還原審批後點拒絕亦然）。
- INDEX Track 2：點拒絕無 sig → `USER_REJECTED`；有 sig → `BROADCAST_UNCONFIRMED`。
- HOW 審批殼拒絕列：無 sig／有 sig 分流；禁止只 `finishWalletSendUserAbort`。
- HANDOFF 禁區＋paste-ready：有 `broadcastSig` 時拒絕／關窗同一 `BROADCAST_UNCONFIRMED`。
- reasoning 選定：點拒絕無 sig → `USER_REJECTED`；有 sig → `BROADCAST_UNCONFIRMED`。

（reasoning 選定另有一句「只在關窗／abort」→ 見 **L5**，不重開 M3。）

#### M4 — 批准本 kind 若走上 `unbindPopoutByRequest` 的 signTransaction 支，onRemoved 失效 — **關閉**

**第 2 輪題旨：** 現碼 walletSend 批准在 unbind **之前** return `{ accepted: true }`；其餘 kind 先 unbind。誤走後者則關確認中窗時 `onRemoved` 拿不到 `requestId`。

**本輪核對（已落檔）：**

- INDEX「批准後」：禁止批准本 kind 時呼叫 `unbindPopoutByRequest`；須與 walletSend 一樣在 unbind 之前 return `{ accepted: true }`；windowId↔requestId 維持到 pending 結束或視窗關閉。
- INDEX Track 2：批准 **不** `unbindPopoutByRequest`。
- HOW 審批殼批准列＋「批准後 SW」：不要／禁止 `unbindPopoutByRequest`。
- HANDOFF 禁區＋paste-ready：禁止批准時 `unbindPopoutByRequest`。
- reasoning 否決「批准時 `unbindPopoutByRequest`」；選定「批准禁止 `unbindPopoutByRequest`」。

現碼 `ui-handlers.ts` 其餘 kind 仍先 unbind ≠ 設計 HIGH。

### LOW

| ID | 本輪狀態 | 說明 |
|----|----------|------|
| L1 | **關閉** | INDEX 命令列：`sendBridgeResult(tabId)`、tab 級、`frameId` 固定 0（0.1.0）。HOW enqueue 同句。 |
| L2 | **關閉** | INDEX 已列 `solana:mainnet-beta`／`testnet`／`localnet` → `INVALID_CHAIN`。HOW enqueue 舉例。 |
| L3 | **關閉** | INDEX：凍結 `signAccountId`（註解與欄位含本 kind）。HOW：註解含本 kind；可新增 `SignAndSendTransactionPayload`。 |
| L4 | **關閉** | HOW test-web：Settings＝mainnet 時 devnet `chain` → `CHAIN_MISMATCH`、不開窗。INDEX 驗收／Track 1 有錯 chain 不開窗。 |
| L5 | **關閉** | reasoning 選定已改為：關窗、abort、或還原後點拒絕同一 `BROADCAST_UNCONFIRMED`。 |

### 本輪另核過、不另開 ID

- **H4／M3／M4 規劃已採句**均在 INDEX、HOW、HANDOFF（含 paste-ready）、reasoning 出現；不以 chat 為準。
- **Pending／廣播／storage／custody：** 新 kind 只在 SW `Map`、`uiHost: "popout"`、popout 只帶 `requestId`。結果 `sendBridgeResult` 指定 tab。`walletSend` 仍不 bridge。簽名在擴充／SW；inject 不持鑰。無新密碼欄、類 B。與 GUIDELINES 一致。
- **能力表：** 宣告且必須實作；不宣告 `signIn`／`signAllTransactions`。
- **宿主：** 網站 popout；`walletSend` popup。不推翻 0.13.0。
- **`signTransaction`：** 只簽、立刻關、不廣播。
- **Standard options／重送／成功時序／依賴／storage：** 現契約仍成立。成功時序：confirmed 後立刻 bridge signature，禁止 SW sleep；殼 hold 1s 後 `window.close`；空 pending 的 `onRemoved` no-op。
- **HANDOFF paste-ready** 未逐字寫「還原審批期間禁 `showGone`」，INDEX Track 3／HOW 第四列已寫；不另開 ID。
- **INDEX 驗收 checklist** 拒絕句偏重關窗／abort，還原後點拒絕寫在已定案／Track 2；不另開 ID。
- **待拍板：** 空。
- **backlog：** 「不要宣告 signAndSend」是構想非目標，不擋本版 INDEX。
- **0.16.0：** 本版改 inject／content／SW／approval／popout／test-web，與 0.16.0「只收斂 popup」分版，不衝突。
- **隱私：** 本報告無真實助記詞／私鑰／密碼／個人地址。

---

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 宣告 `solana:signAndSendTransaction` 且方法可用；account.features 含此字串 | 可 | 無 |
| 未實作的其它 Standard 方法仍未宣告 | 可 | 無 |
| 網站此請求開 popout；`walletSend` 仍 popup | 可 | 無 |
| 批准後確認中 → confirmed → hold 1s → 關窗；dApp 在 confirmed 後才拿到 signature | 可 | H4／M4 契約已關；現碼未接 ≠ 設計缺口 |
| `signTransaction` 批准仍立刻關、不廣播 | 可 | 無 |
| 拒絕／批准前關窗 → `USER_REJECTED`；已廣播未確認關窗 → `BROADCAST_UNCONFIRMED`；60s 失敗可再批 | 可 | M3 契約已關（還原後拒絕同碼） |
| inject 本命令 ≥180s；其餘 120s | 可 | H3／H4 契約已關 |
| 結果只回發起 tab；pending 不進 storage | 可 | L1 已關 |
| 錯 chain 不開窗 | 可 | L2／L4 已關 |
| typecheck／build | 可 | 無 |
| test-web：Standard 成功／拒絕；既有只簽與 dApp 自廣播 | 可 | 現碼成功仍可能 log Unexpected（現碼 ≠ 設計 HIGH） |
| 類 B；文件無真實秘密 | 可 | 無 |

---

## 與現碼抽樣（第 3 輪）

現碼未做本版 ≠ 設計 HIGH。只標與**現契約**互斥或落地閘門。

| 錨點 | 現行 | 與現 0.17.0 契約 |
|------|------|------------------|
| `inject/wallet.ts` | 無 `SolanaSignAndSendTransaction`；account.features 僅 message＋signTx | 本版須加；現碼未做 ≠ HIGH |
| `bridge-client.ts` | 全命令 120s | H3-A：僅本命令 180s；未做 ≠ HIGH |
| `content/index.ts` | 白名單無本命令；核對 `event.origin` | 加字串即可 |
| `commands.ts` | 無本命令／kind | 本版新增 |
| `dapp-handlers.ts` | 無本命令；`signTransaction` 閘＋popout | 對齊＋chain 檢查 |
| `ui-handlers.ts` | walletSend 批准 early return（unbind 之前）；其餘先 `unbindPopoutByRequest`；simulate 兩種 kind；abort 只 walletSend | 批准須本 kind 走 walletSend 支（已關 M4）；拒絕／abort 須 bridge（H2／M3） |
| `wallet-finish-send.ts` | `kind !== "walletSend"` 早退；成功只 settled；批准 `cancelPendingTimeout`；60s 只 progress | HOW 允許本 kind＋先 bridge signature |
| `wallet-send-state.ts` | `getWalletSendState` 缺則建空物件 | 共用簽送時 `broadcastSig` 可沿用 |
| `pending-timeout.ts` | 非 walletSend → dApp `TIMEOUT`；walletSend 有 sig no-op | H1-A：本 kind 批准後已 cancel |
| `background/index.ts` `onRemoved` | walletSend 不 bridge；其餘 `USER_REJECTED` | 須先辨本 kind；空 pending no-op |
| `approval/shell.ts` | 三閘只認 walletSend；`armExpiry` 120s 且確認中不清；hold 1000ms；類 B | 三閘＝M1；`armExpiry`＝已關 H4（現碼未清 ≠ HIGH） |
| `popout/main.ts` | 只帶 `requestId`；success exit `window.close` | 與 1s 關窗同向 |
| `test-web/src/main.ts` | 有 feature 則真打 API | Track 4；現碼無 feature |

不要把 brainstorm 或 Solibra 原始碼當成現行程式。

---

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | **關閉** | INDEX Pending／批准後／拒絕列（H1-A）；Track 2 不做項；HOW 關窗末段；reasoning 否決 60s bridge／批准後 120s timer |
| H2 | HIGH | **關閉** | INDEX 拒絕必須 `sendBridgeResult`、禁 `finishWalletSendUserAbort`；HOW 拒絕列＋onRemoved；HANDOFF |
| H3 | HIGH | **關閉** | INDEX inject 等待；HOW bridge-client；驗收 ≥180s；reasoning 否決重置倒數 |
| H4 | HIGH | **關閉** | INDEX 審批 UI＋Track 3 清 `armExpiry`／禁 `showGone`；HOW 殼第四列；HANDOFF／paste-ready；reasoning 否決確認中 `armExpiry` |
| M1 | MEDIUM | **關閉** | HOW 殼內三閘；INDEX Track 3；HANDOFF 禁 `closeHost` 預設支 |
| M2 | MEDIUM | **關閉** | INDEX 審批 UI＋文件地圖 0.11.0 HOW；HOW workingTx／已簽不改 ix |
| M3 | MEDIUM | **關閉** | INDEX 拒絕列＋Track 2：有 sig 點拒絕＝`BROADCAST_UNCONFIRMED`；HOW 拒絕列；HANDOFF；reasoning 選定 |
| M4 | MEDIUM | **關閉** | INDEX 批准後＋Track 2 禁 `unbindPopoutByRequest`；HOW 批准列／批准後 SW；HANDOFF；reasoning 否決 |
| L1 | LOW | **關閉** | INDEX 命令列 tab 級 `sendBridgeResult`；HOW enqueue |
| L2 | LOW | **關閉** | INDEX／HOW `INVALID_CHAIN` 例 |
| L3 | LOW | **關閉** | INDEX／HOW `signAccountId` 註解＋payload 型別 |
| L4 | LOW | **關閉** | HOW test-web `CHAIN_MISMATCH`；INDEX 錯 chain 驗收 |
| L5 | LOW | **關閉** | reasoning 選定句已與 INDEX 拒絕列同向 |

---

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-06 | 有未關閉 HIGH（H1、H2、H3）；應修 M1、M2；提案非不可行；**門檻未通過** |
| 第 2 輪複審 | 2026-10-07 | H1–H3、M1–M2、L1–L4 **關閉**（H1-A、H3-A）。新開 **H4**（殼 `armExpiry`）、**M3**（有 sig 再拒絕）、**M4**（批准 unbind）。提案非不可行；**門檻未通過** |
| 第 3 輪複審 | 2026-10-07 | H4／M3／M4 **關閉**（確認中禁 `showGone`；有 sig 拒絕＝`BROADCAST_UNCONFIRMED`；批准禁 `unbindPopoutByRequest`）。新開 **L5**（reasoning「只」字，不擋）。無未關 HIGH、無應修 MEDIUM；**門檻通過** |

## 初審 Findings 原文（第 1 輪，2026-10-06）

以下為初審全文題旨存檔，狀態以上方「第 3 輪複審」與追蹤表為準，勿依本節舊「仍開」開工。

### HIGH（初審）

#### H1 — 「確認失敗可再批」與「有 `broadcastSig` 的逾時 → `BROADCAST_UNCONFIRMED`」未定義「逾時」是哪一層 — 初審仍開

已定案「批准後」：確認失敗時 pending **仍在**、`ui.walletSendProgress` 短錯誤、可再批准、**不**對 dApp 成功、**不**關窗。同表「拒絕／關窗」：已有 `broadcastSig`、確認尚未成功而**關窗／逾時** → 對 dApp `BROADCAST_UNCONFIRMED`。Track 2 又把 **onRemoved／abort／逾時**捆成：無 sig → `USER_REJECTED`；有 sig → `BROADCAST_UNCONFIRMED`。

HOW 建議共用 `runWalletSendAfterApprove`：現碼批准時 **`cancelPendingTimeout`**，60s `waitConfirmOnly` 失敗只 `notify.progress`、不結束 pending、不 `sendBridgeResult`。現碼 dApp pending 逾時碼是 **`TIMEOUT`**（不是 `USER_REJECTED`）；`walletSend` 有 `broadcastSig` 時 pending 逾時 **no-op**。

新 agent 無法判斷要實作哪一種，且會改到主路徑（dApp 在確認等待中被結束 vs 使用者可再批）：

| 層 | 現碼／上游 | 0.17.0 文字可能讀成 |
|----|------------|---------------------|
| `PENDING_TIMEOUT_MS`（120s，enqueue 起算） | dApp → `TIMEOUT`；walletSend 有 sig → 不結束 | Track 2 → 無 sig `USER_REJECTED`／有 sig `BROADCAST_UNCONFIRMED`；或批准後已 cancel 變成死句 |
| 60s `getSignatureStatuses` | 只 progress、可再批 | 「逾時」→ 對 dApp `BROADCAST_UNCONFIRMED`（與「確認失敗可再批」互斥） |
| 關窗／abort | walletSend 不 bridge dApp | INDEX／HOW 有 sig 則 `BROADCAST_UNCONFIRMED`（關窗這條本身清楚） |

**建議寫死（擇一，推薦 A）：**

- **A（對齊 walletSend 與「可再批」句）：** 批准後 `cancelPendingTimeout`。60s 確認失敗 **只** progress、pending 留著、**不** bridge。已定案「關窗／逾時」的 **逾時** 刪掉或改成「僅批准前仍適用既有 dApp `TIMEOUT`（與 `signTransaction` 相同）」。有 `broadcastSig` 才對 dApp 結束的路徑 **只有** 關窗與 `ui.abortPending` → `BROADCAST_UNCONFIRMED`。
- **B：** 批准後 **不** cancel pending timer；timer 觸發且有 sig → `BROADCAST_UNCONFIRMED` 並結束；無 sig → 維持既有 `TIMEOUT`（不要改成 `USER_REJECTED`，以免與「enqueue 對齊 signTransaction」打架）。60s 仍只 progress。
- **C：** 60s 確認失敗也對 dApp `BROADCAST_UNCONFIRMED`——須同時刪掉「可再批准」句。不建議。

Track 2「無 sig 逾時 → `USER_REJECTED`」在 A／B 下都應刪，以免推翻既有 `TIMEOUT`。

#### H2 — 拒絕／無 sig 的 abort 若抄 `walletSend` 結束路徑，dApp 收不到 `USER_REJECTED` — 初審仍開

已定案：點拒絕或批准前關窗 → 對 dApp `USER_REJECTED`（關窗 message 可維持 `"Approval window closed"`），結束 pending。HOW 關窗／abort 對本 kind：無 sig → `USER_REJECTED` 並 **bridge**；有 sig → `BROADCAST_UNCONFIRMED` 並 bridge。`windows.onRemoved` 禁止當 `signTransaction` 只回拒絕而漏掉已送出分流。

缺口：HOW「審批殼」表 **只列批准成功**，沒有拒絕列。現碼 `ui.resolvePending`：`walletSend` 拒絕走 `finishWalletSendUserAbort`（只 `airwave-wallet-send-settled`、**永不** `sendBridgeResult`）；`signTransaction` 拒絕才 `finishSignTransaction` bridge。本版批准明確「對齊 walletSend、不是 signTransaction」。實作者很容易整段複製 walletSend（含拒絕），網站 Promise 會掛到 inject／pending 逾時。

`ui.abortPending` 現碼同樣只處理 `walletSend`。HOW 已要求本 kind 要 bridge；INDEX／HANDOFF／paste-ready **未**寫「拒絕＝必須 `sendBridgeResult`，禁止只 settled」。

**建議寫死：**

- `ui.resolvePending` **reject**：本 kind **一律** `sendBridgeResult` `USER_REJECTED`（批准前／尚無 `broadcastSig`）；結束 pending；popout `closeHost`／`window.close`。**禁止**只呼叫現有 `finishWalletSendUserAbort`。
- 有 `broadcastSig` 時不該再當「點拒絕＝USER_REJECTED」：確認中殼無拒絕鈕（現碼 confirming 藏 dock）；若仍 abort／關窗 → `BROADCAST_UNCONFIRMED`（與 HOW onRemoved 一致）。
- onRemoved：無 pending（成功已 `removePending` 後 1s 關窗）→ **no-op**，禁止補發 `USER_REJECTED`（INDEX 已有；HOW 應寫「`getPending` 空則 return」，對齊現碼 `index.ts`）。

#### H3 — inject `bridgeRequest` 120s 從發起起算，蓋不住「思考時間 + ≤60s confirmed」 — 初審仍開

dApp 結果走同一條 inject Promise。現碼 `wallet/src/inject/bridge-client.ts`：所有命令 `TIMEOUT_MS = 120_000`，content 對 `{ pending: true }` **不** resolve，計時仍從 `postMessage` 起算。`PENDING_TIMEOUT_MS` 同為 120s。`signTransaction` 只需要在 120s 內批准即回包；本 kind 批准後還要最多 **60s** 等 `confirmed` 才 `sendBridgeResult`。

主路徑反例：使用者於 t≈70s 批准，鏈於 t≈130s 達 confirmed → SW 依約回 signature，inject 已於 t=120s reject「Request timed out」→ 驗收「confirmed 後 dApp 才拿到 signature」失敗（dApp 已失敗、窗可能仍顯示已確認）。walletSend 不經 inject，故 0.12.0／0.13.0 沒有這條。

INDEX／HOW／HANDOFF 均未寫本命令的 page-side 等待上限。

**建議寫死（擇一）：**

- **A（建議）：** 僅 `dapp.signAndSendTransaction` 的 inject 等待 ≥ `PENDING_TIMEOUT_MS` + 60s（或固定寫死毫秒與常數名）。content `{ pending: true }` 行為不變。
- **B：** 批准成功 `{ accepted: true }` 時由 SW 通知 content／inject **重置**該 `requestId` 倒數（新訊息，本版較重，須列非目標或明確做）。
- **C：** 縮短鏈上等待使總時長必 ≤120s——與已定案 60s 衝突，否決。

### MEDIUM／LOW（初審）

M1：HOW 點名 shell 三閘；HANDOFF 禁止落入 `closeHost()` 預設支。  
M2：本 kind 的 simulate／`workingTx` 完整走 0.11.0（已簽不寫 CU）；鏈 0.11.0 HOW。  
L1：沿用 tab 級 `sendBridgeResult`，非新廣播模型。  
L2：`mainnet-beta` 等為 `INVALID_CHAIN` 一例。  
L3：`signAccountId` 註解含本 kind；payload 型別可新增。  
L4：test-web 手驗 `CHAIN_MISMATCH` 可選。
