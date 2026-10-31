# Design review — 0.53.0 Airwave Wallet

- 日期：2026-10-31（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**（不 resume 初審對話；對照的是現在的檔，不是初審當下的句子）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`reasoning.md`](./reasoning.md)、[`how.md`](./how.md)、[`../HANDOFF.md`](../HANDOFF.md)。上游 [0.52.0](../../0.52.0/INDEX.md) 已出貨，內容是新增帳戶的五列選擇，與本版簽章細條無重疊。[0.47.1](../../0.47.1/INDEX.md) 仍把缺的 `chain` 補成錢包 cluster；dApp 真的送了不相符的 `chain` 仍是 `CHAIN_MISMATCH`。[0.29.0](../../0.29.0/INDEX.md) 仍禁止模擬、餘額、活動、送出去打官方 Mainnet 節點。本版只對這一次 `isBlockhashValid` 放開。[`backlog/sign-tx-durable-nonce-alert.md`](../../backlog/sign-tx-durable-nonce-alert.md) 仍是構想，不是本版契約
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md) 第 4 節與第 12 節
- 現行程式抽樣：`PopupMarkup.tsx`、`popup/styles/base.css`、`popout/styles/base.css`、`popout/styles/send-status.css`、`ApprovalSign.tsx`、`approval/shell/flow.ts`、`approval/shell/sign-tx.ts`、`approval/shell/runtime.ts`、`dapp-sign-chain.ts`（本版不改）、`storage-keys.ts`、`storage-io.ts` 的 `normalizeSettings`、`DebugSettingsScreen.tsx`、`background/index.ts`、`send-command.ts`、`sign-tx-pending-state.ts`、`test-web/src/main.ts`
- **總評：** 無未關閉 HIGH。審查門檻通過。H1、H2、M1、M2、M3、M4、M5、L1 都已寫進現在的 INDEX 或 HOW，本輪關閉。新列 L2、L3 只是文件一句，標非阻擋。待拍板是空的。HANDOFF 有 Track 1 的 paste-ready。非目標寫清。整份提案可行：細條、單次探測、不符卡、Debug 後備 URL，以及只對這次 `isBlockhashValid` 放開官方 Mainnet 節點，與 pending、回覆路由、custody、Wallet Standard 的硬契約一致

## Findings（第 2 輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。本輪沒有新的 HIGH 或應修 MEDIUM。

### HIGH

#### H1 — 一邊 `valid`、一邊 `unknown` 的兩句衝突 — **關閉**

現在的 Mismatch 列是：一邊 `valid`、另一邊 `invalid`，而且 `valid` 的那一邊不是 `settings.cluster`，才畫卡並停用 Approve。同一列寫明任一邊 `unknown` 永不算不符。Not a mismatch 列是兩邊 `valid`、兩邊 `invalid`、或任一邊 `unknown`。HOW 的 mismatch 句與「其餘結果清掉閘門、再套既有核准規則」和這兩列相同。`valid` + `unknown` 只命中第二句。

#### H2 — `isBlockhashValid` 的布林被寫成整個 HTTP body — **關閉**

INDEX 的 Question 列與 HOW 都寫：讀 JSON-RPC 的 `result.value`；布林 `true`／`false` 才是 `valid`／`invalid`；沒有該欄、不是布林、帶 `error`、HTTP 失敗或逾時是 `unknown`；整個 HTTP body 不是那顆布林。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | 關閉 | HOW 點名 `applyApproveFromSimulation` 與解鎖後 700ms：探測未回、以及已判定不符時，這兩條都不得把 Approve 設成可按；Reject 維持可按。非不符才清閘並套既有規則；700ms 若已走完就不再起一次。INDEX 的 While the probe runs 列與此一致，並寫明不符之後仍停用、模擬回來與 Apply CU 重畫之後也停用（驗收的手驗樣本） |
| M2 | 關閉 | INDEX 的 Result memory 列與 HOW 都寫：結果只留在這次簽章殼的記憶體；不寫 `chrome.storage`、不進 Zustand、不寫進 pending。內文重畫（含 Apply CU）用同一結果再畫卡，不再送 `ui.probeSignBlockhash` |
| M3 | 關閉 | INDEX 的 Command 列與 HOW 都寫：缺 pending，或 kind 不是那三種，回既有 `NOT_FOUND`。簽章殼走 `ui.simulatePendingTx` 已在用的過期畫面，不畫不符卡。現碼該錯誤碼就是 `NOT_FOUND`，畫面是 `showGone()` |
| M4 | 關閉 | HOW Track 1 寫明在 `wallet/src/popout/styles/base.css` 的 `:root` 定義 `--warn: #e8b84a` 與 `--warn-bg: #3a2e14`。這兩個值與 `wallet/src/popup/styles/base.css` 的 `:root` 相同。細條規則仍要抄進 popout catalog |
| M5 | 關閉 | INDEX 驗收寫了手驗樣本：test-web 省略 `chain`，blockhash 來自另一個 cluster 的 `getLatestBlockhash`（錢包在 Devnet 用 `https://api.mainnet-beta.solana.com`，在 Mainnet 用 `https://api.devnet.solana.com`），頁面不廣播。Devnet 錢包看 Devnet 句子、Reject 可按、Approve 停用，含模擬回來與 Apply CU 之後。Mainnet 錢包同一樣本：無細條、Mainnet 句子、Approve 停用。細條要看的三條路，以及 connect、`signMessage`、送出狀態卡不出現細條，都在驗收裡。HOW 的 Hand sample 要加那一個動作，既有簽署按鈕保持原樣 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | 關閉 | INDEX 的 Command 列與 HOW 都寫 service worker 讀 `payload.transaction`（`number[]`），並且不讀 `workingTx`。三種 kind 的未簽名位元組都在這個欄位；`walletSend` 入列時已是 `{ transaction: number[] }` |
| L2 | 仍開，非阻擋 | 驗收與 HOW 已寫送出狀態不畫細條。現碼送出狀態是同一張簽章殼加上 `send-status-mode`，`send-status.css` 只藏 `.bar-wallet-group`、`.site-row`、`.page-title`。細條若像概念稿那樣放在帳戶列下方、捲動區外，不會被這條規則藏住。建議 HOW 補一句：進入 `send-status-mode` 時一併藏 `.cluster-strip`。這不是契約分叉，不擋開工 |
| L3 | 仍開，非阻擋 | HOW 寫三條細條檢查用既有的 sign transaction、sign and send、錢包內送出。`test-web/src/main.ts` 的簽署與代送仍帶 `chain: "solana:devnet"`。錢包在 Mainnet 時，這兩個既有按鈕會先被 0.47.1 擋成 `CHAIN_MISMATCH`，簽章畫面不會開。Mainnet 的「無細條」已由驗收裡那個省略 `chain` 的不符樣本，以及錢包內送出，蓋得住。建議 HOW 補半句：Devnet 的三條細條用既有路徑；Mainnet 的 dApp 簽章畫面用省略 `chain` 的那個動作來看沒有細條。不擋開工 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| Devnet 時三種簽章交易畫面在帳戶列下出現細條；Mainnet 不出現 | 可測 | Devnet 用既有三條路。Mainnet 的錢包內送出可直接看無細條。Mainnet 的 dApp 畫面用省略 `chain` 的手驗動作（該列同時要求無細條）。既有 dApp 按鈕在 Mainnet 開不了畫面，見 L3，不使這列不可測 |
| connect、`signMessage`、送出狀態卡不出現細條 | 可測 | 排除條件已寫進 HOW。送出狀態要靠實作者在 `send-status-mode` 藏細條，見 L2 |
| Devnet 錢包且 blockhash 只在 Mainnet 有效：Devnet 句子、Reject 可按、Approve 停用，含模擬回來與 Apply CU 之後 | 可測 | 手驗樣本、`result.value`、不符定義、Approve 閘門、重畫後重畫卡片，都已寫死 |
| Mainnet 錢包且 blockhash 只在 Devnet 有效：無細條、Mainnet 句子、Approve 停用 | 可測 | 同一手驗動作省略 `chain`，0.47.1 會補成錢包 cluster，畫面會開 |
| 只在錢包自己的 cluster 有效：無卡，Approve 走今日模擬規則 | 可測 | 不符要求另一邊是 `invalid`。`unknown` 不算 |
| 兩邊 invalid，或任一邊 unknown：無卡，Approve 走今日模擬規則 | 可測 | 與 Mismatch 列一致。`unknown` 含逾時、HTTP 失敗、沒有布林 `result.value` |
| 每次審批只探測一次；Apply CU 與 3 秒重新整理不再送 | 可測 | 重畫用殼上的記憶體再畫卡，不再送命令 |
| 沒有自訂 Mainnet RPC 且 Debug 關：Mainnet 那半用官方 URL；模擬轉帳仍不用 | 可測 | 0.29 的例外只限這次 `isBlockhashValid`。布林讀 `result.value` |
| Debug 開顯示 `Mainnet blockhash RPC`；空值仍用官方 URL；Debug 關忽略已存值；已就緒的自訂 Mainnet RPC 仍是探測用的 URL | 可測 | 與 `isMainnetRpcReady`、Jupiter 那個 http(s) base 檢查一致。popout 的 `--warn`／`--warn-bg` 已寫進 HOW |
| `cd wallet && npm run typecheck` | 可測 | 無 |

## 與現碼抽樣

本版探測、不符卡、`mainnetBlockhashRpcUrl` 都還沒做。未實作本身不是設計 HIGH。下面是提案和現碼的關係。

與提案一致、不必改契約的部分：

- Pending 在 service worker 記憶體。`ui.*` 只允許擴充頁（`background/index.ts` 的 `isExtensionPage`）。回覆走 `sendResponse`，回到發出那次 `chrome.runtime.sendMessage` 的頁面。新命令若走同一條 `ui.` 路徑，不會經 `origin-notify` 廣播。提案的 payload 只有 pending `requestId`。popout 網址也只有 `requestId`（`open-popout.ts`）
- `settings.cluster` 只有 `devnet` \| `mainnet`。卡片兩句文案蓋得住。`effectiveRpcUrl("devnet", …)` 在沒有自訂 Devnet URL 時用官方 Devnet。`isMainnetRpcReady` 在 active 為空或等於 `https://api.mainnet-beta.solana.com` 時為 false，`effectiveRpcUrl("mainnet", …)` 回 `""`。HOW 的 Mainnet 後備沒有把官方節點塞回一般 RPC
- 沒有攔截「任何 fetch 官方 Mainnet」的總閘。0.29 的禁止是各命令自己不打那條 URL。本版 INDEX 已寫明只有這次 `isBlockhashValid` 可以打它
- `walletSend` 入列時已把未簽名位元組放進 `payload.transaction`（`send-command.ts`）。`workingTx` 在 `sign-tx-pending-state.ts`，不在 `chrome.storage`。INDEX 禁止探測去讀它
- 沒有新的 Wallet Standard 方法。簽名仍在擴充 UI。`normalizeSettings` 會逐欄重組設定；HOW 已要求缺的 `mainnetBlockhashRpcUrl` 收成 `""`，不升 `schemaGeneration`。`toPublicSettings` 會把非秘密欄位帶進公開設定，Debug 畫面讀得到
- Home 的 `.cluster-strip` 字面是 `Devnet`，樣式用 `--warn`／`--warn-bg`。popup 與側欄都載入 popup CSS。popout 頁只連 `popout/style.css`。三個簽章 kind 共用 `ApprovalSign` 與 `isSignTxKind`
- 關 popout 視窗會拒絕或結束該筆 pending（`windows.onRemoved`）。結果放在這次殼的記憶體，與「不寫進 pending、不重探」不衝突：視窗關掉，這筆審批也不再留在畫面上

與提案要壓過的現碼行為（未做本版；照現碼接上會讓驗收失敗，但 HOW 已寫要壓過，所以不是未解的契約分叉）：

- `applyApproveFromSimulation` 在非 `unparseable` 時會打開 Approve。`runtime.ts` 的設定 `onChanged` 只重畫簽章內文，不自己打開 Approve。探測閘門要做在 HOW 點名的那條函式與 700ms 上
- Apply CU 與內文重掛會清掉 `#sign-body` 裡當次插入的節點。卡片必須從殼上的記憶體再畫
- popout `:root` 還沒有 `--warn`／`--warn-bg`。HOW 已給了與 popup 相同的兩個值
- `ApprovalSign` 的帳戶列在 `.approval-sign-scroll` 裡面。提案要細條在帳戶列下、捲動區外，跟 Home 一樣。Track 1 要把帳戶列移出捲動區再放細條。這是要改的版面，概念稿也是這個順序
- `send-status-mode` 目前不藏 `.cluster-strip`（L2）
- test-web 既有簽署按鈕固定 Devnet `chain` 與 Devnet blockhash（L3）。不符樣本是 HOW 要新增的那個動作，不是這些既有按鈕

Durable nonce 的 backlog 沒有被當成已定案。reasoning 已說明兩邊 `invalid` 不阻擋，因為過期與 durable nonce 對 `isBlockhashValid` 長一樣。本版非目標已排除 nonce 偵測、把兩邊 `invalid` 當成過期、第一次之後再探、以及把這條後備 URL 用到別的 RPC。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉 | INDEX「Mismatch」「Not a mismatch」；HOW Track 2 的 mismatch 句 |
| H2 | HIGH | 關閉 | INDEX「Question」；HOW Track 2 的 JSON-RPC 解析句 |
| M1 | MEDIUM | 關閉 | HOW Track 2 的 Approve 閘門句；INDEX「While the probe runs」；驗收手驗樣本（模擬回來與 Apply CU 之後仍停用） |
| M2 | MEDIUM | 關閉 | INDEX「Result memory」；HOW Track 2 的 mount memory 句 |
| M3 | MEDIUM | 關閉 | INDEX「Command」；HOW Track 2 的 `NOT_FOUND` 句 |
| M4 | MEDIUM | 關閉 | HOW Track 1 的 popout `:root` |
| M5 | MEDIUM | 關閉 | INDEX 驗收的手驗樣本與細條列；HOW「Hand sample」 |
| L1 | LOW | 關閉 | INDEX「Command」；HOW Track 2 的 `payload.transaction` |
| L2 | LOW | 仍開，非阻擋 | — |
| L3 | LOW | 仍開，非阻擋 | — |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-31 | 有未關閉 HIGH（H1、H2）。門檻未過。提案可修，不是整份不可行 |
| 第 2 輪 | 2026-10-31 | H1、H2、M1–M5、L1 關閉。無未關閉 HIGH，無應修 MEDIUM。L2、L3 非阻擋。門檻通過。提案可行 |

## 初審紀錄（2026-10-31）

以下是初審原文，保留不動。當時的「仍開」已被上面的第 2 輪核對取代。

- 輪次：**初審**
- **總評（初審當下）：** 有未關閉 HIGH。審查門檻未過，先改 INDEX／HOW 寫死 H1 與 H2 再開工。整份提案可行

### 初審 Findings

#### H1 — 一邊 `valid`、一邊 `unknown` 同時落入「不符」與「不算不符」— 初審標仍開

INDEX 已定案寫：恰有一邊是 `valid`，且這一邊不是錢包目前的 cluster，就畫不符卡並停用 Approve。同一張表又寫：任一邊是 `unknown` 就不畫卡。驗收同樣寫任一邊 `unknown` 不畫卡、Approve 走既有模擬規則。

`valid` + `unknown` 兩句都命中。常見情況是錢包在 Devnet、Devnet 那側逾時、Mainnet 回 `valid`：依第一句要停用 Approve，依第二句與驗收要放行既有規則。`how.md` 只複述第一句，沒有把 `unknown` 排除。逾時被定案成 `unknown` 而不是 `invalid`，所以這格不是邊角，是 8 秒期限的正常結果。

這是 HIGH：已定案兩句互相否定，照 HOW 做會讓驗收那一列失敗。

建議寫進已定案（擇一，下面這句與驗收一致）：不符只發生在一邊是 `valid`、另一邊是 `invalid`，而且 `valid` 的那一邊不是 `settings.cluster`。任一邊是 `unknown`（含逾時、HTTP 失敗、讀不到布林）都不畫不符卡，Approve 走既有模擬規則。HOW 的 mismatch 句改成同一句。

#### H2 — `isBlockhashValid` 的布林被寫成整個 HTTP body — 初審標仍開

HOW 寫：body 不是布林就是 `unknown`；布林 `true`／`false` 才是 `valid`／`invalid`。這個方法的 HTTP body 是 JSON-RPC 物件，布林在 `result.value`，不是 body 本身。照字面實作，成功回應也會變成 `unknown`，不符卡不會出現，驗收裡「只在另一邊有效」無法成立。

這是 HIGH：主路徑的判定讀法讓探測失去 `valid`／`invalid`。

建議寫進 HOW，並在 INDEX 的 Question 列用同一句：解析 JSON-RPC；`result.value` 為布林 `true` 是 `valid`、`false` 是 `invalid`。沒有 `result.value`、值不是布林、帶 `error`、HTTP 失敗或逾時，都是 `unknown`。不要把整個 HTTP body 當成那顆布林。

#### 初審 MEDIUM

| ID | 初審狀態 | 依據 |
|----|----------|------|
| M1 | 仍開，應修 | 探測進行中與不符之後，Approve 必須維持停用。現碼 `applyApproveFromSimulation`（`approval/shell/sign-tx.ts`）在模擬回來時，只要結果不是 `unparseable`，就會把 Approve 打開；解鎖後 700ms 也會走到同一函式。探測與模擬並行，後回來的模擬會蓋掉不符閘門。INDEX 要「維持停用」，HOW 沒點名這條既有路徑。建議寫進 HOW：探測尚未返回，以及已判定不符時，`applyApproveFromSimulation` 與那 700ms 都不得把 Approve 設成可按；Reject 維持可按。非不符的結果清掉這道閘，再套既有規則；700ms 若已過完，不要再起一次 |
| M2 | 仍開，應修 | 卡片被定在簽章內文的第一塊。Apply CU 會把 `signTxBodyReady` 清掉並整塊重掛內文（`fee-details.ts` → `renderSignTransactionBody`）。卡片若只插進當次 DOM，重畫後消失，而且 HOW 的「這次 mount 不再呼叫」不會把卡片畫回來。建議寫進 HOW：結果只留在這次簽章殼的記憶體；不寫 `chrome.storage`、不進持久 Zustand、不改 pending。內文重畫時用同一結果再畫卡片，不再送 `ui.probeSignBlockhash` |
| M3 | 仍開，應修 | INDEX 的命令回傳只有 `{ devnet, mainnet }`。HOW 另定缺 pending 或 kind 不符時回 `NOT_FOUND`，但沒寫畫面。現碼 `ui.simulatePendingTx` 遇到 `NOT_FOUND` 會進過期畫面。探測若只把 Approve 停住，請求消失後按鈕會一直停。建議寫進 INDEX 與 HOW：那兩種情況回既有 `NOT_FOUND`；簽章殼走與模擬相同的過期畫面，不畫不符卡 |
| M4 | 仍開，應修 | 細條與金色卡片要用 `--warn`、`--warn-bg`。這兩個變數在 `wallet/src/popup/styles/base.css` 的 `:root`。`wallet/src/popout/styles/base.css` 的 `:root` 沒有它們。popout 頁只連 `popout/style.css`，不引 popup CSS。HOW 只說把 `.cluster-strip` 抄進 `chrome.css` 或 `sign.css`。抄過去之後，popout 上的細條與卡片沒有對比色。側欄與 popup 已引 popup CSS，不受這點影響。建議寫進 HOW：抄規則時一併在 popout `:root` 定義與 popup 相同的 `--warn`、`--warn-bg` |
| M5 | 仍開，應修 | 驗收列了單邊有效、兩邊無效、未知，但沒有人手步驟，也沒有 test-web 按鈕。`test-web/src/main.ts` 的簽署與代送都帶 `chain: "solana:devnet"`，blockhash 來自 Devnet RPC。錢包在 Mainnet 時，0.47.1 會先回 `CHAIN_MISMATCH`，簽章畫面不會開，探測不會跑。錢包在 Devnet 時，這些按鈕做出的是「本叢集有效」，不是「只在 Mainnet 有效」。建議寫進驗收：dApp 省略 `chain`（由 0.47.1 補成錢包 cluster），交易位元組的 blockhash 取自另一個 cluster 的 `getLatestBlockhash`；並點名細條要看的三條路（test-web 的 sign transaction、sign and send、錢包內送出）以及 connect、`signMessage`、送出狀態卡不出現細條 |

#### 初審 LOW

| ID | 初審狀態 | 依據 |
|----|----------|------|
| L1 | 仍開，非阻擋 | HOW 寫「pending 上的未簽名位元組」，沒寫欄位名。三個 kind 的位元組都在 `payload.transaction`（`number[]`）；`workingTx` 是另一份 service worker 記憶體，INDEX 已禁止讀它。建議 HOW 寫上 `payload.transaction` |
