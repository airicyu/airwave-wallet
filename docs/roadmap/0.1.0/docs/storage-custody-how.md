# HOW — Storage、settings、custody

## Storage keys（`chrome.storage.local`）

| Key | 內容 | 誰寫 |
|-----|------|------|
| `airwave.settings.v1` | cluster、rpcUrl、locale 等明文設定 | SW（popup 經 command） |
| `airwave.accounts.v1` | 帳戶 meta：`{ id, label, publicKeyBase58 }[]`（本版無 read-only 帳戶） | SW |
| `airwave.activeAccountId.v1` | 字串 id | SW |
| `airwave.connections.v1` | `{ [origin: string]: { accountId, connectedAt } }` | SW |
| `airwave.vault.v1` | 加密 vault blob（見下） | SW |

**禁止**把 pending 請求、解鎖密碼明文、未加密私鑰寫入上述 keys。

## 解鎖 session（`chrome.storage.session`）

| Key | 內容 | 誰寫 |
|-----|------|------|
| `airwave.unlocked.session.v1` | 工作 AES 金鑰（raw base64）＋ salt ＋已解密 `secrets` map | **僅 SW** |

- **不**存密碼。密碼只在 `unlock`／`createVault`／Reveal 當下進入 SW，用完即丟。
- 僅 `chrome.storage.session`：關瀏覽器／結束瀏覽器工作階段即清。**禁止**寫入 `local`。
- inject／content script **禁止**讀此 key。
- SW 被回收後，下一個 command 先從此 hydrate 記憶體；`unlocked` 維持到 `wallet.lock` 或瀏覽器工作階段結束。
- Reveal／`exportAccountSecret` 仍須再送密碼，對 `airwave.vault.v1` 驗一次；不靠 session 當匯出授權。

## Vault（password-boxed）

- 安裝後 **第一次** 設密碼即 `createVault`（可為空 secrets）。之後產生／匯入／觀察 **假設 vault 已存在**，不再中途建保險庫。
- 使用者設定／輸入 **密碼**（無 hardcode 預設密碼）。
- 私鑰以 **PBKDF2**（或 Web Crypto 同等 KDF）+ **AES-GCM** 加密後存入 `airwave.vault.v1`。
- 結構示意：

```ts
type VaultBlob = {
  version: 1;
  kdf: "pbkdf2-sha256";
  kdfParams: { salt: string; iterations: number };
  cipher: "aes-gcm";
  /** 單一 AES-GCM blob：解密後為 JSON `{ secrets: Record<accountId, base58Secret> }`（64-byte secret key 的 base58） */
  ciphertext: string; // base64
};
```

帳戶 **公鑰／label** 存在 `airwave.accounts.v1`（明文 meta）；**私钥** 僅在 `ciphertext` 內。新增／匯入帳戶時 SW 讀取解密 → 更新 secrets map → 重新加密寫回 `airwave.vault.v1`。

- **解鎖後**：解密後的 `Keypair` 存在 SW 記憶體；工作金鑰另鏡到 `chrome.storage.session`（見上）。`wallet.lock` 同時清記憶體與 session。SW 回收**不必**重新打密碼（與舊句「回收後須重新解鎖」不同）。
- **簽名**：僅 SW 在 unlock 狀態下呼叫；popout／popup／inject 不接 secret bytes。

## UI 鏡像（popup）

- popup 啟動：`chrome.storage.local.get` 讀 meta + settings 初值。
- 訂閱 `chrome.storage.onChanged` 更新 UI；**不**手寫 cross-runtime Zustand rehydrate 總線。
- 需改 settings／帳戶：送 typed command 給 SW，由 SW 寫 storage 並成為真相。

## 帳戶操作（0.1.0）

- **生成**：SW 隨機 keypair → 加密寫 vault → 更新 accounts meta。
- **匯入私钥**：popup 輸入 base58 secret → 僅經 `sendMessage` 給 SW 一次 → SW 加密後不落盤明文。
- **切換**：更新 `activeAccountId`；推送已連線 tab（message-flow HOW）。
- **本版不做**：read-only 帳戶、rename、delete（可留 UI stub disabled 或不做入口）。

## Cluster / RPC

- `settings.cluster`: `"devnet" | "mainnet"`
- `settings.rpcUrl`: 字串；預設 devnet 公開 RPC（寫死在預設 settings 常數，非 secret）。
- 任何需要 RPC 的路徑（餘額查詢若做、test-web 無關）須 `new Connection(settings.rpcUrl)`。

## Vault 鎖定態（dApp 路徑）

| 操作 | 鎖定 | 已解鎖 |
|------|------|--------|
| `dapp.connect`（新 origin） | 允許；回傳 storage 內 **active 帳戶公鑰**（不需 secret） | 同左 |
| `dapp.signMessage` | **拒絕** `WALLET_LOCKED` | 簽名 |
| `dapp.signTransaction` | **拒絕** `WALLET_LOCKED` | 簽名 |

手驗預期：簽名類操作前須於 **popup** 解鎖；popout **不**提供解鎖表單（本版）。

## signMessage 釣魚 heuristic（SW）

在 SW 處理 `dapp.signMessage` 時、建立 popout 前：

- 若 `payload` 為 `Uint8Array`／base64 解碼後長度 ≥ 80 bytes，且前 1–2 bytes 符合 Solana **versioned transaction** 常見開頭（例如 `0x80` 族），**拒絕** `SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`。
- 邊界：短訊息、純文字 UTF-8 不受影響；heuristic 誤判時使用者可回報，後版可調整。
