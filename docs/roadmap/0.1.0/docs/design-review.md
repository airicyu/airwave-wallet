# Design review — 0.1.0

本檔為設計審查產物，**不是**版本契約。對照基準以 [INDEX.md](../INDEX.md)（已定案＋驗收）為準；架構禁區見 [GUIDELINES.md](../../GUIDELINES.md)。

---

## 各輪日期

| 輪次 | 日期 | 審查者角色 | 備註 |
|------|------|------------|------|
| R1 | 2026-09-30 | 設計審查 agent | 初審；`wallet/`、`test-web/` 尚無程式 |
| R2 | 2026-09-30 | 設計審查 agent（複審） | 核對 R1 H1／M1–M8 是否已寫入 INDEX／HOW／reasoning；`wallet/`、`test-web/` 仍空 |

---

## 對照基準

- [docs/roadmap/0.1.0/INDEX.md](../INDEX.md)（狀態 `planned`；「開工前仍須拍板」為空）
- [docs/message-flow-how.md](./message-flow-how.md)
- [docs/storage-custody-how.md](./storage-custody-how.md)
- [docs/reasoning.md](./reasoning.md)
- [HANDOFF.md](../HANDOFF.md)（已存在；INDEX 文件地圖標為閘門通過後使用）
- 上游版本：無
- Backlog（構想）：[minimal-wallet-mvp.md](../../backlog/minimal-wallet-mvp.md)（已排入本版）

---

## 總評（最新：R2）

R1 阻擋項 **H1** 與 **M1–M8** 已分別寫入 [reasoning.md](./reasoning.md)、[message-flow-how.md](./message-flow-how.md)、[storage-custody-how.md](./storage-custody-how.md) 及 [INDEX](../INDEX.md)（釣魚 heuristic）；pending／session 語意與 INDEX 禁區一致。INDEX「開工前仍須拍板」仍為空；HANDOFF 就緒。**design-review 閘門可視為通過**（無未關 HIGH）；殘餘 **L2**／**L3** 不擋開實作。

**可否進入實作（依 agent-workflow）：** **是**——無未關 HIGH；R1 MEDIUM 已併入契約檔；可依 [HANDOFF.md](../HANDOFF.md) 開新 session 實作。

### R1 總評（歷史）

0.1.0 契約整體與 GUIDELINES 架構禁區方向一致（SW pending hub、結果 targeted tab、storage 真相、password vault、能力表收窄），Track 與手驗驗收可執行。**阻擋開工項：** `reasoning.md` 與 INDEX／HOW 對 pending 是否可用 `chrome.storage.session` 備援存在直接衝突，須規劃收斂後實作 agent 才不會誤走 storage hydrate。其餘多為 HOW 自足性與邊界行為補句（MEDIUM／LOW）。

**可否進入實作（依 agent-workflow）：** 在 **H1 關閉**（寫回 INDEX 或 reasoning／HOW 三选一一致）前，不建議視 design-review 閘門為通過；HANDOFF 已存在，但應在收斂 H1 與同意的 MEDIUM 後再依賴其 starter prompt。

---

## Findings

### HIGH

| ID | 標題 | 說明 | 建議修復（規劃 agent；本審查不改契約檔） |
|----|------|------|------------------------------------------|
| H1 | pending session 備援與「禁止 storage hydrate pending」衝突 | [INDEX](../INDEX.md) 已定案：Pending 僅 SW `Map`；**不**用 storage hydrate pending。[message-flow-how](./message-flow-how.md)「明確不做」含以 `chrome.storage` 持久化 pending 供 popout hydrate。但 [reasoning](./reasoning.md) 寫：SW 回收時 pending 元資料**可選**寫入 `chrome.storage.session`，且稱「session 備援列在 HOW 為可選」——實際兩份 HOW **均未**記載 session；若實作依 reasoning 做 session rehydrate，即與 INDEX 禁區及 GUIDELINES「Pending 權威是 service worker、UI 不從持久 store hydrate 找請求」同型衝突。 | **三选一寫死：** (A) 0.1.0 完全不做 session pending（刪或改 reasoning 該段，與 INDEX 一致）；或 (B) INDEX 明確允許且限定 session 用途（極窄、非 popout hydrate 主路徑）並同步 HOW；或 (C) 將 session 標為後版非目標。不得以「可選」留在 reasoning 而 INDEX 禁止。 |

### MEDIUM

| ID | 標題 | 說明 | 建議 |
|----|------|------|------|
| M1 | Track 2 ping command 未入 HOW 命令表 | INDEX Track 2 要求 inject ping 測試 command 來回，但 [message-flow-how](./message-flow-how.md) Extension command 表無 `debug.ping`（或等價）與 payload／回覆形狀。 | 在 HOW 增列測試用 command（或改 Track 2 明確改用既有 command 名與範例）。 |
| M2 | signMessage 釣魚 heuristic 未下沉 HOW | INDEX 已定案拒絕「可解析 VersionedTransaction」的 message bytes；Track 6 未引用；HOW 無檢查位置（SW vs inject）與失敗 error code。 | 在 message-flow-how 或 storage-custody-how 增一節：檢查點、heuristic 邊界、拒絕時 dApp 可見錯誤。 |
| M3 | `accountChanged` 契約不足 | HOW 描述 popup 切帳後對已連線 tab 推送 `accountChanged`，但未定 bridge 訊息形狀、是否含新 pubkey、inject 是否需 disconnect／重連。INDEX 驗收允許兩種行為但要求與 HOW 一致且文件化。 | 補齊 targeted 訊息 type／payload 與 Wallet Standard 帳戶事件對應。 |
| M4 | Vault 每帳戶密文結構未拍板 | [storage-custody-how](./storage-custody-how.md) `VaultBlob.accounts[].encryptedSecret` 註「DEK 或嵌 ciphertext 二選一並寫死」。 | INDEX 或 HOW 選定一種並刪掉另一種，避免 Track 3 實作分叉。 |
| M5 | `readonly` 欄位與非目標不一致 | storage schema 帳戶 meta 含 `readonly`；INDEX 已定案本版不做 read-only 帳戶。 | 要麼 0.1.0 schema 移除 `readonly`，要麼註明恒為 `false` 且無 UI。 |
| M6 | `frameId` 來源未寫 | `PendingRecord` 含 `frameId`；content 自 inject `postMessage` 轉 SW 時如何取得／傳遞 frameId（非 top frame dApp）未說明。 | HOW 補 content→SW 欄位來源；若 MVP 只支援 main frame，寫清限制。 |
| M7 | 鎖定態下 dApp 操作路徑 | popup 負責解鎖；popout 不處理解鎖；HOW 未寫 connect／sign 在 vault 鎖定時 SW 行為（拒絕 vs 僅 connect 用 storage meta 公鑰）。Track 3 僅「鎖定後 SW 拒簽」。 | 補 connect／signMessage／signTransaction 鎖定態表；手驗是否需先 popup 解鎖。 |
| M8 | Wallet Standard 註冊細節缺失 | INDEX 定方法集合與名稱 `Airwave`；HOW inject 錨點未寫 `chains`、`features`、icon 等最小註冊欄位。 | HOW 增最小 WS 註冊表或指向官方最小範例與本版 cluster 對應。 |

### LOW

| ID | 標題 | 說明 |
|----|------|------|
| L1 | bridge result 型別分散 | `airwave-bridge-result` 僅在 pending 流程段落出現，未與 page envelope 同表列舉。 |
| L2 | 用字繁簡混用 | INDEX「匯入 base58 私**钥**」與他處「私鑰」混用。 |
| L3 | HANDOFF 與閘門時序 | HANDOFF 已存在；INDEX 文件地圖仍寫「閘門通過後實作用」。流程上應在 design-review 收斂後再視 HANDOFF 為定稿（非產品語意錯誤）。 |

---

## 驗收對照（INDEX checklist）

對照 [INDEX](../INDEX.md)「驗收（出貨 checklist）」——設計階段僅檢查**是否可客觀手驗**、是否與已定案矛盾。

| 驗收項 | 設計是否支撐 | 備註 |
|--------|--------------|------|
| build／dev／載入未封裝 | 是 | Track 1／7 + 手驗指令 |
| 首次 popup 設密碼 + 生成帳戶 | 是 | storage-custody-how |
| test-web Connect／Sign message／Sign tx | 是 | Track 5–6；M2／M7 影響邊界 |
| 拒絕路徑無幽靈 pending | 是 | pending Map + resolve；H1 若做 session 需重新評估 |
| 切換帳戶與已連線 tab | 是 | message-flow-how「帳戶變更推送」 |
| 無 hardcode 密碼；無 storage pending hydrate | 是 | reasoning § pending；HOW「明確不做」 |

---

## 現碼抽樣

| 錨點 | 狀態 | 與提案關係 |
|------|------|------------|
| `wallet/` | **空目錄**（無程式） | 無衝突；未實作本版 ≠ 設計 HIGH |
| `test-web/` | **空目錄** | 同上 |
| 全倉庫 TS/JS | 無 `rehydrate`／`broadcast` pending 等模式 | 無 Solibra 式現碼拖累 |

---

## 修復追蹤

| ID | 狀態 | 關閉依據（須寫入 INDEX／HOW／reasoning／HANDOFF 之一） |
|----|------|--------------------------------------------------------|
| H1 | **關** | [reasoning.md](./reasoning.md) §「為何不用 operation store…」：0.1.0 **不**寫入 `storage.session` pending；session 備援留 backlog。與 INDEX Pending 列、HOW「明確不做」一致。 |
| M1 | **關** | [message-flow-how.md](./message-flow-how.md) command 表 `debug.ping`（payload／回覆形狀）。 |
| M2 | **關** | [storage-custody-how.md](./storage-custody-how.md) § signMessage 釣魚 heuristic；[INDEX](../INDEX.md) 已定案「釣魚防護」列。 |
| M3 | **關** | [message-flow-how.md](./message-flow-how.md) § 帳戶變更推送（`airwave-bridge-account-changed`、`publicKeyBase58`、WS `change`、不 disconnect）。 |
| M4 | **關** | [storage-custody-how.md](./storage-custody-how.md) `VaultBlob`：單一 `ciphertext` 內 JSON `secrets` map（已刪 DEK／嵌套二選一）。 |
| M5 | **關** | [storage-custody-how.md](./storage-custody-how.md) accounts meta 僅 `{ id, label, publicKeyBase58 }`；INDEX 非目標 read-only 不變。 |
| M6 | **關** | [message-flow-how.md](./message-flow-how.md) Page bridge：`frameId: 0`、本版僅 top frame。 |
| M7 | **關** | [storage-custody-how.md](./storage-custody-how.md) § Vault 鎖定態（dApp 路徑）表 + 手驗預期。 |
| M8 | **關** | [message-flow-how.md](./message-flow-how.md) § Wallet Standard 註冊（name／icon／chains／features）。 |
| L1 | **關** | [message-flow-how.md](./message-flow-how.md) § dApp 結果（`AirwaveBridgeResult` 型別與轉發）。 |
| L2 | **開** | INDEX Track 3／4 驗收與 storage-custody-how 仍混用「私钥」與「私鑰」。 |
| L3 | **開** | INDEX 文件地圖仍寫 HANDOFF「閘門通過後」；流程上 R2 已可開實作，用字未改（非契約矛盾）。 |

**R2 核對 R1（H1／M1–M8）：** 上表八項 MEDIUM + H1 均已關；未重編 ID。

**上輪標關閉項核對：** R1 無已關項；R2 首次標關 H1、M1–M8、L1。

---

## 歷審摘要

- **R1（2026-09-30）：** 1×HIGH（pending session vs INDEX）；8×MEDIUM；3×LOW。現碼空白，契約主體可用，須先收斂 H1 再開實作。
- **R2（2026-09-30）：** 複審僅對照檔案。H1、M1–M8、L1 **關**；L2、L3 **開**（LOW）。無新 HIGH／MEDIUM。design-review **閘門通過**。

---

## 不可行性

**無。** 範圍與技術選型（MV3、Wallet Standard、PBKDF2 vault、test-web 手驗）合理；阻礙來自文件不一致而非產品不可做。
