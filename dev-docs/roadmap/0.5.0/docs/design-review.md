# Design review — 0.5.0 Airwave Wallet

- 日期：2026-10-01（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`combined-how.md`](./combined-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/src/shared/storage-keys.ts`、`wallet/src/background/index.ts`、`wallet/src/background/storage-io.ts`、`wallet/src/background/home-tokens-service.ts`、`wallet/src/inject/wallet.ts`、`wallet/src/popup/main.ts`（現碼未實作 combined ≠ 設計 HIGH）
- **總評：** 無未關閉 HIGH。初審 H1–H2、M1–M7、L1／L3／L4 已寫進現行 INDEX／HOW／HANDOFF。提案可行。審查門檻：**通過**（待拍板空；HANDOFF 含 paste-ready；同意的 MEDIUM 已落檔）。L2 仍開、非阻擋。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — Combined 與 `publicKeyBase58`／`ACCOUNT_EXISTS` 未覆寫 — **關閉**

現行 INDEX「兩層」：`AccountMeta` 判別聯合；signing／read-only 必有 `publicKeyBase58`；`kind:"combined"` 禁止用該欄當暴露公鑰，必有 `subPubkeys`／`mainPubkey`；`ACCOUNT_EXISTS` 只比對 signing＋read-only；同一地址可同時是真實列＋combined 成員；暴露公鑰 combined＝`mainPubkey`。HOW Meta／公鑰唯一性同文。HANDOFF／starter 重述。與初審建議句一致。

#### H2 — Combined 簽名取鑰與鎖定優先序未寫死 — **關閉**

INDEX「簽名」：閘門對目前錢包公鑰；取鑰用 signing 列 `accountId`；禁止 `getKeypair(combined.id)`；優先序無帳戶 → 觀察／無列 `ACCOUNT_READ_ONLY`（先於鎖定）→ 可簽但鎖定 `WALLET_LOCKED`；inject features 不因 combined 剝除。HOW「簽名」含 `resolvePending` 防禦與同一套閘。HANDOFF／starter 重述。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉** | HOW Commands 表（`createCombinedAccount`／`addCombinedSub`／`removeCombinedSub`／`setCombinedMain` 及 `LAST_SUB_ACCOUNT`、`INVALID_PUBLIC_KEY`）＋方案 A UI。INDEX UI 列：Add 第四項、Accounts／Manage、鎖定可刪 combined、Reveal／Widget。 |
| M2 | **關閉** | INDEX 查詢：廢除「owners 長度必須為 1 才打網」；combined 時 `owners = subPubkeys` 串行。HOW「覆寫 0.4.0 owners 長度 1」＋`ownersJoin` 指紋。HANDOFF starter 同句。 |
| M3 | **關閉** | HOW：`renameAccount` 適用 combined；刪 combined 鎖定允許；刪 active 沿用 0.2.0 切 `accounts[0]`，`account-changed` 用新列暴露公鑰。INDEX：刪 combined 比照觀察（鎖定可刪）。 |
| M4 | **關閉** | INDEX／HOW：任一 owner 最終失敗 → 整輪失敗、保留快取＋error、不交部分加總；RPC fallback 同樣串行 N 次。 |
| M5 | **關閉** | HOW `exportAccountSecret`：combined 本體或無 signing 列 → `ACCOUNT_READ_ONLY`。INDEX UI：Reveal 只對 storage signing。 |
| M6 | **關閉** | INDEX 驗收／手驗：含已是 signing 與從未入隊的地址；鎖定＋可簽目前錢包 → `WALLET_LOCKED`；切目前錢包僅 `connections.accountId` 等於該 combined 的 origin 收到 `account-changed`。 |
| M7 | **關閉** | HOW `setActiveAccount`：可切 combined；新暴露公鑰；不改各 origin `connections.accountId`。INDEX 驗收第三條同文。 |

本輪無新增 MEDIUM。0.4.0 `token-data-how.md` 仍寫長度 1 守衛，屬上游歷史契約；0.5.0 HOW／INDEX 已明示覆寫，不另開 ID。

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉** | INDEX 文件地圖已為 1–6 連號。 |
| L2 | **仍開（非阻擋）** | 文件地圖已註「成員地址／目前錢包；下文 sub／main 為 alias」。產品句與已定案表仍先寫 sub／main／「真實錢包」／active main；DOMAIN 規範名與「勿用 real／active main 當規範」。不擋實作。 |
| L3 | **關閉** | HOW：SOL 加總 0 → `members` 空 → 不畫展開控制（不另顯示「—%」）。 |
| L4 | **關閉** | INDEX 錨點已列 `commands.ts`、`home-tokens-service.ts`。 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| `npm run build` 成功 | 是（出貨時） | 無 |
| 可建 combined（≥1，含已是 signing／從未入隊）；不能刪到 0 | 是 | H1／M1 已關 |
| `setActiveAccount` 切 combined／切回單一：新暴露公鑰、`connections.accountId` 不變 | 是 | M7 已關 |
| 刪原 main 的 signing：combined 仍在、main 地址仍在、`ACCOUNT_READ_ONLY` | 是 | 與鎖定案例分開（下條） |
| 切目前錢包：僅綁該 combined 的 origin 收 `account-changed`；欄位仍為 combined id | 是 | M6 已關 |
| 鎖定＋可簽目前錢包：`WALLET_LOCKED` | 是 | H2／M6 已關 |
| Home 加總；單一 pipe | 是 | M2／M4 已關 |
| Combined 展開列：>0 成員、%、不改 main；非 combined 無展開 | 是 | 可測 |
| 無巢狀 combined | 是 | subs 只接受可解析公鑰 |
| pending／custody 禁區未破 | 是 | 取鑰鍵已寫死；pending 仍僅 SW |

## 與現碼抽樣

現碼未做 combined ≠ 設計 HIGH。與提案**互斥、實作時必須覆寫**（契約已寫死）：

| 錨點 | 現行 | 與 0.5.0 |
|------|------|---------|
| `storage-keys.ts` `AccountKind` 僅 `signing` \| `readOnly`；必有 `publicKeyBase58` | 無 combined | 聯合型別（H1 已定案） |
| `pubkeyExists` 掃整表 `publicKeyBase58` | 含 combined 會誤擋或誤撞 | 只比 signing＋read-only |
| `getActivePublicKey` 讀 `publicKeyBase58` | connect／tokens／account-changed | combined 改讀 `mainPubkey` |
| `signGateError` 只看 `active.kind === "readOnly"`；`getKeypair(activeId)` | combined 無 secret | H2 閘＋signing 列 id |
| `home-tokens-service.ts` 單一 `owner: string` 指紋 | 須 `owners[]` 串行＋`members` | M2／M4；現碼未做≠HIGH |
| `inject/wallet.ts` 未宣告 `signAndSendTransaction` | 符合禁區 6 | 本版不新宣告 |
| pending Map＋popout `?requestId=`；結果回原 tab | 符合禁區 | 保持 |
| popup `onChanged` 鏡像 accounts | 符合禁區 3 | combined 列進同一 `airwave.accounts.v1` |

未把 `brainstorm/` 或 `../solibra-wallet` 當已定案。backlog 僅來源連結。本版未提議 pending persist、全 tab `tabs.query` 廣播、硬編碼密碼、inject 持長期私鑰。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉 | INDEX 已定案「兩層」；HOW Meta／公鑰唯一性；HANDOFF |
| H2 | HIGH | 關閉 | INDEX「簽名」；HOW 簽名／`resolvePending`；HANDOFF |
| M1 | MEDIUM | 關閉 | HOW Commands＋方案 A；INDEX UI |
| M2 | MEDIUM | 關閉 | INDEX 查詢；HOW Home tokens 覆寫長度 1 |
| M3 | MEDIUM | 關閉 | HOW `renameAccount`／`deleteAccount`；INDEX UI |
| M4 | MEDIUM | 關閉 | INDEX 查詢；HOW「某一 owner 失敗」 |
| M5 | MEDIUM | 關閉 | HOW `exportAccountSecret`；INDEX UI Reveal |
| M6 | MEDIUM | 關閉 | INDEX 驗收／手驗 |
| M7 | MEDIUM | 關閉 | HOW `setActiveAccount`；INDEX 驗收 |
| L1 | LOW | 關閉 | INDEX 文件地圖 |
| L2 | LOW | 仍開 | 產品句用語；非阻擋 |
| L3 | LOW | 關閉 | HOW 展開 UI／% |
| L4 | LOW | 關閉 | INDEX 錨點 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-01 | 有未關閉 HIGH（H1 schema／唯一性、H2 取鑰與鎖定優先序）。提案可行，門檻未過。 |
| 第 2 輪複審 | 2026-10-01 | H1–H2、M1–M7 關閉。無未關閉 HIGH。L2 非阻擋仍開。審查門檻通過。提案並非不可行。 |
