# HOW — 帳戶生命週期與首頁資產（0.2.0）

繼承 [0.1.0 storage-custody-how](../../0.1.0/docs/storage-custody-how.md)；本檔只寫**增量**與覆寫點。

## AccountMeta（覆寫）

```ts
type AccountKind = "signing" | "readOnly";

type AccountMeta = {
  id: string;
  label: string;
  publicKeyBase58: string;
  kind: AccountKind; // 缺省或舊資料 → 視為 "signing"
};
```

- Storage key 仍為 `airwave.accounts.v1`。
- **signing：** vault `secrets[accountId]` 必有對應私鑰。
- **readOnly：** **禁止**在 vault 存 secret。

## Connections schema（覆寫 0.1.0 文件表）

現碼與本版 disconnect 依賴（明示覆寫 0.1.0 storage HOW 未列 `tabIds` 的過時表）：

```ts
type ConnectionRecord = {
  accountId: string; // connect 批准當下寫入的帳戶 id；切帳不更新此欄
  connectedAt: number;
  tabIds: number[];
};
```

刪帳戶時比對的是此 **`accountId` 欄位**，不是「當前 activeAccountId」。

## Command 前置條件

| Command | 無 vault／尚未 createVault | Vault 鎖定 | Vault 已解鎖 |
|---------|---------------------------|------------|--------------|
| `wallet.renameAccount` | 若 accounts 有該 id → **允許**（只改 meta） | **允許** | **允許** |
| `wallet.addReadOnlyAccount` | **允許**（只寫 meta；可在設密碼前加觀察地址） | **允許** | **允許** |
| `wallet.deleteAccount`（readOnly） | **允許** | **允許** | **允許** |
| `wallet.deleteAccount`（signing） | `ACCOUNT_NOT_FOUND` 或無此 kind | **`WALLET_LOCKED`** | **允許**（重寫 vault） |
| `wallet.generateAccount`／`importAccount` | 依 0.1.0（通常需已有 vault／解鎖） | 依 0.1.0 | 依 0.1.0 |

## 新／擴充 SW commands

| Command | Payload（示意） | 行為 |
|---------|-----------------|------|
| `wallet.renameAccount` | `{ accountId, label }` | trim；空字串 → `INVALID_LABEL` |
| `wallet.deleteAccount` | `{ accountId }` | 見「刪除」 |
| `wallet.addReadOnlyAccount` | `{ publicKeyBase58, label? }` | 公鑰無法解析 → **`INVALID_PUBLIC_KEY`**；若任一既有帳戶（不論 kind）`publicKeyBase58` 相同 → **`ACCOUNT_EXISTS`**；否則建 `kind:"readOnly"` |
| `wallet.generateAccount`／`importAccount` | 既有 | 新帳戶必須 `kind:"signing"`；匯入／生成時若公鑰已存在 → **`ACCOUNT_EXISTS`** |

`wallet.getState` 回傳 accounts 含 `kind`。

## 刪除（`wallet.deleteAccount`）

**先檢查、後寫入**（任一步失敗則 **不**改 accounts／vault／connections／active）：

1. 不存在 → `ACCOUNT_NOT_FOUND`（無副作用）。
2. 若 `kind === "signing"` 且 vault **鎖定** → **立即** `WALLET_LOCKED`（無副作用）。
3. 通過後再依序寫入：自 accounts 移除 →（signing）自 secrets 刪 key 並重加密 vault → 凡 `connections[origin].accountId === 被刪 id` 刪 origin 並對其 `tabIds` 發 `airwave-bridge-disconnected` → 若刪的是 active：尚有帳戶則 `activeAccountId = accounts[0].id` 並對**仍連線** origins 推 `account-changed`，否則清 active。

## Read-only 與簽名

### 拒簽優先序（SW，建 pending 前）

處理 `dapp.signMessage`／`dapp.signTransaction` 時固定順序：

1. 無 active 帳戶 → 既有錯誤碼（與 0.1.0 一致，如 `NO_ACCOUNT`）。
2. active.`kind === "readOnly"` → **`ACCOUNT_READ_ONLY`**（**先於** `WALLET_LOCKED`）。
3. vault 鎖定 → `WALLET_LOCKED`。
4. signMessage 釣魚 heuristic（0.1.0）。
5. 否則建 pending／popout。

Connect：read-only active **允許**，回傳該公鑰。

### Wallet Standard 帳戶 features（本版定案）

inject 帳戶物件上的 `features` **維持與 0.1.0 相同**（仍列出 signMessage／signTransaction）。read-only 拒簽僅靠上列 **runtime error**，本版不因 kind 動態剝除帳戶 features（避免適配器快取差異；後版可再收斂）。

### `ui.resolvePending` 防禦

若 popout 仍對某 sign pending 送 `approve`，SW 在簽名前再次檢查 active：若 `readOnly` → **不簽名**，以 `ACCOUNT_READ_ONLY` 回原 tab 並刪 pending（防競態／誤開）。

## 首頁資產（Popup）

### 可見性（對齊 INDEX）

- 只要 storage／state 有 **active 公鑰**，Home 只讀區即可顯示（**鎖定或已解鎖皆可**）。
- 無 active 帳戶時顯示空態（提示先建立／匯入／加 read-only）。

### 查詢（popup 直連 RPC）

本版 **只查 legacy SPL Token program**（不查 Token-2022）：

```ts
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const conn = new Connection(settings.rpcUrl, "confirmed");
const pk = new PublicKey(active.publicKeyBase58);
const lamports = await conn.getBalance(pk);
const tokenAccounts = await conn.getParsedTokenAccountsByOwner(pk, {
  programId: TOKEN_PROGRAM_ID,
});
```

顯示：同一 **Tokens** 列表；**第一列固定為 SOL**（`lamports / 1e9`，視同 native token）；其後為 legacy SPL token 帳戶（mint 縮寫、uiAmount／amount+decimals）。零餘額仍列出。不呼叫 Jupiter。

RPC 失敗：主區錯誤字串；不白屏。Active／rpcUrl 變更或「重新整理」→ 重抓。

資產數字**不**寫入 `chrome.storage`。

## `createVault` 與既有 accounts（覆寫 0.1.0 行為）

0.1.0 現碼 `createVault` 可能 `writeAccounts([新 signing])` 覆寫整表。本版定案 **(A)**：

- `wallet.createVault`（或等價 onboarding）在寫入第一個 signing 帳戶時，**必須保留** storage 中既有 `accounts` 條目（含先前 `addReadOnlyAccount` 的 read-only），以 **append**（或 merge by id）方式加入新 signing meta，**禁止**用單元素陣列覆寫抹掉觀察帳戶。
- 若新 signing 公鑰與既有任一帳戶相同 → `ACCOUNT_EXISTS`，且不建立 vault／不抹 accounts。

## 明確不做

- Sidebar、助記詞、Token-2022 列表、代幣 logo／法幣報價
