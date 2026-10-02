# 0.6.0 — 助記詞匯入＋產生新錢包／Burner

- **狀態：** `in progress`
- **上游版本：** [0.5.0](../0.5.0/INDEX.md)
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **概念稿：** [`docs/design-demos/add-account-ux.html`](../../design-demos/add-account-ux.html)、[`docs/design-demos/generate-wallet-ux.html`](../../design-demos/generate-wallet-ux.html)（非正式契約；衝突以本 INDEX／HOW 為準）
- **畫面：** [`docs/design-principles.md`](../../design-principles.md)

## 產品句

使用者可在已解鎖、**保險庫已於安裝時建立** 的前提下：（1）用 **英文 BIP39 助記詞（12 或 24 詞）** 匯入簽名帳戶（選路徑、預覽 index 0–19 公鑰、挑一列）；（2）**產生新錢包**：一次顯示 12 詞與地址後即無法再看助記詞；（3）**Burner**：隨機密鑰、不顯示助記詞，之後仍可 Reveal。不支援非英文詞表、不把助記詞寫入 storage。

## 文件地圖

1. 本檔
2. [docs/seed-import-how.md](./docs/seed-import-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.1.0 storage-custody-how](../0.1.0/docs/storage-custody-how.md)（vault／session）、[0.2.0 accounts-home-how](../0.2.0/docs/accounts-home-how.md)（`importAccount` 寫 signing）
5. [HANDOFF.md](./HANDOFF.md)
6. 視覺：[add-account-ux.html](../../design-demos/add-account-ux.html)、[generate-wallet-ux.html](../../design-demos/generate-wallet-ux.html)

## 已定案

| 題 | 決定 |
|----|------|
| Vault | 假設安裝後已 `createVault`。產生／匯入／觀察頁**不**再索保險庫密碼。助記詞匯入須 `session` 已解鎖，否則 `WALLET_LOCKED` |
| 詞表 | **僅** BIP39 English。正規化：trim、空白切開、小寫。詞數必須為 **12 或 24** 且 `validateMnemonic` 通過，否則 `INVALID_MNEMONIC` |
| 助記詞生命 | 只在 popup 該流程記憶體，以及 SW **該次 command payload**。**禁止**寫 `chrome.storage.local`／`session`、禁止 log／changelog。離開助記詞流程（Back 到匯入方法、關掉 popup）必須清 popup 記憶體 |
| 方案 | UI **三選一**：`phantom`＝`m/44'/501'/{n}'/0'`（標準；Phantom／Solflare／多數擴充）；`cli`＝`m/44'/501'/{n}'`（CLI／Ledger）；`custom`＝使用者字串，**必須含字面 `{n}`**。少見 path（含原 `change` 模板 `m/44'/501'/0'/{n}'`）由 **自訂** 輸入。SW 仍接受 `pathKind:"change"`（相容），但 **不提供** Change 按鈕。自訂無效 → `INVALID_PATH`。預設 `pathKind`＝**`phantom`** |

| 預覽 | `wallet.previewSeedAccounts`：僅本地衍生 index **0–19** 公鑰；**不**打 RPC、**不**顯示餘額 |
| 挑選 | 使用者必須選一列 index。`wallet.importSeedAccount` 帶同一助記詞＋方案＋index，寫入 vault **對齊既有** `importAccount`：`kind:"signing"`；公鑰已在 signing／read-only → `ACCOUNT_EXISTS`；省略 `label` 則 `Imported ${既有帳戶數 + 1}`；**不**呼叫 `setActiveAccount`（active 維持匯入前） |
| UI | Add → 匯入錢包 → 助記詞。兩屏：① 詞格預設 **12** 格；可貼完整 12／24 詞一次填滿（空白切開、小寫）；已填滿 12 格後再繼續輸入則擴成 24 格。殼底「下一步」僅已填格數為 12 或 24 時可點。② **三顆**方案鈕：標準＝`phantom`、CLI／Ledger＝`cli`、自訂＝`custom`。自訂 path **初始與重置**＝`m/44'/501'/{n}'/0'`（含字面 `{n}`）。單行 path 模板（`{n}` 不替換）＋20 列（`#n`、前4…後4）。殼底「匯入」未選列或忙碌則 disabled。主鈕 **flex 貼殼底**。切方案或自訂 path 失焦則重跑預覽。錯誤短句在當屏；`INVALID_PATH` 列清空 |

| 依賴 | 允許 `@scure/bip39`（詞表／seed）與 `ed25519-hd-key`（SLIP-0010）。禁止再加錢包 SDK。理由：Web Crypto 無 BIP39／ed25519-HD |
| 密鑰匯入 | 本版不改語意：仍 base58 或 `[bytes]` JSON |
| 產生新錢包 | 進入「建立助記詞錢包」時 popup 產生英文 BIP39 **12** 詞並顯示（phantom index 0 公鑰）；**尚未**寫 vault。殼底「建立」才 `importSeedAccount`（`pathKind:"phantom"`、`index:0`）。省略名稱＝`Account ${寫入前帳戶數+1}`。不改 active。助記詞不進 storage／log |
| 產生 UI | Add **建立助記詞錢包**／**建立 Burner 錢包**。助記詞錢包**單屏**：名稱選填＋一句「離開後無法再顯示助記詞」＋唯讀 12 格（**每列 3 詞**）＋地址前4…後4（複製全文）。殼底「建立」。Back 回 Add、不寫入、清詞。之後 Reveal 只出私鑰 |
| Burner | 既有 `wallet.generateAccount` 隨機 Keypair，不顯示助記詞。成功短地址＋完成。Manage 可 Reveal |

## 非目標

- 產生 24 詞、多詞表、passphrase（第 25 詞）、備份 quiz
- 一次匯入多個 index
- 預覽餘額／SPL／USD（預覽僅公鑰）
- 把現行 0.7.0 持倉改版做進本版
- Combined／觀察的助記詞路徑

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.5.0 | 0.6.0 |
|-------|--------|
| 匯入僅私鑰；助記詞為非目標；產生＝隨機密鑰 | 助記詞匯入＋產生 12 詞一次備份＋Burner 分列 |
| Add 匯入可為單頁密鑰；產生一項 | 匯入先選助記詞／密鑰；Add 產生拆新錢包／Burner |

## 實作 Track

### Track 1 — 衍生與 SW commands

- **做：** path／Keypair 純函式；`previewSeedAccounts`、`importSeedAccount`（預覽不打 RPC）。
- **不做：** popup 兩屏精修以外的視覺。
- **驗收：** 無效助記詞／無效自訂 path 有穩定錯誤碼；同一公鑰再匯入 `ACCOUNT_EXISTS`。

### Track 2 — Popup 兩屏

- **做：** 詞格＋下一步；選方案＋20 列＋匯入；Back；清記憶體；dock 規則。
- **驗收：** 見下方 checklist；`cd wallet && npm run build`。

### Track 3 — 產生新錢包／Burner

- **做：** `generateSeedAccount`；Add 拆兩項；備份屏；Burner 沿用 `generateAccount`。
- **不做：** 24 詞產生、quiz。
- **驗收：** 產生後 Accounts 有 signing；助記詞不進 storage；Burner 無詞格、可 Reveal。

## 驗收（出貨 checklist）

- [ ] 12 或 24 英文有效助記詞可預覽 20 列（公鑰前4後4）
- [ ] 切 phantom／cli 列公鑰會變
- [ ] 自訂無 `{n}` → 短錯誤、不匯入
- [ ] 選一列匯入後 Accounts 出現 signing；vault 可簽
- [ ] 建立助記詞錢包：同一屏見名稱＋12 詞（每列 3）＋地址；建立後列表有 signing；抽 storage 無助記詞
- [ ] Burner：無 12 詞；Manage 可 Reveal
- [ ] 助記詞不進 storage（抽 `airwave.vault` 以外無助記詞字串）
- [ ] 主按鈕貼殼底
- [ ] `cd wallet && npm run build`

## 手驗指令

```text
cd wallet && npm run build
# 清擴充資料 → 設密碼 → 匯入錢包 → 助記詞
# 填測試用（文件外、勿寫進 repo）12 詞 → 下一步 → 切方案看列變化 → 選一列匯入
# Add → 建立助記詞錢包（名稱與 12 詞同屏）→ 建立
# Add → 建立 Burner 錢包 → 產生 → Manage Reveal
# 密鑰匯入仍可用 base58 或 [bytes]
```

## 錨點

| 路徑 | 用途 |
|------|------|
| `wallet/src/shared/commands.ts` | preview／import／generate seed commands |
| `wallet/src/shared/seed-derive.ts` | path 與 Keypair |
| `wallet/src/background/index.ts` | commands、getBalance |
| `wallet/src/popup/` | 兩屏 UI |
