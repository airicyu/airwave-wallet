# Design review — 0.2.0 Airwave Wallet

本檔為設計審查產物，**不是**版本契約。對照基準以 [INDEX.md](../INDEX.md)（已定案＋驗收）為準；架構禁區見 [GUIDELINES.md](../../GUIDELINES.md)。

---

## 各輪日期

| 輪次 | 日期 | 審查者角色 | 備註 |
|------|------|------------|------|
| R1 | 2026-10-01 | 設計審查 agent | 初審；HANDOFF 尚不存在；現碼為 0.1.0 shipped |
| R2 | 2026-10-01 | 設計審查 agent | 第 2 輪複審；核對 R1 關閉項是否落入 INDEX／HOW／reasoning；HANDOFF 仍不存在 |
| R3 | 2026-10-01 | 設計審查 agent | 第 3 輪複審；核對 R2 仍開項 H2／M10／M11／L4／L5 是否落入 INDEX／HOW；HANDOFF 仍不存在 |

---

## 對照基準

- [docs/roadmap/0.2.0/INDEX.md](../INDEX.md)（狀態 `planned`；「開工前仍須拍板」為空）
- [docs/accounts-home-how.md](./accounts-home-how.md)
- [docs/disconnect-how.md](./disconnect-how.md)
- [docs/reasoning.md](./reasoning.md)
- [HANDOFF.md](../HANDOFF.md)（**尚不存在**；文件地圖標閘門通過後）
- 上游：[0.1.0 INDEX](../../0.1.0/INDEX.md)（`shipped`）、[message-flow-how](../../0.1.0/docs/message-flow-how.md)、[storage-custody-how](../../0.1.0/docs/storage-custody-how.md)
- Backlog：INDEX 標無獨立檔；未把 `brainstorm/` 或 `../solibra-wallet` 當已定案

---

## 總評（最新：R3）

R2 仍開的 **H2**、**M10**、**M11** 與 **L4**／**L5** 均已寫進 INDEX／HOW（穩定 ID 不重編號）。先前已關之 H1／M1–M9／L2／L3 複核仍成立。主軸與 GUIDELINES 禁區一致；待拍板為空。

**未關閉 HIGH：** 無。  
**仍開 MEDIUM：** 無（M1–M11 皆關閉）。  
**仍開 LOW：** 僅 **L1**（HANDOFF 待閘門後由規劃補；非產品語意錯）。

**可否進入實作（依 agent-workflow）：** **是**。  
**審查門檻：通過。**  
規劃下一步應寫／更新 `HANDOFF.md`（含 paste-ready starter prompt），再開實作 agent。

**提案不可行：** **否**。

---

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — 首頁可見性：INDEX「解鎖後」vs HOW「未解鎖也可查」 — **關閉**

- **關閉位置：** INDEX 已定案「Wallet home 資產」＋驗收句（鎖定或已解鎖、有 active 公鑰即可）；[accounts-home-how § 可見性](./accounts-home-how.md)；[reasoning § 為何鎖定也可看 Home（H1 選 B）](./reasoning.md)。
- **R3 核對：** 無殘留「僅解鎖後可見」分叉。

#### H2 — `deleteAccount` 步驟順序非原子（先刪 meta 再拒鎖） — **關閉**

- **關閉位置：** [accounts-home-how § 刪除](./accounts-home-how.md) 改為「**先檢查、後寫入**」：`(1)` 不存在 → `ACCOUNT_NOT_FOUND`；`(2)` signing＋鎖定 → **立即** `WALLET_LOCKED`（無副作用）；`(3)` 通過後再寫 accounts／vault／connections／active。INDEX 帳戶 delete 條指向 HOW。
- **R3 核對：** 鎖定拒刪路徑不再要求先改 storage；與 INDEX「signing 鎖定 → `WALLET_LOCKED`」一致。

### MEDIUM

| ID | 標題 | 本輪狀態 | 依據／建議 |
|----|------|----------|------------|
| M1 | `disconnected` 的 content→inject envelope 未定 | **關閉** | [disconnect-how § 斷開事件](./disconnect-how.md)：SW→content `airwave-bridge-disconnected`；content→inject `source:"airwave-content", event:"disconnected"`。 |
| M2 | 拒簽優先序：`ACCOUNT_READ_ONLY` vs `WALLET_LOCKED` | **關閉** | [accounts-home-how § 拒簽優先序](./accounts-home-how.md)：readOnly → `ACCOUNT_READ_ONLY` **先於** `WALLET_LOCKED`。 |
| M3 | 帳戶 commands 的 unlock／無 vault 前置表不全 | **關閉** | [accounts-home-how § Command 前置條件](./accounts-home-how.md)。 |
| M4 | SPL Token `programId` 與 Token-2022 範圍未寫死 | **關閉** | INDEX＋[accounts-home-how](./accounts-home-how.md)：legacy id 寫死；本版只查 legacy。 |
| M5 | 重複 `publicKeyBase58`（read-only 撞既有帳戶） | **關閉** | `addReadOnlyAccount`／generate／import → **`ACCOUNT_EXISTS`**。 |
| M6 | 刪帳戶依 `connections.accountId`（連線當下）斷開 | **關閉** | INDEX 帳戶 delete＋accounts-home-how Connections／刪除。 |
| M7 | read-only active 時帳戶級 WS features 仍宣告可簽 | **關閉** | accounts-home-how：帳戶 features **維持 0.1.0**；拒簽靠 runtime。 |
| M8 | test-web Disconnect 呼叫路徑未寫 | **關閉** | INDEX Track 4＋disconnect-how § test-web。 |
| M9 | 「審批 UI 若誤開亦不得簽名」缺 HOW 步驟 | **關閉** | accounts-home-how § `ui.resolvePending` 防禦。 |
| M10 | inject 對 `disconnected` 的兩段式接線未寫死 | **關閉** | [disconnect-how § 斷開事件](./disconnect-how.md) 寫死與 account-changed 同一路徑：`postMessage` → `bridge-client` 聽 `event:"disconnected"` → 清 `currentPublicKey`＋`emitChange()`（可再 CustomEvent）；明示 popup／刪帳戶 push 亦同；禁止只改 content 漏改 inject。 |
| M11 | 無 vault 時 `addReadOnly` vs `createVault` 覆寫 accounts | **關閉** | INDEX Read-only 條：`createVault` **不得**抹掉既有 read-only；[accounts-home-how § createVault](./accounts-home-how.md) 定案 **(A)**：append／merge 保留既有 accounts，禁單元素覆寫；公鑰撞車 → `ACCOUNT_EXISTS`。 |

### LOW

| ID | 標題 | 本輪狀態 | 說明 |
|----|------|----------|------|
| L1 | HANDOFF 尚未建立 | **仍開** | 閘門已通過；規劃應補 HANDOFF（非產品語意錯；不擋設計門檻）。 |
| L2 | Track 1 驗收只點名 signMessage | **關閉** | INDEX Track 1 驗收已對稱寫 signMessage **與** signTransaction。 |
| L3 | 0.1.0 storage HOW 的 connections 無 `tabIds` | **關閉** | accounts-home-how § Connections schema 明示覆寫。 |
| L4 | INDEX「kind 或等價布林」vs HOW 僅 `AccountKind` | **關閉** | INDEX Read-only 條已改為字面聯合 `"signing" \| "readOnly"`，**不用布林**；與 HOW `AccountKind` 對齊。 |
| L5 | `addReadOnly` 公鑰校驗失敗碼未寫 | **關閉** | accounts-home-how commands 表：公鑰無法解析 → **`INVALID_PUBLIC_KEY`**。 |

**本輪新開 findings：** 無。

---

## 驗收對照

對照 [INDEX](../INDEX.md)「驗收（出貨 checklist）」——設計階段只問能否客觀手驗、是否與已定案矛盾。

| 驗收項 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| `wallet`／`test-web` build／dev | 是 | 無 |
| Popup rename 與 storage meta 一致 | 是 | 無 |
| 新增 read-only → 切換 → 拒簽 `ACCOUNT_READ_ONLY` | 是 | M11／L5 已關 |
| 刪除非唯一帳戶／刪 active 切換與 dApp change | 是 | H2／M10 已關 |
| Popup 首頁 SOL＋token 區／RPC 錯誤（鎖定亦可） | 是 | H1 已關 |
| test-web Disconnect → 需重連 | 是 | M8／M10 已關 |
| Popup 斷開單一 origin | 是 | M10 已關 |
| WS 宣告含 `standard:disconnect`；無空廣告 | 是 | 與非目標一致 |
| 無 hardcode 密碼；pending 不進 storage；不廣播全 tab | 是 | 繼承 0.1.0；disconnect 用 targeted `tabIds` |

設計層：驗收項均可客觀手驗，與已定案無矛盾。

---

## 與現碼抽樣

**原則：** 現碼未實作本版 ≠ 設計 HIGH。下列為相容性／互斥檢查（R3 抽樣）。

| 錨點 | 現況（0.1.0） | 與 0.2.0 提案 |
|------|---------------|----------------|
| `wallet/src/inject/bridge-client.ts` | `postMessage` 請求；僅對 `event:"account-changed"` 轉 CustomEvent；**無** `disconnected` 分支 | 預期缺口；HOW 已要求對稱加 `disconnected`（M10 關閉案）。 |
| `wallet/src/content/index.ts` | 白名單無 `dapp.disconnect`；`airwave-bridge-account-changed` → `postMessage(event:"account-changed")` | 預期缺口；HOW 要求同機制加 disconnected／白名單增量。 |
| `wallet/src/background/index.ts` `wallet.createVault` | `writeAccounts([meta])` 單元素覆寫；無 hardcode 密碼；pending 僅記憶體；結果 targeted `tabs.sendMessage` | 禁區相容。現碼覆寫行為須依 HOW **(A)** 改為保留既有 accounts（M11 關閉案＝實作義務，非設計分叉）。 |
| `wallet/src/shared/storage-keys.ts`／`commands.ts`（未重開全檔） | 依 R2：無 `kind`／無 rename·delete·readOnly·disconnect commands | 預期缺口。 |
| `wallet/src/inject/wallet.ts`（未重開全檔） | 依 R2：無 disconnect；features 固定；聽 CustomEvent | 與 M7／disconnect HOW 相容。 |

未發現現碼強制 storage hydrate pending、全 tab 廣播、或硬編碼密碼而與本版提案不可調和。

---

## 修復追蹤

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | **關閉** | INDEX「Wallet home 資產」＋驗收；accounts-home-how § 可見性；reasoning H1 選 B |
| H2 | HIGH | **關閉** | accounts-home-how § 刪除（先檢查後寫入）；INDEX 帳戶 delete → HOW |
| M1 | MEDIUM | **關閉** | disconnect-how § 斷開事件 |
| M2 | MEDIUM | **關閉** | accounts-home-how § 拒簽優先序 |
| M3 | MEDIUM | **關閉** | accounts-home-how § Command 前置條件 |
| M4 | MEDIUM | **關閉** | INDEX＋accounts-home-how § 查詢 |
| M5 | MEDIUM | **關閉** | accounts-home-how commands 表 `ACCOUNT_EXISTS` |
| M6 | MEDIUM | **關閉** | INDEX 帳戶 delete；accounts-home-how Connections／刪除 |
| M7 | MEDIUM | **關閉** | accounts-home-how § Wallet Standard 帳戶 features |
| M8 | MEDIUM | **關閉** | INDEX Track 4；disconnect-how § test-web |
| M9 | MEDIUM | **關閉** | accounts-home-how § `ui.resolvePending` 防禦 |
| M10 | MEDIUM | **關閉** | disconnect-how § 斷開事件（兩段式＋bridge-client） |
| M11 | MEDIUM | **關閉** | INDEX Read-only／createVault；accounts-home-how § createVault **(A)** |
| L1 | LOW | **仍開** | （閘門後 HANDOFF） |
| L2 | LOW | **關閉** | INDEX Track 1 驗收 |
| L3 | LOW | **關閉** | accounts-home-how § Connections schema |
| L4 | LOW | **關閉** | INDEX Read-only：`"signing" \| "readOnly"`，不用布林 |
| L5 | LOW | **關閉** | accounts-home-how：`INVALID_PUBLIC_KEY` |

**上輪標關閉／仍開項核對（R3）：** R2 關閉項（H1、M1–M9、L2、L3）複核仍在 INDEX／HOW。R2 仍開項於本輪：H2、M10、M11、L4、L5 → **關閉**；L1 仍開（HANDOFF 不存在）。無 HANDOFF 關閉項可核。

---

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| R1 | 2026-10-01 | 1×HIGH（H1）；9×MEDIUM；3×LOW。閘門未通過；提案非不可行。 |
| R2 | 2026-10-01 | R1 之 H1／M1–M9／L2／L3 已落入契約檔。新開 H2、M10、M11；L4／L5。**仍有未關閉 HIGH → 閘門未通過**；提案非不可行。 |
| R3 | 2026-10-01 | R2 之 H2／M10／M11／L4／L5 已落入 INDEX／HOW。無未關閉 HIGH；無未關閉 MEDIUM；僅 L1（HANDOFF）。**審查門檻通過**；提案非不可行。下一步：規劃寫 HANDOFF → 實作。 |

---

## 不可行性

**無。** 設計契約已自足至可開工；現碼與提案的差異（`createVault` 覆寫、缺 disconnect 接線等）屬實作範圍，非架構不可調和。
