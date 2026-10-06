# 0.17.0 — `signAndSendTransaction` HOW

產品語意以 [INDEX](../INDEX.md) 為準。本檔寫訊息欄位、enqueue、批准後時序、與 `signTransaction`／`walletSend` 的分流。

## inject

`airwaveWallet.features[SolanaSignAndSendTransaction]`：

- `version: "1.0.0"`
- `supportedTransactionVersions: [0, "legacy"]`（與 `SolanaSignTransaction` 相同）
- `signAndSendTransaction: async (...inputs) => { ... }`

每筆 input：`account`、`transaction`（`Uint8Array`）、`chain`（string）、可選 `options`（**忽略**）。

`bridgeRequest("dapp.signAndSendTransaction", { transaction: Array.from(input.transaction), chain: input.chain })`。

`bridge-client.ts`：當 `command === "dapp.signAndSendTransaction"` 時 timer 用 `PENDING_TIMEOUT_MS + 60_000`（180_000ms）；其它命令維持 `120_000`。content 對 `{ pending: true }` 仍不 resolve。

成功：`{ signature: number[] }` → `{ signature: Uint8Array.from(...) }`。

`accountFromPublicKey` 的 `features` 陣列必須含 `SolanaSignMessage`、`SolanaSignTransaction`、`SolanaSignAndSendTransaction`。

多筆 input：**for 迴圈串行**，與現有 `signTransaction` 相同，不可 `Promise.all` 搶同一個 popout。

## content

`PAGE_COMMANDS` 增加 `"dapp.signAndSendTransaction"`。仍核對 `event.origin`；結果不廣播。

## SW enqueue（`dapp.signAndSendTransaction`）

1. 與 `dapp.signTransaction` 同一套 `signMessageEnqueueGateError`（鎖定不當成立刻失敗）。
2. 無 active 帳戶 → `NO_ACCOUNT`，不開窗。
3. 唯讀／不能簽 → 既有 read-only 錯，不開窗。
4. `chain` 必須是 `solana:devnet` 或 `solana:mainnet`，且等於目前 Settings cluster；否則 `INVALID_CHAIN`／`CHAIN_MISMATCH`，不開窗。`solana:mainnet-beta`、`solana:testnet`、`solana:localnet` 視為非上列二字 → `INVALID_CHAIN`。
5. `addPending`：`kind: "signAndSendTransaction"`，`uiHost: "popout"`，`signAccountId`＝當時 active（`PendingRecord.signAccountId` 註解含本 kind），`payload: { transaction: number[], chain }`（可新增 `SignAndSendTransactionPayload` 型別），`tabId`／`origin` 與現有 dApp 請求相同。`sendBridgeResult` 只傳 `tabId`（沿用 0.1.0 top-frame）。
6. `schedulePendingTimeout`；`openPopout(requestId)`。批准前逾時對 dApp `TIMEOUT`（與 `signTransaction` 相同）。
7. 對 content 回 `{ pending: true }`。

## 審批殼

`isSignTxKind` 必須包含 `signTransaction`、`walletSend`、**`signAndSendTransaction`**。模擬／CU／明細走同一 `renderSignShell`。本 kind 的 `workingTx`／Compute Budget **完整**抄 [0.11.0 sign-tx-budget-how](../../0.11.0/docs/sign-tx-budget-how.md)：未簽可寫；已有非零簽名則不改 ix。

`ui.simulatePendingTx`：`kind` 允許 `signTransaction`｜`walletSend`｜`signAndSendTransaction`。

殼內三閘（漏改會變成批准即關或 hold 0s；**禁止**本 kind 落入 `closeHost()` 預設支）：

| 位置 | 本 kind 必須 |
|------|----------------|
| `resolve()` 點批准且即將／已得 `{ accepted: true }` | 與 `walletSend` 一樣先／後 `enterWalletSendConfirming`；**不要**走到函式末 `closeHost()` |
| `runtimeMessageListener` settled `ok: true` | 與 `walletSend` 一樣 `enterWalletSendConfirmedPage`；**不要** else `closeHost()` |
| `isSignTxKind` | 含本 kind，否則模擬／CU 殼不畫 |
| `armExpiry`／`expiryTimer` | 進入確認中**立刻** `clearTimeout`；確認等待、確認失敗還原、已確認頁**禁止** `showGone`。過期頁只服務批准前 |

`resolve()` 分流：

| kind | 批准成功 | 拒絕 |
|------|----------|------|
| `signTransaction` | `finishSignTransaction` 簽完即 bridge `signedTransaction`；`closeHost()` | 既有 finish＋`USER_REJECTED` |
| `walletSend` | `{ accepted: true }`；confirming；不關 popup；拒絕只 settled、**不** bridge dApp | 既有 `finishWalletSendUserAbort` |
| `signAndSendTransaction` | `{ accepted: true }`；`cancelPendingTimeout`；**不要** `unbindPopoutByRequest`；confirming；**不要** `closeHost()` | 無 `broadcastSig` → `sendBridgeResult` `USER_REJECTED` 並結束 pending；有 sig → `BROADCAST_UNCONFIRMED`。**禁止**只呼叫 `finishWalletSendUserAbort` |

確認失敗：`restoreWalletSendReviewAfterError` 適用本 kind。

settled `ok: true`：`enterWalletSendConfirmedPage` → 1000ms → `onWalletSendSuccessExit` → popout `window.close`。

## 批准後 SW（建議共用 `runWalletSendAfterApprove`）

把 `pending.kind !== "walletSend"` 的早退改成允許 `signAndSendTransaction`。批准時 `cancelPendingTimeout`。**禁止** `unbindPopoutByRequest`（對齊 walletSend：在 unbind 之前就 return `{ accepted: true }`）。交易 bytes：`getWorkingTx() ?? payload.transaction`。簽 `signAccountId` 對應 keypair。`sendRawTransaction`＋`broadcastSig`＋60s `getSignatureStatuses`。60s 失敗或 `val.err`：**只** `notify.progress`，pending 留下（可再批；有 sig 不重送）。

成功（本 kind 與 walletSend 的差異）：

1. 先 `sendBridgeResult`（僅 `signAndSendTransaction`）`{ signature: number[] }`。walletSend **永不** `sendBridgeResult`。
2. `removePending`、清 send state。
3. `notify.settled(requestId, true, undefined, sigBase58)`。

`signature` 陣列：把 base58 簽名字串 decode 成 64 bytes 再 `Array.from`。禁止把 tx 序列化整段當成 signature。

## 關窗／abort

`chrome.windows.onRemoved`：

- `getPending` 空 → **return**（成功路徑已 `removePending`、1s 後關窗不得補發 `USER_REJECTED`）
- `walletSend`：維持既有 `finishWalletSendWindowClosed`（不 bridge dApp）
- `signAndSendTransaction`：有 `broadcastSig` → 結束 pending、bridge `BROADCAST_UNCONFIRMED`、可發 settled `ok: false`；無 sig → bridge `USER_REJECTED`（關窗 message 可 `"Approval window closed"`）。**禁止**落到「其餘 kind」只當 `signTransaction` 關窗
- 其餘 dApp kind：維持 takePending + USER_REJECTED（signMessage 的 looks-like-tx 例外不變）

`ui.abortPending`：本 kind 必須能 bridge（現碼只處理 walletSend 不夠）。有 `broadcastSig` → `BROADCAST_UNCONFIRMED`；無 sig → `USER_REJECTED`。冪等仍 `{ ok: true }`。

確認等待中 pending 被拿掉則停止輪詢（現有 `waitConfirmOnly` 早退）。

批准後 **不會**再觸發 `PENDING_TIMEOUT_MS` 對 dApp 結束（已 cancel）。不要把 60s 確認失敗當成 dApp `BROADCAST_UNCONFIRMED`。

## test-web

按鈕 **signAndSendTransaction**：`wallet.features[SolanaSignAndSendTransaction]` 存在則組 0 lamport 自轉 VersionedTransaction，`chain: "solana:devnet"`（頁面仍綁 DEVNET_RPC；錢包 Settings＝mainnet 時應 `CHAIN_MISMATCH`、不開窗）。log 成功 signature（不要再寫 Unexpected）。

按鈕 **Sign and send transaction**：維持 `signTransaction` + `connection.sendRawTransaction`。

不要刪「預期模擬失敗」的 `signTransaction` 鈕。
