# Design review — 0.3.0 Airwave Wallet

- 日期：2026-10-01（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`popup-shell-how.md`](./popup-shell-how.md)；[`reasoning.md`](./reasoning.md)；[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/src/popup/index.html`、`main.ts`、`style.css`；`wallet/src/shared/commands.ts`；`wallet/src/background/index.ts`；`wallet/src/content/index.ts`；`wallet/src/inject/wallet.ts`
- **總評：** 無未關閉 HIGH。無未關閉應修 MEDIUM。方案 A 殼＋既有 RPC＋鎖定整頁 Unlock＋Reveal 先解鎖再送密碼，且 session 鎖定時 export **一律 `WALLET_LOCKED`**，與 GUIDELINES 禁區可調和，**提案可行**。審查門檻**通過**。L2／L4 仍開、非阻擋。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — 鎖定態是否仍顯示 Home Token — **關閉**

初審：文件地圖稱 0.2.0 HOW 仍有效，與 HOW `locked` 整頁互斥。

本輪核對：INDEX「繼承 0.2.0」明示覆寫「鎖定仍可看 Home 資產」；已定案「設定／鎖定」：鎖定**只** `#locked`，不顯示 Home／Token／Activity／Accounts／Reveal；對照表與驗收同句；HOW 畫面表＋「與 0.2.0 HOW 的覆寫」；reasoning「鎖定不再顯示 Home Token」；HANDOFF／starter 同。

#### H2 — Reveal「不必先經 Unlock 屏」與 `locked` 互斥畫面 — **關閉**

初審：INDEX 允許鎖定態直接 Reveal，與 `locked` 整頁衝突。

本輪核對：已採「僅已解鎖可達」。INDEX Reveal：進入前必須已解鎖；鎖定無法未 Unlock 進 Reveal；匯出仍再送密碼。HOW 導航＋command 表；reasoning 否決「Reveal 覆蓋 `#locked`」；HANDOFF 同。與 H1 同一模型。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉** | INDEX：成功或失敗都不改變 session。HOW：成功不呼叫等同 `wallet.unlock`；密碼錯不 `lock`。HANDOFF starter：成功不改 session。 |
| M2 | **關閉** | INDEX Token 顯示規則：同 mint 加總一列，`id`＝mint，加總後 0 不畫。HOW 規則 2–4。HANDOFF starter 同。 |
| M3 | **關閉** | HOW Back：Settings／Connected／Accounts → **一律** `home-token`，不記住 Activity tab。 |
| M4 | **關閉** | INDEX 繼承列＋Reveal 條：明示覆寫「私鑰永不進 popup」，僅 RAM＋主動複製；禁 storage／log／changelog。HOW 覆寫節。 |
| M5 | **關閉** | INDEX 驗收＋手驗：錯誤密碼不洩密；離開頁／關 popup 後 DOM 無 secret；靜態確認 content 白名單不含 `exportAccountSecret`。 |
| M6 | **關閉** | HOW：名稱鎖定、須進 `commands.ts` 聯集；非擴充 origin → `FORBIDDEN`（`isExtensionPage`）。INDEX 錨點 `commands.ts`。 |
| M7 | **關閉** | INDEX Reveal：session **鎖定**時 SW **一律** `WALLET_LOCKED`（即使密碼能解開 blob）。HOW 失敗表：鎖定 → `WALLET_LOCKED`（先於解密）；SW 節：一律失敗，即使 payload 密碼能解開 vault blob（先 Unlock 不是只擋 UI）。HANDOFF starter：session 鎖定則 SW 回 `WALLET_LOCKED` 即使密碼正確。採第 2 輪建議的「一律失敗」支，與 H1／H2 同一威脅模型。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉** | INDEX「1–2 字母」與 HOW `iconLetter` 1–2 字一致。 |
| L2 | **仍開**（非阻擋） | GUIDELINES 出貨表仍寫 `CHANGELOG.md`；本版 INDEX 連倉庫現況 `changelog.md`。未在本版已定案解釋，但不擋實作。 |
| L3 | **關閉** | HOW：**名稱鎖定為** `wallet.exportAccountSecret`。INDEX／HANDOFF／驗收用同一名。 |
| L4 | **仍開**（非阻擋） | INDEX 文件地圖仍只提覆寫「零餘額仍列出」；鎖定看餘額與私鑰進 popup 的覆寫寫在已定案／HOW 覆寫節。讀地圖的人可能漏看，但已定案已自足，不構成分叉。 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| `cd wallet && npm run build` | 可 | 無 |
| Popup 約 384px；Home Token／Activity Tab | 可 | 鎖定時無 Home：H1 已關 |
| Menu 三項、無 Lock、外側可關 | 可 | 無 |
| Lock icon 在 hamburger 左、可鎖定 | 可 | 鎖定後只 `#locked`：已定案 |
| SOL 第一列；零 SPL 不列；USD「—」 | 可 | 同 mint 加總：M2 已關 |
| Activity empty、無假交易 | 可 | 無 |
| Rename／Manage／Add 整頁；Add 三種 | 可 | Back：M3 已關 |
| Reveal：signing＋正確密碼；錯誤密碼；read-only 無入口；secret 不進 storage；離開後 DOM 無 secret | 可 | SW 鎖定時 export：M7 已關（一律 `WALLET_LOCKED`） |
| 鎖定後只見 `#locked`，無 Home Token；解鎖後方案 A Home | 可 | H1 已關 |
| 刪除／read-only 拒簽／disconnect 同 0.2.0 | 可 | 無產品語意發明 |
| 無 Helius／Jupiter 呼叫 | 可 | 無 |
| 無 hardcode 密碼；pending 不進 storage | 可 | Reveal 非 pending |

## 與現碼抽樣

現碼未做本版 **≠** 設計 HIGH。

| 錨點 | 現行 | 與提案 |
|------|------|--------|
| `popup/style.css` | `body` `min-width: 320px` | 提案 384px；加寬即可 |
| `popup/main.ts` 資產列 | SOL 第一列；**所有** legacy SPL（含 0）；未按 mint 加總 | 濾 0 SPL＋mint 加總＝本版增量 |
| `popup/main.ts` `render` | `#home` 只看有無 active，**不**看 `unlocked`（與 0.2.0 鎖定可看餘額一致） | 本版須改為鎖定只 `#locked`；屬已定案覆寫，非互斥 |
| `commands.ts` | 無 `wallet.exportAccountSecret` | 提案聯集增量 |
| `background/index.ts` | `wallet.*` 僅 `isExtensionPage`；pending 記憶體 Map；結果指定 tab；`WALLET_LOCKED` 已用於 sign／delete | 與提案相容；Reveal 同閘門；鎖定時 export **須**一律 `WALLET_LOCKED`（M7 已寫進契約；現碼尚無該 command，實作時對齊） |
| `content/index.ts` `PAGE_COMMANDS` | ping／connect／disconnect／signMessage／signTransaction | 不含 export；與非目標相容 |
| `inject/wallet.ts` | 無 signIn／signAll／signAndSend | 與「不改能力表」相容 |
| 無 hardcode 密碼、無 pending 入 storage | 抽樣未見相反主路徑 | 提案未推翻禁區 |

未把 `brainstorm/` 或 `../solibra-wallet` 當現行程式。backlog [`0.3.0-ui-scheme-a.md`](../../backlog/0.3.0-ui-scheme-a.md) 僅構想，且寫明以 INDEX 為準。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉 | INDEX 繼承／設定鎖定／對照／驗收；HOW 畫面表＋覆寫；reasoning；HANDOFF |
| H2 | HIGH | 關閉 | INDEX Reveal；HOW 導航＋command 表；reasoning 否決；HANDOFF |
| M1 | MEDIUM | 關閉 | INDEX Reveal session；HOW SW 副作用 |
| M2 | MEDIUM | 關閉 | INDEX Token 顯示規則；HOW 規則 2–4 |
| M3 | MEDIUM | 關閉 | HOW Back |
| M4 | MEDIUM | 關閉 | INDEX 繼承＋Reveal 覆寫；HOW 覆寫節 |
| M5 | MEDIUM | 關閉 | INDEX 驗收＋手驗指令 |
| M6 | MEDIUM | 關閉 | HOW Reveal 閘門＋聯集；INDEX 錨點 |
| M7 | MEDIUM | 關閉 | INDEX Reveal 鎖定一律 `WALLET_LOCKED`；HOW 失敗表＋SW 節；HANDOFF starter |
| L1 | LOW | 關閉 | INDEX Token 卡片；HOW `iconLetter` |
| L2 | LOW | 仍開 | 非阻擋；GUIDELINES vs `changelog.md` |
| L3 | LOW | 關閉 | HOW 名稱鎖定 |
| L4 | LOW | 仍開 | 非阻擋；INDEX 文件地圖摘要偏窄 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-01 | 可行；未關 HIGH：H1、H2。應修 M1–M6。報告非正式契約。 |
| 第 2 輪複審 | 2026-10-01 | 可行；無未關 HIGH，門檻通過。H1／H2、M1–M6、L1／L3 關閉。應修 M7。L2／L4 非阻擋。 |
| 第 3 輪複審 | 2026-10-01 | 可行；無未關 HIGH；無未關應修 MEDIUM。M7 關閉。門檻通過。L2／L4 仍開、非阻擋。 |
