# Implementation review — 0.8.0 Airwave Wallet

- **日期：** R1 2026-10-03（Asia/Hong_Kong）
- **輪次：** R1（初審）
- **角色：** 實作審查（不改程式、不加功能、不 commit）
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`change-password-how.md`](./change-password-how.md)；[`reasoning.md`](./reasoning.md)；[`../HANDOFF.md`](../HANDOFF.md)；架構禁區見 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **現行程式：** working tree（未 commit）；變更檔見 git `status`／`diff`；不以 chat history 為準

---

## 總評

0.8.0 主體（`wallet.changeVaultPassword`、vault 寫入佇列、session salt 門檻、Settings 四列樞紐、類 B／類 C 秘密欄）與 INDEX／HOW **靜態對齊良好**；**`cd wallet && npm run build` 與 `npm run typecheck` 均通過**。**無未關閉 HIGH**。改密成功／舊密失效／鎖定 UI／Settings 行為等 INDEX 項多需 **Chrome 手驗**；本輪未載入擴充做端對端。

---

## Findings

### HIGH

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| — | （無） | — | R1 靜態＋建置未發現違反已定案或 GUIDELINES 架構禁區之阻擋項 | — |

### MEDIUM

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| M1 | 改密與 Settings 樞紐未做瀏覽器手驗 | **開啟** | 成功改密、舊密 `unlock` 失敗、錯密不寫 vault、鎖定無改密表單、網路／RPC／API keys 互動等，本輪僅靜態碼＋建置；GUIDELINES 要求 UI 改動以未封裝擴充走驗收。 | 出貨前依下方手驗清單在 Chrome 執行並在下一輪更新證據欄。 |
| M2 | 版本號仍為 0.7.0 | **開啟** | `wallet/package.json` 為 `0.7.0`；INDEX 狀態 `in progress`，非出貨阻擋，但與 0.8.0 契約不一致。 | 使用者同意出貨時同步 `version.md`／changelog／`package.json` → `0.8.0`。 |

### LOW

| ID | 標題 | 狀態 | 說明 |
|----|------|------|------|
| L1 | `design-principles.md` 第 9 節字面與類 B 衝突 | **關閉** | reasoning 已載明本版 INDEX **覆寫**「錢包密碼可用 `type=password`」；程式已改類 B。第 9 節正文未改屬文件負債，不升級。 |
| L2 | 同批 tree 含 roadmap／backlog 鏈結 | **開啟** | `docs/roadmap/0.8.0/`（含本檔）為 untracked；`README.md`、`backlog/INDEX.md` 等已改。審查以 INDEX 正文為準。 | 出貨時一併 commit 契約檔與程式。 |
| L3 | 無針對改密的自動化測試 | **開啟** | INDEX Track 1 僅要求 `typecheck`；改密與串行佇列無單測。非契約硬需求。 | 可選：日後在 INDEX 寫明測試指令後再補。 |

---

## R1 重點對照（INDEX／HOW／禁區）

| 檢查項 | 結論 | 靜態證據 |
|--------|------|----------|
| `wallet.changeVaultPassword` typed command | **符合** | [`commands.ts`](../../../../wallet/src/shared/commands.ts)；[`index.ts`](../../../../wallet/src/background/index.ts) L726–793 |
| 須已解鎖；仍 `decryptVault(currentPassword)` | **符合** | `session.isUnlocked()` 後才改密；成功路徑先 `decryptVault` 再 `encryptVault` |
| 錯誤碼 `WALLET_LOCKED`／`VAULT_MISSING`／`INVALID_PASSWORD`／`WEAK_PASSWORD` | **符合** | SW 分支與 HOW 表一致；`newPassword.length < 8` 不 trim |
| 成功：新 salt → `session.remove` → 寫 vault → `setVaultCrypto`＋`loadSecrets` → `persistUnlockedSession` | **符合** | L772–778；`encryptVault` 每次新 salt（[`crypto-vault.ts`](../../../../wallet/src/shared/crypto-vault.ts)） |
| 寫 vault 前失敗不寫金庫 | **符合** | 解密／弱密碼在 `writeVaultBlob` 之前 return |
| 不進 pending Map | **符合** | 直接 `respond`；未 `pendingRequests.set` |
| vault 寫入串行 | **符合** | [`vault-write-queue.ts`](../../../../wallet/src/background/vault-write-queue.ts)；`changeVaultPassword`／`createVault`／`persistVaultFromSession` 皆 `runVaultWrite` |
| session salt ≠ vault salt → 丟 session、禁止用該 key 寫 vault | **符合** | [`session.ts`](../../../../wallet/src/background/session.ts) hydrate；[`persistVaultFromSession`](../../../../wallet/src/background/index.ts) L82–84 |
| 類 B：四處 `type="text"`＋`wallet-pwd-masked`；無 `type="password"`／`current-password`／`new-password` | **符合** | `popup/index.html`；`hardenWalletPasswordInput`；`wallet/` grep 無 `type="password"` |
| Settings 四列樞紐；子頁 Back 回樞紐 | **符合** | `screen-settings`＋四 `settings-*`；`handleShellBack` L1761–1767 |
| 網路兩列 radio；非 seg tab | **符合** | `settings-network` 兩 `network-pick-row`；HTML 無 settings seg |
| RPC 兩卡同屏 | **符合** | `screen-settings-rpc` devnet＋mainnet 卡 |
| API keys 標籤與 `••••••` 遮罩 | **符合** | Helius API URL／Jupiter API key；`MASKED_SECRET_DISPLAY` |
| 鎖定時無改密 UI | **符合** | `render`：`isLocked` 時 `el.shell.hidden`，僅解鎖屏 |
| popout 無改密 UI | **符合** | [`popout/index.html`](../../../../wallet/src/popout/index.html) 僅審批 |
| 無新 local storage key | **符合** | [`storage-keys.ts`](../../../../wallet/src/shared/storage-keys.ts) 未增欄 |
| Pending／廣播／custody 禁區 | **符合** | 未改 pending 主模型；密碼不 persist；extension page only |

---

## 驗收對照（INDEX 出貨 checklist）

證據：**建置／靜態碼**；標 **需手驗** 者本審查未在 Chrome 執行。

| 驗收項 | 結果 | 證據 |
|--------|------|------|
| 正確改密 → 新 salt、保持解鎖、舊密無法 unlock | **需手驗** | SW 路徑靜態符合 HOW；未實測 storage／unlock |
| 錯目前密碼 →「密碼錯誤」、vault／session 不變 | **靜態通過**／**需手驗** | SW `INVALID_PASSWORD`＋popup 文案；未實測 blob |
| 新密碼 &lt; 8 打到 SW → `WEAK_PASSWORD`、不寫 vault | **靜態通過** | SW L740–746；UI 亦先擋不送 |
| 無 vault → `VAULT_MISSING` | **靜態通過** | SW L748–755 |
| 鎖定無改密表單；command → `WALLET_LOCKED` | **靜態通過**／**需手驗** | UI shell 隱藏；SW L728–734 |
| 無「忘記密碼」 | **靜態通過** | popup grep 無 forgot／忘記 |
| 建庫、解鎖、Reveal、改密類 B | **靜態通過** | 見上表 |
| 四列樞紐；Helius／Jupiter 不在第一層明文；Menu Settings → 樞紐；子頁 Back 回樞紐 | **靜態通過**／**需手驗** | `data-nav="settings"` → `navigateTo("settings")` |
| popout 無改密、不處理 command | **靜態通過** | popout 無 sender；無改密 UI |
| 網路兩列單選、立刻 patch | **靜態通過**／**需手驗** | `patchSettingsPartial({ cluster })` on change |
| RPC 兩卡同屏 | **靜態通過** | HTML 結構 |
| API keys 標籤、遮罩、Reveal 不需錢包密碼 | **靜態通過**／**需手驗** | `renderSettingsKeysFields` |
| vault 寫入與改密同一串行 | **靜態通過** | `runVaultWrite` 共用佇列 |
| `cd wallet && npm run build` | **通過** | 見測試記錄 |
| 文件與程式無真實密碼／key | **靜態通過** | 本輪 diff／roadmap 抽樣無真實秘密 |

### Track 對照

| Track | 靜態是否具備 | 備註 |
|-------|----------------|------|
| 1 SW 改密 | **是** | typecheck 通過 |
| 2 類 B 密碼欄 | **是** | 四處 harden |
| 3 Settings 樞紐＋改密頁 | **是** | build 通過 |

---

## 測試記錄

| 輪次 | 指令 | cwd | 結果 |
|------|------|-----|------|
| R1 | `npm run build` | `wallet/` | **通過**（`tsc --noEmit && vite build`，exit 0） |
| R1 | `npm run typecheck` | `wallet/` | **通過**（`tsc --noEmit`，exit 0） |
| R1 | Chrome 載入 `wallet/dist`、INDEX 改密／Settings 手驗 | — | **未執行** |

### 需瀏覽器手驗（對 INDEX 驗收）

1. 已解鎖：Settings → 錢包密碼 → 變更密碼；新密碼 ≥8；成功後仍可操作帳戶；關 popup 再開仍解鎖；用**舊**密碼解鎖應失敗、新密碼可解鎖（勿把真實密碼寫進報告）。
2. 錯目前密碼：應顯示「密碼錯誤」；DevTools Application 中 vault ciphertext 與改前相同（可比對前後 hash 或擴充 storage 檢視，勿記錄密文內容於報告）。
3. 鎖定狀態：僅見解鎖屏，無 Settings 改密路徑；若手動送 `wallet.changeVaultPassword`（僅除錯）應得 `WALLET_LOCKED`。
4. Settings 第一層僅四列摘要；進 API keys 見 `••••••` 與 Reveal；第一層不出現完整 Helius／Jupiter 值。
5. 網路切 Devnet／Mainnet 立即反映；RPC 頁同時見兩卡；子頁 Back 回樞紐而非 Home。
6. 建庫／解鎖欄位 DOM：`type="text"`（非 password）；可目視打碼樣式。

隱私：本報告未寫入助記詞、私鑰、密碼、真實地址或生產 API key。

---

## 修復追蹤

| ID | R1 後動作 |
|----|-----------|
| M1 | 待手驗；通過後標 **關閉** 並註明日期 |
| M2 | 出貨時與 INDEX `shipped` 一併處理 |
| L2 | commit 時一併納入 |
| L3 | 可維持開啟或列入 backlog |

---

## Working tree 摘要（R1）

已修改：`wallet/src/background/index.ts`、`session.ts`、`popup/index.html`、`main.ts`、`style.css`、`shared/commands.ts`；新增 `wallet/src/background/vault-write-queue.ts`。Roadmap：`docs/roadmap/0.8.0/`（untracked）、`docs/roadmap/README.md`、`backlog/*` 鏈結更新。未改 `../solibra-wallet`。
