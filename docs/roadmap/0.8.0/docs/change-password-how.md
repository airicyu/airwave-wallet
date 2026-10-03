# HOW — 變更錢包密碼與 Settings 樞紐（0.8.0）

繼承 [0.1.0 storage-custody-how](../../0.1.0/docs/storage-custody-how.md)：`airwave.vault.v1` 仍是 PBKDF2-SHA256 + AES-GCM、`version: 1`。Session 仍只存工作 AES raw + salt + secrets map，**不存密碼**。本檔只寫增量。

## Command

`wallet.changeVaultPassword`

Payload（僅 extension page → SW）：

```ts
{ currentPassword: string; newPassword: string }
```

成功 `result`：`{ ok: true }`（或等價空物件）。失敗 `error.code`：

| code | 何時 |
|------|------|
| `WALLET_LOCKED` | `ensureHydrated` 後仍未解鎖 |
| `VAULT_MISSING` | local 無合法 vault blob |
| `INVALID_PASSWORD` | `decryptVault` 拋錯（含空目前密碼） |
| `WEAK_PASSWORD` | `newPassword.length < 8`（不 trim） |
| `UNKNOWN` | 未預期失敗；仍不得寫一半 vault |

popup 兩次新密碼不一致：**不要**送 command，畫面短句即可。

## SW 步驟（成功）

1. 確認已解鎖。
2. `readVaultBlob` → `decryptVault(currentPassword, blob)`；失敗則停。
3. 以解密得到的 `secrets` 呼叫 `encryptVault(newPassword, secrets)`，**先只留在記憶體**（新 salt；`newPassword` **不** trim）。尚未寫 local。
4. `chrome.storage.session.remove` 舊 `airwave.unlocked.session.v1`。從此刻起到步驟 6 完成：禁止 `persistUnlockedSession`、禁止 `encryptVaultWithKey` 寫 vault。
5. 寫 `airwave.vault.v1`（步驟 3 的新 blob）。
6. **立刻** `setVaultCrypto(newKey, newSalt)`、`loadSecrets(secrets)`。
7. `persistUnlockedSession()`。失敗不回滾 local vault；記憶體已是新 key 則 command 仍可 `ok: true`；session 空則回收後用新密碼 unlock。
8. 丟棄 payload 內密碼字串。

`decryptVault` 的 `secrets` 為準寫回。

**Salt 門檻：** `ensureHydrated` 與任何「用 session 工作金鑰寫回 vault」：若 session `saltB64` ≠ 目前 vault `kdfParams.salt`，刪該 session、視為未解鎖、禁止用該 key 寫 vault。

畫面錯誤：目前密碼錯＝「密碼錯誤」；過短＝「新密碼過短」。`error.message` 與畫面都**禁止**附上使用者密碼。

## Vault 寫入串行

`createVault`、匯入／產生帳戶、刪帳戶、改密凡寫 `airwave.vault.v1` 者，進入同一 async 佇列（可新增小模組或沿用現有若已有）。後到的等先到的結束。

## UI 導航（popup）

現況 `#view-settings` 單頁改為：

- `settings-hub`：四列
- `settings-network`／`settings-rpc`／`settings-keys`／`settings-password`

頂欄：子頁 Back 回樞紐（不是直接回 Home）。Home 齒輪仍進樞紐。

網路列摘要：`Mainnet` 或 `Devnet`。RPC 列摘要：目前 `settings.rpcUrl`（單行 ellipsis）。API keys：兩欄皆非空＝「已設定」；僅一欄＝「部分設定」；皆空＝「未設定」。錢包密碼列摘要：「變更」。

## 類 B 實作要點

共用函式設定：`type="text"`、`-webkit-text-security: disc`、`autocomplete="off"`、`data-lpignore`、`data-1p-ignore`、`data-form-type="other"`、`aria-autocomplete="none"`、focus 前 `readOnly` 再放開。`id` 不要用 `password` 單字當 name。

現況 `index.html` 的 `setup-password`、`unlock-password`、`reveal-password` 一併改。Jupiter／Helius 走類 C：有值遮罩 `••••••`，不要 `type=password`。

## 與設定寫入

cluster、RPC radio／加刪：立刻 `storage.patchSettings`。Helius／Jupiter：確認圖示或 blur，禁止整頁 Save。改密：僅殼底主按鈕打 `changeVaultPassword`。
