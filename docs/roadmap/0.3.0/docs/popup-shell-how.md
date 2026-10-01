# HOW — Popup 方案 A 殼與 Token 列（0.3.0）

繼承 [0.2.0 accounts-home-how](../../0.2.0/docs/accounts-home-how.md) 的帳戶 commands、RPC 查詢、delete／read-only 規則。本檔寫 **UI 畫面**、**列表顯示覆寫**、**Reveal 增量**。

視覺對齊 [`docs/design-demos/wallet-030-ui-concepts.html`](../../../design-demos/wallet-030-ui-concepts.html) 方案 A；衝突時以 **INDEX + 本檔** 為準。

## 畫面（popup 內，非多 HTML）

建議以單一 `index.html` + 顯示狀態機（名稱可不同，語意須齊）：

| 狀態 | 頂欄 | 底欄 Token／Activity Tab |
|------|------|---------------------------|
| `setup`／`locked`／late create vault | 簡化或無方案 A widget | 無 |
| `home-token`／`home-activity` | widget + **Lock** + Menu | **有**（僅這兩態） |
| `accounts`、`add-account`、`account-rename`、`account-manage`、`account-reveal-key`、`settings`、`connected-sites` | Back + 標題 + Menu | 無 |

Back：Reveal → Manage；Rename／Manage → Accounts；Add → Accounts；Settings／Connected／Accounts → **一律** `home-token`（**不**記住進入前的 Activity tab）。

## Menu

- 錨在頂欄右；dropdown 在按鈕下方，**不要** `position:fixed` 蓋住整個作業系統桌面。
- Overlay 點擊關閉。
- **Wallet accounts** → `accounts`
- **Settings** → `settings`
- **Connected sites** → `connected-sites`（0.2.0 `#connected-panel` 能力）
- **Lock wallet** icon（僅 Home 頂欄，hamburger **左側**）→ `wallet.lock`，進入鎖定屏。**不**放在 Menu 列表。

## Mini wallet widget

- 顯示 **active** 帳戶 `label`；無 active 時隱藏 Home 資產區（沿用 0.2.0 空態）。
- 複製：`navigator.clipboard.writeText(publicKeyBase58)`（完整公鑰，不是縮寫）。
- 點名稱／avatar 區（不含複製鈕）→ `accounts`。

## Token 列正規化（本版資料契約；0.4.0 必須沿用欄位）

查詢與 0.2.0 相同（popup、`Connection(settings.rpcUrl)`、只 legacy Token program）。組裝後：

```ts
type HomeTokenRow = {
  id: string; // "native-sol" 或 mint base58
  symbol: string; // "SOL" 或 mint 縮寫
  uiAmountLabel: string; // 給人看的數量（含單位可選）
  usdLabel: string; // 本版常數 "—"
  iconLetter: string; // 1–2 字佔位，不使用 http(s) 圖
};
```

規則（強制）：

1. 先建 SOL 列：`uiAmount = lamports / 1e9`，**即使為 0 也留下**。
2. 每個 SPL parsed account：`uiAmount === 0` 或 amount 為 0 → **丟棄**。
3. 其餘 SPL **依 mint 加總** `uiAmount`（實作可用最小單位整數加總再格式化）；同一 mint **一列**，`id`＝該 mint。加總後為 0 → 不畫。
4. 加總後的 SPL 列接在 SOL 之後。
5. `usdLabel` **永遠** `"—"`（本版）。
6. 失敗：錯誤字串；保留上一輪成功列或清空+錯誤皆可，但 **不可白屏**。loading 必有。

**不要**把資產寫入 `chrome.storage`。

## 對未來 Combined 的兼容（本版仍只有單地址 Home）

不要實作 combined，但避免單地址寫死到無法加總：

- `HomeTokenRow.id`：SPL 用 **mint**，SOL 用 `"native-sol"`，以便日後依 id 合併數量。
- 把「一個 owner 的 RPC 結果 → `HomeTokenRow[]`」做成可呼叫的純函式，不要把 `getBalance` 和 DOM 寫成無法複用的一坨。
- 本版 `AccountKind` 仍只有 `"signing" | "readOnly"`。讀到未知 `kind`：**不當 signing**（無 Reveal、刪除不碰 vault secret）。
- Home 仍只跟 **active 的單一公鑰**；不要做多地址 UI。

## Accounts 頁

- 列出全部 `accounts`；active／read-only 可見標記。
- 點卡片主區：`wallet.setActiveAccount`。
- rename icon → `account-rename`（預填該 `accountId`）。
- ⋮ → `account-manage`。
- Add icon → `add-account`。

### Add account

三個互斥選項，對應既有 command：

- Generate → `wallet.generateAccount`
- Import private key → `wallet.importAccount`
- Read-only → `wallet.addReadOnlyAccount`

成功後回到 `accounts`。

### Manage

- Reveal 列：**僅** `kind === "signing"`。
- Remove：確認對話後 `wallet.deleteAccount`；成功回 `accounts` 或 Home（若已無帳戶）。

## Reveal（custody）

新 command **名稱鎖定為** `wallet.exportAccountSecret`（須加入 `commands.ts` 聯集）：

| | |
|--|--|
| 誰可呼叫 | **僅擴充頁**（popup）。content **不得**轉發。SW 對非擴充 origin 回既有 `FORBIDDEN`（與 0.1.0 `isExtensionPage` 相同閘門） |
| Payload | `{ accountId: string, password: string }` |
| 成功 | `{ secretBase58: string }`（與 vault 內存、匯入時相同編碼：base58 私鑰 bytes） |
| 失敗 | 無此帳戶／read-only → `ACCOUNT_READ_ONLY` 或 `ACCOUNT_NOT_FOUND`；session 鎖定 → **`WALLET_LOCKED`**（先於用密碼解密）；密碼錯 → 既有 unlock 同類錯誤（如 `INVALID_PASSWORD`）；無 vault → 既有碼 |

導航：Manage 的 Reveal 列只在 **session 已解鎖** 時可進 `account-reveal-key`。鎖定中按 Lock 或已鎖定再開 popup → **只** `#locked`，無法直達 Reveal。

SW：session **鎖定**時本 command **一律失敗**（既有 `WALLET_LOCKED`），**即使** payload 密碼能解開 vault blob（先 Unlock 不是只擋 UI）。session **已解鎖**時：用 `password` **再解密** vault blob（避免已解鎖 popup 被借走一鍵匯出）。比對 `accountId` 為 signing 且 secrets 有值後回傳。回傳後 **不要**把 secret 寫 storage。**不要**因本 command 成功而呼叫等同 `wallet.unlock` 的副作用；**不要**因密碼錯而 `lock`。

Popup：揭示前遮罩；成功後顯示 + 複製；`Back`、切畫面、關 popup → 變數與 DOM 文字節點清掉。此為對 0.2.0「私鑰永不進 popup」的覆寫，範圍僅該頁 RAM 與使用者主動複製。

**禁止**在 HOW／INDEX／changelog 寫真實密鑰。測試只用開發者自己的測試錢包，文件只用虛構描述。

## Settings

沿用 `storage.patchSettings`：`cluster`、`rpcUrl`。無新欄位。

## 與 0.2.0 HOW 的覆寫

- 0.2.0「零餘額仍列出」對 **SPL 作廢**；對 **SOL 保留**（0 也列）。
- 0.2.0 帳戶操作擠在 `#accounts-panel` 改為本檔整頁流程；**command 契約不改**（除 `wallet.exportAccountSecret` 新增）。
- 0.2.0「鎖定仍可看 Home 資產」**作廢**：鎖定只顯示 `#locked`。
- 0.2.0「私鑰永不進 popup」**僅 Reveal 成功路徑覆寫**（RAM／剪貼簿）；其餘路徑仍禁止。
