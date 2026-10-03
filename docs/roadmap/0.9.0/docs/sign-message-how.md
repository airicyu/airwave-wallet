# HOW — 0.9.0 簽署訊息審批

上游生命週期：[0.1.0 message-flow-how](../../0.1.0/docs/message-flow-how.md)。本檔只寫 **增量**。INDEX 衝突以 INDEX 為準。

## 不改的契約

- pending 只在 SW 記憶體；popout query 只有 `requestId`
- `dapp.signMessage` payload `{ message: number[] }`；批准成功仍 `nacl.sign.detached`，結果經 `airwave-bridge-result` 只回原 `tabId`
- inject **不**持有私鑰；UI 批准才簽
- 不宣告新的 Wallet Standard 方法

## `dapp.signMessage` 閘門（相對 0.8.0）

| 條件 | 行為 |
|------|------|
| 無作用中帳戶 | 立刻失敗 `NO_ACCOUNT`，不 pending |
| 作用中為唯讀／不能簽 | 立刻失敗 `ACCOUNT_READ_ONLY`，不 pending |
| vault 鎖定 | **仍** `addPending`＋`openPopout`（不要立刻 `WALLET_LOCKED`）。鎖定時仍以帳戶 **meta** 判斷能否簽（`resolvePubkey` 在 secrets 缺席時對 `kind: signing` 仍為 signing） |
| bytes 像交易 message | **仍** pending＋開窗（不要立刻 `SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`） |

Enqueue 時寫入該筆 pending（僅記憶體，可擴 `PendingRecord`）：

- `signAccountId`：當時 `activeAccountId`（須為可簽名帳戶，否則應已早退）
- `messageLooksLikeTx`：下列判定函式之結果

`connect`／`dapp.signTransaction` 的 `signGateError`（含鎖定立刻失敗）**維持 0.8.0**。`ui.getPending` 的 `result` 帶完整 pending（含上述兩欄），讓 popout 畫短句／disabled **只信** `messageLooksLikeTx`。

## 交易 message 判定（SW 唯一權威）

單一函式放 `wallet/src/shared/`（例如 `sign-message-tx.ts`）。SW enqueue、`finishSignMessage`、關窗 **import 同一函式**。popout **不要**用自己的 parse 決定是否短句。

對 `Uint8Array` bytes：

1. 試 `VersionedMessage.deserialize(bytes)`；成功則 `serialize()`，若 `byteLength === bytes.length` → true。
2. 否則試 `Message.from(bytes)`；成功則 `serialize()`，若 `byteLength === bytes.length` → true。
3. 丟錯或長度不等 → false（當一般訊息）。

禁止把「長度 ≥ 80 且首字節 0x80／0x81」當最終條件。

結束路徑若重算與 pending 旗標不同：以**重算**決定是否簽名／錯誤碼，並視為實作 bug（同一函式同一 bytes 時不應發生）。

## 結束 pending 時的 dApp 錯誤碼

在 `finishSignMessage`、`chrome.windows.onRemoved`（以及既有 timeout 若仍刪 pending）讀 **同一判定函式**：

| 情況 | `ok` | code |
|------|------|------|
| 一般訊息、使用者拒絕或關窗 | false | `USER_REJECTED`（關窗可用既有 message `Approval window closed`） |
| 交易 message、拒絕或關窗或誤送 approve | false | `SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`（message：`Message looks like a transaction`） |
| 一般訊息、approve 且已解鎖且凍結帳戶仍可簽 | true | 對 **`signAccountId`** 取 key（不要改用當下 active） |
| 一般訊息、approve 但凍結帳戶不可簽 | false | `NO_KEY` 或 `ACCOUNT_READ_ONLY` |
| 一般訊息、approve 但仍鎖定 | false | `WALLET_LOCKED`（不簽） |
| 逾時 | false | 既有 `TIMEOUT`（交易 message 亦用 TIMEOUT，不當交易碼） |

`ui.resolvePending` 在 `decision === "approve"` 且判定為交易 message 時：**不得**呼叫 `nacl.sign`；對 dApp 回交易錯誤碼後刪 pending。

## popout 資料

1. 無 `requestId` 或 `ui.getPending` 失敗 → 標題「審批」；主體「請求已不在」；兩鈕 disabled；不畫解鎖。
2. `getPending.kind !== "signMessage"` → 走 0.8.0 舊版面（本版不改其 DOM 語意）。
3. `kind === "signMessage"`：另呼 `wallet.getState`（擴充頁已允許）。
   - `unlocked === false` → 解鎖全屏（無頂欄、無 dock）。若期間 popup 解鎖：`chrome.storage.onChanged`（既有 session／足以推斷已解鎖的 key）或輪詢 `getState`；一旦 `unlocked` 則進入簽署殼，**不做** 700ms hold。
   - 本窗按解鎖成功 → 簽署殼＋700ms 批准 disabled。
4. 帳戶 widget：用 pending.`signAccountId` 在 `getState.accounts` 找 meta；找不到則顯示失敗短句，**不可**改顯示 active。複製該帳戶完整 Base58。不可點 widget 切帳戶。
5. origin：pending.origin，單行 ellipsis。
6. 主體分支：**若 `messageLooksLikeTx`** → 只短句，無文字／hex 卡。否則再做 UTF-8 vs hex（規則見 INDEX）。

解鎖：`wallet.unlock({ password })`；類 B 欄與 popup 相同 harden。失敗短句（既有「密碼錯誤」類，**不要**回顯輸入）。成功清空欄。

UTF-8／hex 分類只在 popout 做展示且僅當 `messageLooksLikeTx === false`。hex 複製值＝連續小寫 `[0-9a-f]`，不含 `0x`、不含空白。

批准中：點批准後兩鈕皆不可再送（拒絕可在批准請求發出前仍可按；一旦 `resolve` 進行中則皆 disabled）。文案「批准中」可選。

殼底（簽署頁，非鎖定）：左拒絕（ghost，約 38% 寬）、右批准（primary、`flex:1`）。`messageLooksLikeTx` 時批准 `disabled`。鎖定頁 **display:none 整列 dock**。

視窗尺寸維持既有 `chrome.windows.create`（約 420×640）；內容按 popup 密度排，不必改 width 契約。

## 焦點 CSS

```css
input:not([type="radio"]):not([type="checkbox"]):not([type="range"]):not([type="file"]):not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):focus,
input:not([type="radio"]):not([type="checkbox"]):not([type="range"]):not([type="file"]):not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):focus-visible,
textarea:focus,
textarea:focus-visible {
  outline: none;
  border-color: var(--accent);
}
```

套在 `wallet/src/popup/style.css` 與 `wallet/src/popout/style.css`。`.unlock-screen input` 同樣。radio 繼續用現有尺寸重置，禁止 `display:block; width:100%`。

## Popup 鎖定屏

`#locked.unlock-screen`：`flex:1`；直欄；`justify-content: center`；padding 16px；input 全寬 `--fill`、stroke 邊、radius-sm；focus 如上；`.primary-btn` margin-top 12px。無 `.shell` 頂欄。

## test-web

- 既有 sign message：UTF-8 字串
- 新增：`Uint8Array` 非 UTF-8（含高位元組，fatal decode 失敗或含 NUL／C0）
- 新增：構造 **legacy 或 v0 `Message`／`VersionedMessage` 序列化且無多餘尾部** 的 bytes，當 `signMessage` 送出（不是 `signTransaction`）

按鈕標籤繁中短語即可（「簽 UTF-8」「簽二進位」「簽交易當訊息」）。不要在頁面貼真實金鑰。
