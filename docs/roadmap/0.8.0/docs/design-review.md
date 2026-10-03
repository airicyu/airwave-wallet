# Design review — 0.8.0 Airwave Wallet

- 日期：2026-10-03（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**（累加；初審題旨保留）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收（**現稿**）；[`change-password-how.md`](./change-password-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 上游（行為仍有效；本版增量／明文覆寫者除外）：[`../../0.7.0/INDEX.md`](../../0.7.0/INDEX.md)（持倉／settings 欄位語意不變）、[`../../0.1.0/docs/storage-custody-how.md`](../../0.1.0/docs/storage-custody-how.md)（vault／session；本版加 `wallet.changeVaultPassword`，不改 KDF／blob `version`）
- 相關 backlog：[`../../backlog/change-wallet-password.md`](../../backlog/change-wallet-password.md)（構想備份，**不是**本版契約）；[`../../backlog/INDEX.md`](../../backlog/INDEX.md) 該列已鏈 0.8.0
- 畫面背景（非正式）：[`docs/design-principles.md`](../../../design-principles.md) 第 8 節；INDEX 點名的研究筆記 [`docs/research/secret-field-autofill.md`](../../../research/secret-field-autofill.md)（衝突以 INDEX／HOW 為準）
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/src/shared/commands.ts`、`wallet/src/shared/crypto-vault.ts`、`wallet/src/background/index.ts`、`wallet/src/background/session.ts`、`wallet/src/background/storage-io.ts`、`wallet/src/shared/storage-keys.ts`、`wallet/src/popup/index.html`、`wallet/src/popup/main.ts`、`wallet/src/inject/wallet.ts`（現碼未實作本版 ≠ 設計 HIGH）
- **總評：** 提案整體可行，待拍板為空。初審與第 2 輪未關閉項 **H2／M3 本輪關閉**（已寫進現 INDEX／HOW；reasoning／HANDOFF 同向）。**無未關閉 HIGH。** 同意的 MEDIUM 皆已關閉。**設計門檻通過。** 不是整份不可行。本檔不是已定案。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF（L 可寫在 reasoning）；仍開＝契約仍分叉或缺口；非阻擋＝記錄即可。穩定 ID 勿重編。可新增 ID。

`brainstorm/` 本版 INDEX 未點名當契約；`../solibra-wallet` 未當已定案。概念稿與研究筆記衝突處，INDEX 已寫以 INDEX／HOW 為準。

### HIGH

#### H1 — session persist 失敗後舊 session 仍可 hydrate — **關閉**

**初審題旨：** `persistUnlockedSession` 只 `set`、失敗不清舊 blob；`ensureHydrated` 會載回舊工作金鑰，再經 `persistVaultFromSession` 把已換成新密碼的 local blob 蓋回。

**核對（延續第 2 輪）：** 現稿已改成 **先** `session.remove` **再**寫 vault，persist 失敗時舊 session 已不在。見 H2 關閉說明。不重開本號。

#### H2 — 先寫 vault 再刪 session：中途回收仍可用舊金鑰蓋回新 blob — **關閉**

**第 2 輪題旨：** 當時 INDEX／HOW 仍是先寫 vault 再 `session.remove`；SW 在兩者之間被殺會留下「local 新密文 + session 舊 key」，後續 `persistVaultFromSession` 可蓋回舊密碼可解。關閉須寫死「先 remove 再寫 vault」或「salt 不一致丟 session」。

**本輪核對（現 INDEX／HOW）：** 兩條皆已落檔，不是擇一殘缺。

1. INDEX「成功路徑」：記憶體 `encryptVault` 後 **先** `chrome.storage.session.remove` 舊 `airwave.unlocked.session.v1`，**再**寫 `airwave.vault.v1`，立刻換記憶體，再 `persistUnlockedSession`。INDEX「寫入順序」明文禁止「local 已是新密文、session 仍是舊 key」的持久組合，並寫死必須先刪 session 再寫 vault。HOW SW 步驟 4→5 同序。失敗列：`remove` 後、寫 vault 前被殺 → session 空、local 仍舊密文，用**舊**密碼 `unlock`。
2. INDEX「寫入順序」另：hydrate／任何「用 session 工作金鑰寫回 vault」之路，若 session `saltB64` 與 local vault `kdfParams.salt` 不一致 → 丟棄該 session、禁止用該 key 寫 vault。HOW「Salt 門檻」同句，綁在 `ensureHydrated` 與該寫回路徑。

reasoning「為何先刪舊 session 再寫 vault」與 HANDOFF starter 已摘要同序與 salt 門檻。不得只靠「command 正常跑完」的窗口已由契約覆蓋。現碼 `hydrateFromSessionStore`／`persistVaultFromSession` **尚未**做 salt 核對——屬實作落差，不重開本號。

### MEDIUM

#### M1 — 新密碼 trim 與實際加密字串未對齊 — **關閉**

INDEX「最短長度」現為原字串 `length >= 8`（**不** trim），`encryptVault`／之後 `unlock` 用同一原字串。HOW：`WEAK_PASSWORD` 為 `newPassword.length < 8`（不 trim）；步驟 3 明文不 trim。reasoning、HANDOFF starter 同向。與現 popup 建庫 `password.length < 8` 對齊。

#### M2 — 出貨驗收未覆蓋已定案失敗／導航分支 — **關閉**

INDEX 驗收已補：`WEAK_PASSWORD`、`VAULT_MISSING`、vault 寫入串行（靜態即可）、Home 齒輪進樞紐、子頁 Back 回樞紐、popout 無改密表單且不處理該 command。session persist 失敗與 SW 中途被殺未獨立成出貨勾項；不變量已在「寫入順序」與失敗列——不必造 `chrome.storage.session.set` 失敗或殺 SW 手驗。視為關閉。

#### M3 — remove 與換新 key 之間未禁止把舊工作金鑰寫回 session — **關閉**

**第 2 輪題旨：** `remove` 後、`setVaultCrypto`／`loadSecrets` 前記憶體仍是舊 key；契約未禁止其間 `persistUnlockedSession`。

**本輪核對：** INDEX「寫入順序」：自 `remove` 起到記憶體已是新 key 為止，**禁止** `persistUnlockedSession`、**禁止**用舊 key 做 `encryptVaultWithKey` 寫 vault。HOW 步驟 4 起至步驟 6 完成：禁止 `persistUnlockedSession`、禁止 `encryptVaultWithKey` 寫 vault。已關閉。

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉** | reasoning「畫面原則」：本版類 B **覆寫** `design-principles.md` 第 9 節「錢包密碼可用 `type=password`」。INDEX 類 B 仍為準。第 9 節正文未改屬文件負債，不升級。 |
| L2 | **關閉** | HOW 已用 `readVaultBlob`，與錨點一致。 |
| L3 | **關閉** | HOW 畫面錯誤：目前密碼錯＝「密碼錯誤」；過短＝「新密碼過短」；禁止附上使用者密碼。INDEX 驗收「密碼錯誤」同向。 |

本輪無新增 ID。

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 已解鎖、正確目前密碼、新密碼原字串 ≥8 且兩欄相同 → 新 salt；保持解鎖；舊密碼無法 `unlock` | 是 | 無（中途回收已由先 remove＋salt 門檻覆蓋；手驗不必殺 SW） |
| 錯誤目前密碼 →「密碼錯誤」、金庫與 session 不變 | 是 | 無 |
| 新密碼 < 8 打到 SW → `WEAK_PASSWORD`、不寫 vault | 是 | 無 |
| 無 vault → `VAULT_MISSING` | 是 | 無 |
| 鎖定無改密表單；command → `WALLET_LOCKED` | 是 | 無 |
| 無「忘記密碼」 | 是 | 非目標已寫 |
| 建庫、解鎖、Reveal、改密皆非 `type="password"`，無 `current-password`／`new-password` | 是 | DP 第 9 節字面仍舊；以 INDEX／reasoning 為準（L1 關閉） |
| Settings 第一層四列；Helius／Jupiter 不在第一層；齒輪進樞紐；Back 回樞紐 | 是 | 無 |
| popout 無改密、不處理 `changeVaultPassword` | 是 | 無 |
| 網路兩列單選，非 seg；切 cluster 立刻生效 | 是 | 無 |
| RPC 頁兩卡同時可見 | 是 | 無 |
| API keys 標籤、`••••••`、Reveal 不需錢包密碼 | 是 | 無 |
| vault 寫入與改密同一串行（靜態） | 是 | 無 |
| `cd wallet && npm run build` | 是 | 無 |
| 文件與程式無真實密碼／key | 是 | 抽樣未見 |

## 與現碼抽樣

現碼**尚未**有 `wallet.changeVaultPassword`、Settings 樞紐、類 B 欄。下表不一致是實作落差，**不**升成設計 HIGH。H2／M3 所指路徑仍存在於現碼，實作須依**現**契約改寫，不是本輪設計缺口。

| 錨點 | 與提案 | 說明 |
|------|--------|------|
| `commands.ts` | 未實作 | 無 `wallet.changeVaultPassword`。既有 wallet／ui command 僅 extension page；dApp 結果走指定 `tabId`，非預設廣播。 |
| `crypto-vault.ts` | 不互斥 | `encryptVault` 每次新 16-byte salt、PBKDF2 310000、AES-GCM、`version: 1`。`encryptVaultWithKey` 沿用舊 salt——改密不得走它（reasoning 已否決）。 |
| `background/index.ts` | 未實作＋須加佇列 | `persistVaultFromSession` 仍用現況 key `encryptVaultWithKey` 寫 vault，**未**核對 session salt 與 vault salt（契約已要求實作補上）。改密與其它寫 vault 路徑目前無共用 async 佇列。pending Map 僅 connect／sign；提案改密不進 pending，與現模型不互斥。 |
| `session.ts` | 不互斥 | session 只存工作 key raw＋salt＋secrets，不存密碼。`persistUnlockedSession` 為 `set`；`hydrateFromSessionStore` 尚未對 vault salt 做門檻。 |
| `storage-io.ts`／`storage-keys.ts` | 不互斥 | 不新增 local key。切 cluster 時 `rpcUrl: effectiveRpcUrl(...)`。 |
| `popup/index.html`／`main.ts` | 未實作 | Settings 仍為單頁＋seg cluster＋單清單 RPC；建庫／解鎖／Reveal 為 `type="password"` 且 `new-password`／`current-password`。Jupiter 為 `type="password"`。`hardenSensitiveTextInput` 可作類 B 同等屬性來源。建庫檢查 `password.length < 8`（不 trim），與現 INDEX 最短長度同向。 |
| `inject/wallet.ts` | 不互斥 | 本版非目標不新增 Wallet Standard 方法。 |

未發現提案要求 pending 進 `chrome.storage`、手寫 rehydrate 主同步、硬編碼密碼、或 inject 持有長期私鑰。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | **關閉** | INDEX 成功路徑、寫入順序（先 remove）；HOW SW 步驟 4–7；reasoning「先刪舊 session」；HANDOFF starter |
| H2 | HIGH | **關閉** | INDEX 成功路徑＋寫入順序（先 remove 再寫 vault；salt 不一致丟 session）；HOW 步驟 4–5＋Salt 門檻；reasoning 同節；HANDOFF starter |
| M1 | MEDIUM | **關閉** | INDEX 最短長度；HOW Command／步驟 3；reasoning 最短 8；HANDOFF |
| M2 | MEDIUM | **關閉** | INDEX 驗收（WEAK_PASSWORD、VAULT_MISSING、串行、導航、popout） |
| M3 | MEDIUM | **關閉** | INDEX 寫入順序（remove 到換 key 禁止 persist／舊 key 寫 vault）；HOW 步驟 4 至 6 |
| L1 | LOW | **關閉** | reasoning 畫面原則（覆寫 DP 第 9 節） |
| L2 | LOW | **關閉** | HOW SW 步驟 2 `readVaultBlob` |
| L3 | LOW | **關閉** | HOW 畫面錯誤短句 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-03 | H1 仍開；M1、M2 應修仍開；提案可行但**設計門檻未通過**；不是整份不可行 |
| 第 2 輪複審 | 2026-10-03 | H1／M1／M2／L1–L3 關閉；**H2 仍開**、**M3 應修**；提案可行但**設計門檻未通過**；不是整份不可行 |
| 第 3 輪複審 | 2026-10-03 | H2／M3 關閉（現 INDEX／HOW 已寫先 remove、remove 到換 key 禁止 persist、salt 不一致丟 session）；**無未關閉 HIGH**；**設計門檻通過**；不是整份不可行 |
