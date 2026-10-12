# Design review — 0.37.0 Airwave Wallet

- 日期：2026-10-12（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**（初審、第 2 輪同日，見歷審摘要）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 上游對照：[0.36.0](../../0.36.0/INDEX.md)（CU；本版非目標不改簽署 bytes）、[0.27.0](../../0.27.0/INDEX.md)（origin 只取 tab URL、核准前再核對、結果帶 `frameId`、`setActiveAccount` 改寫全部 `accountId`）、[0.12.0](../../0.12.0/INDEX.md)（`wallet.beginSend` 的 pending id 由 service worker 產生）、[0.2.0](../../0.2.0/INDEX.md)（刪帳戶時對該 origin 的 `tabIds` 推斷線；本版改為已離開的分頁不送）。無 backlog 條目；未排程構想不當契約
- 現行程式抽樣：見文末。Track 1 的插入拒絕已在工作區；Track 2 的分頁監聽、送出前分類與寫入鏈尚未接上。尚未接上的部分不升 HIGH
- **總評：** 無未關閉 **HIGH**。第 2 輪的 H2、M4、L3、L4 已寫進 INDEX／HOW／reasoning／HANDOFF，關閉。無應修 **MEDIUM**。新 LOW：L5，非阻擋。INDEX 無「待拍板」。提案可行。審查門檻**通過**。不可行：否。

本版仍把 pending 留在 service worker 記憶體，popout 只帶 `requestId`，帳戶變更與斷線只對仍在該 origin 的 tab 送出，持久連線仍走 `chrome.storage`。沒有硬編碼密碼，沒有新的 Wallet Standard 方法，簽名仍不在 page script。連線寫入鏈在 service worker 內把讀改寫排好，鏈上步驟再呼叫通知時於同一步做完；各 runtime 仍靠 `onChanged` 看 storage。這與架構禁區同向。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／reasoning／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。第 3 輪依**現在**的 INDEX／HOW／reasoning／HANDOFF 核對既有 ID。已關閉的不重編號。

### HIGH

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| H1 | **關閉** | 第 2 輪已關閉。本輪複核：INDEX「帳戶通知與斷線」「分頁關閉」「簽章回傳」、HOW「送出前再查」、reasoning「連線分頁」、HANDOFF 核心段仍是同一句 |
| H2 | **關閉** | 重入句已寫進 INDEX「連線寫入鏈」、HOW「何時寫回 storage」、reasoning「連線分頁」、HANDOFF 核心段與 paste-ready |

#### H1 — 通知路徑把「非 ok」當成可刪 tabId，與未知網址不刪不能同時成立 — **關閉**

第 2 輪已關閉。本輪複核句子仍在，不重開。

#### H2 — 連線寫入鏈沒寫重入，巢狀呼叫會把斷線與帳戶對齊卡死 — **關閉**

第 2 輪要的句子現在在四份檔裡：

- INDEX「連線寫入鏈」：已經占住這一步時，內部的 `notifyAccountChanged`、`notifyAccountChangedForConnectionAccount`、`notifyDisconnected` 在同一步做完讀改寫與送出，不得再向同一條鏈 `await` 下一個名額；鏈的尾端只在這一步整段結束後才讓給下一步。
- HOW「何時寫回 storage」是同一句，並寫明 `alignConnectionsToActiveAccount`、`removeConnectionAndNotify`、`disconnectAllConnections`、`handleSetActiveAccount`、`handleDeleteAccount` 都適用。
- reasoning「連線分頁」寫明再 `await` 鏈的下一個名額會讓斷線與帳戶對齊等自己結束，所以內部通知要在同一步做完。
- HANDOFF 核心段與 paste-ready 用同一句。

不重開。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉** | 第 2 輪已關閉。鏈仍在；切換帳戶與刪帳戶已列入名單（見 M4），不重開 M1 |
| M2 | **關閉** | 第 2 輪已關閉。驗收的 esbuild＋`node --test` 整段與「窄測不是整包指令」仍在 |
| M3 | **關閉** | 第 2 輪已關閉。初審列的邊界仍各有驗收句 |
| M4 | **關閉** | `handleSetActiveAccount` 與 `handleDeleteAccount` 已列入鏈的名單 |

#### M1 — 連線 map 寫入會互相覆蓋 — **關閉**

第 2 輪已關閉。本輪複核 INDEX「連線寫入鏈」、HOW「何時寫回 storage」、reasoning「連線分頁」、HANDOFF 核心段仍要求同一條鏈。不重開。

#### M2 — 窄測指令寫了工具名，沒有命令列 — **關閉**

第 2 輪已關閉。INDEX 驗收仍是在 `wallet/` 可複製的 esbuild 三段（兩個入口、`--bundle --platform=node --format=esm`、兩個 `.mjs`、`node --test`、跑完刪除）。已定案「窄測不是整包指令」仍寫明不回寫 GUIDELINES 出貨檔案表。不重開。

#### M3 — 驗收沒有覆蓋已寫死的邊界 — **關閉**

第 2 輪列出的邊界仍在 INDEX 驗收：不合格 id、取走後可再插入、`pendingInsertError`、分頁關閉或 `left-web`、導到另一個 https origin、斷線不送到已離開的分頁、`about:` 或讀不到時不送。其中三句送出已標手驗（見 L4）。不重開。

#### M4 — 切換帳戶與刪帳戶的寫入不在鏈上 — **關閉**

INDEX「連線寫入鏈」與 HOW「何時寫回 storage」的名單已含 `handleSetActiveAccount` 與 `handleDeleteAccount`，與 `alignConnectionsToActiveAccount` 並列。reasoning 寫「切換帳戶與刪帳戶也在這條鏈上」。HANDOFF 核心段寫「含切換帳戶與刪帳戶」；paste-ready 點名這兩個函式。重入沿用 H2 那句。不重開。

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉**（初審非阻擋） | INDEX 仍分成「換了 http(s) origin」與「離開網頁」 |
| L2 | **關閉**（初審非阻擋） | INDEX「待批只插入」與 reasoning 末段仍寫長於 80 不插入，80 不是密碼學長度 |
| L3 | **關閉**（第 2 輪非阻擋） | INDEX「不自動改掛」已寫相對 0.27.0 的收窄；HOW 末句同一意 |
| L4 | **關閉**（第 2 輪非阻擋） | 三句「不送」驗收已標手驗 |
| L5 | **仍開**（非阻擋） | 「同一 origin 只改 path」的「仍送到」沒有標手驗 |

#### L3 — 0.27.0 的「不改 tabIds」與本版通知路徑會改 tabIds — **關閉**

INDEX「不自動改掛」現為：切換帳戶與 align 仍不為了改綁 `accountId` 而改 `tabIds`；送出前分類為 `left-web` 或另一個 http origin 時，仍從該列拿掉 tabId。HOW「何時寫回 storage」末句：切換帳戶與 align 改 `accountId` 時不順便改 `tabIds`；送出前的分類仍可拿掉已離開的 tabId。不重開。

#### L4 — 送出前不送的驗收句沒有標手驗 — **關閉**

INDEX 驗收這三句已以「手驗：」起首：導到另一個 https origin 後切換帳戶、新頁面收不到公鑰；網址仍是 `about:` 或讀不到時不送公鑰；斷線通知不送到已離開該 origin 的分頁。換站那句並寫明窄測不斷言 `sendMessage`。HANDOFF 完成檢查仍要求換站收不到公鑰用未封裝擴充手驗。不重開。

#### L5 — 「同一 origin 只改 path」的送出沒有標手驗 — **仍開（非阻擋）**

INDEX 驗收「同一 origin 只改 path：tabId 仍在，帳戶變更仍送到該分頁」沒有標手驗。下一條窄測只斷言同 origin 的 tabId 留著。同段已寫明窄測不斷言 `sendMessage`。建議在該句前加上「手驗：」。不擋主路徑，不擋本輪門檻。

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 同一 `requestId` 再送另一筆：`REQUEST_ID_IN_USE`，第一筆 payload 與 origin 不變，不為該 id 再開 popout | 可測 | 無。`addPending` 在任何 await 之前失敗即回，不呼叫 `openPopout` |
| 空的、長於 80、或不是字串的 `requestId`：`INVALID_REQUEST_ID`，不插入 | 可測 | 無。現有 `pending.test.ts` 只覆蓋空字串；契約已要求其餘兩類，屬實作要補的斷言 |
| 取走、拒絕或逾時後可再插入；在途第二次不呼叫 `schedulePendingTimeout`，成功的新插入才呼叫 | 可測 | 無 |
| `wallet.beginSend` 插入失敗時，錯誤碼來自 `pendingInsertError` | 可測 | 無。現碼仍寫死 `REQUEST_ID_IN_USE`，屬尚未改的實作 |
| 側欄通知失敗改開 popout：只改 `uiHost`，payload 不變 | 可測 | 無 |
| 另一個 `requestId` 仍可成為另一筆待批 | 可測 | 無 |
| 手驗：已連線分頁導到另一個 https origin 後切換帳戶：新頁面收不到公鑰；舊 origin 仍在，其 `tabIds` 不含該分頁；新 origin 不因此加入 | 可測 | 無。切換帳戶的寫入已在鏈上（M4）。不送已標手驗（L4） |
| 同一 origin 只改 path：tabId 仍在，帳戶變更仍送到該分頁 | tabId 可測；送到該分頁要手驗 | 窄測只覆蓋 map。送出標示見 L5 |
| 手驗：網址仍是 `about:` 或讀不到時切換帳戶：不送公鑰，tabId 仍留在原 origin | 可測 | 無 |
| 分頁關閉或 `left-web`：每個 origin 拿掉該 tabId，origin 列還在 | 可測 | 無 |
| 手驗：斷線通知不送到已離開該 origin 的分頁 | 可測 | 無。斷線函式的重入已寫進契約（H2） |
| 在 `wallet/` 執行 esbuild 與 `node --test`；兩個 `.mjs` 跑完刪除 | 命令已可複製 | `connection-tabs.test.ts` 尚未存在，屬本版要新增的檔，不升 HIGH |
| `cd wallet && npm run typecheck && npm run build` | 可測 | 已定案寫明 typecheck 不涵蓋 `*.test.ts` |

## 與現碼抽樣

工作區裡 Track 1 的插入拒絕已經長成提案的形狀。Track 2 仍是「列出的 tab 都送」，也還沒有 `tabs.onUpdated`／`tabs.onRemoved`，寫入也還沒收成一條鏈。尚未接上的部分不升 HIGH。

| 錨點 | 現碼 | 與提案 |
|------|------|--------|
| `pending/pending.ts` | `addPending` 在 id 不合格或已存在時回 `false`，不改記錄、不叫 hook。`pendingInsertError` 區分兩個錯誤碼。`setPendingUiHost` 只改已存在記錄的 `uiHost`。上限 80 | 與 Track 1 同向 |
| `handlers/dapp-handlers.ts` | `presentDappApproval` 在 await 之前 `addPending`；失敗直接回 `pendingInsertError`，不排程逾時、不開 popout。成功後才排程；側欄失敗再把 `uiHost` 設回 popout 並 `openPopout` | 與 HOW 同向 |
| `wallet/commands/send-command.ts` | pending id 仍是 `crypto.randomUUID()`（0.12.0）。插入失敗時錯誤碼寫死 `REQUEST_ID_IN_USE`，沒有呼叫 `pendingInsertError` | 契約已要求改走 `pendingInsertError`。UUID 不會落到不合格 id。尚未改是實作 |
| `messaging/origin-notify.ts` | 三個送出函式仍對列出的 tabId `sendMessage`，不看目前網址。`align` 呼叫 `notifyAccountChanged`；`removeConnectionAndNotify` 與 `disconnectAllConnections` 呼叫 `notifyDisconnected` | 契約已要求送出前用 `classifyTabUrl`，並在占住鏈的步驟內把通知做完（H2）。尚未改是實作 |
| `wallet/commands/account/account-records.ts` | `handleSetActiveAccount` 與 `handleDeleteAccount` 仍直接 `writeConnections`，然後通知 | 契約已把這兩處列入鏈（M4）。尚未改是實作 |
| `messaging/connection-tabs.ts` | 倉庫尚無此檔 | 本版新增 |
| `background/index.ts` | `bootServiceWorker` 只在 service worker 全域時註冊。每筆 command 會 `await alignConnectionsToActiveAccount()`。沒有 `tabs.onUpdated`／`tabs.onRemoved` | 提案把兩個分頁監聽掛在這裡。`manifest.config.ts` 已有 `tabs` 與 `<all_urls>`，不必加權限 |
| `content/content-script.ts` | 收到 `airwave-bridge-account-changed` 就把 `publicKeyBase58` `postMessage` 給該文件的 origin | 提案改的是送出端 |

0.36.0 的 CU 契約與本版錨點不重疊。0.27.0 的核准前 origin 檢查與 `frameId` 都還在；`sendBridgeResult` 本版不改。0.27.0「對齊 accountId 時不改 `tabIds`」的收窄已寫進本版「不自動改掛」（L3）。帳戶變更與斷線的 `sendMessage` 仍只對 `connections` 裡的 tab，再按目前網址篩。

全倉庫對 `connections` 的 `writeConnections` 仍只在 `origin-notify.ts`（align、`rememberConnectedTab`、`removeConnectionAndNotify`、`disconnectAllConnections`）與 `account-records.ts`（切換帳戶、刪帳戶）。設定變更與聚合主鑰變更會呼叫通知、本身不寫這張 map；送出前若拿掉 tabId，已由鏈上的「通知路徑拿掉 tabId」涵蓋。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉 | INDEX「帳戶通知與斷線」「分頁關閉」「簽章回傳」；HOW「送出前再查」；reasoning「連線分頁」；HANDOFF 核心段 |
| H2 | HIGH | 關閉 | INDEX「連線寫入鏈」；HOW「何時寫回 storage」；reasoning「連線分頁」；HANDOFF 核心段與 paste-ready |
| M1 | MEDIUM | 關閉 | INDEX「連線寫入鏈」；HOW「何時寫回 storage」；reasoning「連線分頁」 |
| M2 | MEDIUM | 關閉 | INDEX 驗收的 esbuild 整段；已定案「窄測不是整包指令」 |
| M3 | MEDIUM | 關閉 | INDEX 驗收各對應句 |
| M4 | MEDIUM | 關閉 | INDEX「連線寫入鏈」；HOW「何時寫回 storage」；reasoning「連線分頁」；HANDOFF paste-ready |
| L1 | LOW | 關閉 | INDEX「換了 http(s) origin」「離開網頁」 |
| L2 | LOW | 關閉 | INDEX「待批只插入」；reasoning 末段 |
| L3 | LOW | 關閉 | INDEX「不自動改掛」；HOW「何時寫回 storage」末句 |
| L4 | LOW | 關閉 | INDEX 三句「手驗：」；HANDOFF 完成檢查 |
| L5 | LOW | 仍開（非阻擋） | 建議：INDEX「同一 origin 只改 path…仍送到該分頁」標成手驗 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-12 | 有未關閉 H1。提案可行，審查門檻不通過。M1–M3 應修。L1、L2 非阻擋 |
| 第 2 輪複審 | 2026-10-12 | H1、M1、M2、M3、L1、L2 已寫進契約，關閉。新 HIGH：H2 寫入鏈重入未寫死，斷線與帳戶對齊會卡死。M4 應修。L3、L4 非阻擋。待拍板為空。提案可行，審查門檻不通過 |
| 第 3 輪複審 | 2026-10-12 | H2、M4、L3、L4 已寫進契約，關閉。無未關閉 HIGH，無應修 MEDIUM。新 L5 非阻擋。待拍板為空。提案可行，審查門檻通過。不可行：否 |
