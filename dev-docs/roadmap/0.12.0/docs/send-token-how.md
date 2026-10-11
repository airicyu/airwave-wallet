# HOW — 0.12.0 詳情與錢包送出

INDEX 衝突以 INDEX 為準。簽署模擬／CU 以 [0.11.0 sign-tx-budget-how](../../0.11.0/docs/sign-tx-budget-how.md) 與 [0.10.0 sign-transaction-how](../../0.10.0/docs/sign-transaction-how.md) 為準，本檔只寫差異。

## 不改

- dApp `signTransaction`：批准只 `tx.sign`，回 `signedTransaction` 給原 tab，**不** send
- pending 只在 SW；popout query 只有 `requestId`
- 不宣告 Wallet Standard 新方法
- 持倉列 CSS／欄位順序不重做；只加點擊與列資料欄

## 持倉列資料

`HomeTokenRow` 新增：

- `decimals: number`（整數；原生 SOL＝9）
- `tokenProgram?: "spl-token" | "token-2022"`（僅非 `native-sol`）

查詢管線寫入這兩欄。popup 詳情與 `wallet.beginSend` 都信 SW 列，不在 UI 猜 program。

## Popup 畫面

1. **home-token：** 卡 `button` 或列 click → `token-detail`，記住 `tokenId`。展開成員鈕不進詳情。
2. **token-detail：** 見 INDEX。Back 回 home-token。
3. **token-send：** 數量／地址。確認 → `wallet.beginSend`。無效時殼底 disabled。
4. 收到 `ui.walletSendSettled` 且 `ok` → `home-token`＋`getHomeTokens`。`ok: false` 且使用者拒絕 → 留在 token-send；鏈上失敗由 popout 顯示，popup 不必跳頁。

數量／地址 focus：`--accent` 邊框，`outline: none`。

## `wallet.beginSend`

呼叫者：popup。須已解鎖、目前帳戶 `kind === "signing"`。

SW：

1. 解析 `recipient`：有效 Ed25519 公鑰 32 bytes。失敗 `INVALID_ADDRESS`。
2. 列上缺 `decimals`，或 SPL 缺 `tokenProgram` → `INVALID_PAYLOAD`（不猜）。`amountUi` 只允許 `^\d+(\.\d+)?$` 且小數位 ≤ `decimals`。轉最小單位：整數字串＋小數補到 `decimals` 位後拼接，再 `BigInt`。禁止 `Number`／`parseFloat`／`10 ** n`。`0` 或解析失敗 → `INVALID_PAYLOAD`。
3. 再查鏈上餘額（SOL `getBalance`；SPL 該 mint＋`tokenProgram` 的 token account amount）。不足 → `INSUFFICIENT_FUNDS`。SOL 轉出須 ≥ 轉出＋預留費。若本筆會建 ATA：送出者 SOL 另須夠租金（再加 native 轉出額與預留費，視是否同時轉 SOL）。
4. SPL：來源 token account 必須屬於該 `tokenProgram`；無 → `INSUFFICIENT_FUNDS`。目的 ATA 沒有則加 Associated Token Program 建立指令（token program id＝該列；payer＝送出者）。轉帳 **TransferChecked**。
5. `getLatestBlockhash`。組 **未簽** message：payer＝送出者。**不要**插入 Compute Budget。可把 `lastValidBlockHeight` 只放 SW 記憶體。
6. `addPending`：`kind: "walletSend"`，`origin: "airwave:wallet"`，`signAccountId`＝目前簽名列，`payload: { transaction: number[] }`。
7. `openPopout(requestId)`。回 `{ requestId }`。

逾時（尚未進入送出）：取消 pending，`ui.walletSendSettled` `{ ok: false }`，**禁止** `sendBridgeResult`。進入送出後取消該筆 `PENDING_TIMEOUT_MS`。

## Popout

`ui.getPending`／簽署殼／模擬／交易費／明細：`walletSend` 與 `signTransaction` **同一分枝**（標題「簽署交易」）。站點「Airwave」。

`ui.simulatePendingTx`：`kind` 為 `signTransaction` **或** `walletSend`；其餘 `NOT_FOUND`。

`ui.resolvePending`（`walletSend` **不得** `unbindPopoutByRequest`，直到 settled 關窗或拒絕／逾時結束）：


| kind | 批准 |
|------|------|
| `signTransaction` | `finishSignTransaction`＋橋回 dApp（0.11.0）；popout 可關 |
| `walletSend` | **禁止** `finishSignTransaction`／`sendBridgeResult`。命令**立刻** `{ accepted: true }`。popout **不** `window.close`，改「確認中／送出中」。SW 背景簽名；記住 `broadcastSig`；`sendRawTransaction`（`skipPreflight: false`）→ `confirmTransaction`／同等，commitment `confirmed`，上限 60s → 再 500ms → 關窗 → `settled` `ok: true` |

已有 `broadcastSig`：再批准只重等 `confirmed`，不第二次 send、不重組、不換 blockhash。

確認／送出失敗：pending 仍在；`chrome.runtime.sendMessage` `ui.walletSendProgress` `{ requestId, error: string }`（僅擴充頁）。popout 聽此命令畫短錯誤，批准可再按（規則同上）。成功不發 progress，只 settled。

拒絕／關窗：結束 pending；`settled` `ok: false`；已有 `broadcastSig` 不撤回。`windows.onRemoved` 對 `walletSend` 同樣不走橋。

## 通知

`ui.walletSendSettled` 用 `chrome.runtime.sendMessage`（擴充頁）。inject／content **不**聽此命令。禁止 `tabs.sendMessage` 廣播。
