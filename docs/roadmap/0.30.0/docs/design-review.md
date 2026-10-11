# Design review — 0.30.0 Airwave Wallet

- 日期：2026-10-11（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)；上游 [`../../0.29.0/INDEX.md`](../../0.29.0/INDEX.md)、[`../../0.27.0/INDEX.md`](../../0.27.0/INDEX.md)（key 形狀）；構想（非契約）[`../../backlog/sign-tx-ai-security-eval.md`](../../backlog/sign-tx-ai-security-eval.md)、[`../../backlog/bubble-harness-runtime.md`](../../backlog/bubble-harness-runtime.md)、[`../../backlog/bubble-harness-handoff.md`](../../backlog/bubble-harness-handoff.md)；概念稿（視覺非架構）[`../../../design-demos/tx-ai-analysis-ux.html`](../../../design-demos/tx-ai-analysis-ux.html)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/manifest.config.ts`、`wallet/src/shared/storage-keys.ts`、`wallet/src/approval/shell.ts`、`wallet/src/background/pending/*`、`wallet/src/background/index.ts`（擴充頁閘）
- **總評：** 無未關閉 HIGH；同意的 MEDIUM（M1–M11）均已關閉。提案不可行＝否。**審查門檻通過**，可開工實作產品碼（閘門後規劃宜升格 INDEX「草案／rough」用語並補 HANDOFF 實作 paste-ready——L1／L2，非阻擋）。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — 確定性 flags 未寫死「只信 SW 本地計算」— **關閉**

關閉位置：INDEX「確定性 flags」「Flags 下限」「等級來源」；HOW「確定性 flags（僅 SW）」「Decisions」`state.flags`；reasoning「為何 flags 只信 SW」。

複審核對：契約寫死 flags 只由 SW（或同特權、非 sandbox／offscreen）對快照位元組本地計算；`TxAiAssessState.flags`、Decisions `state.flags`、下限一律只用此結果；sandbox／模型／tool 回傳 flags／等級字串忽略。`decode_message` 回傳 flags 僅供模型閱讀——與 H1 不衝突。

#### H2 — Host tool／RPC 允許集合未列死 — **關閉**

關閉位置：INDEX「Tool 面」；HOW「Host tool 允許表（寫死）」＋ JSON-RPC method 允許集合與禁止清單。

複審核對：tool 名表完整（含 `decode_message`／`get_accounts`／`simulate`／扁平 `rpc_*`）；禁止泛用 `rpc(method, params)` 與 `sendTransaction`／`sendRawTransaction`／`requestAirdrop`；未知名／method 拒絕；POC 變更不自動改契約；不開放 sandbox 任意 URL token meta。

### MEDIUM

| ID | 本輪狀態 | 關閉位置／依據 |
|----|----------|----------------|
| M1 | **關閉** | INDEX「Runtime 隔離」；HOW「Offscreen 承載（寫死）」——offscreen 只轉發；OpenRouter／tools／Decisions／flags **僅** SW；不持 key、不讀秘密欄。 |
| M2 | **關閉** | INDEX「Tool 面」CSP 句；HOW「Sandbox CSP」——`connect-src 'none'`（或同等）；LLM／RPC 出網只經 SW。 |
| M3 | **關閉** | INDEX「觸發條件」；HOW「Assess 生命週期」§1——enqueue 成功後 SW 自動 `assess.start` 恰好一次；不重入；無手動再分析；殼不發明第二條 start。 |
| M4 | **關閉** | INDEX「UI」；HOW「Pending 記憶體」——`ui.getPending` 含 `TxAiAssessState`；短輪詢或 SW→擴充頁事件；禁止為 assess 寫 storage。 |
| M5 | **關閉** | INDEX「Assess 位元組」；HOW「Assess 生命週期」§2——start 當下 `workingTx ??` 原文快照；CU 變更不重跑、不更新快照。 |
| M6 | **關閉** | HOW「Assess 生命週期」§6——wall-clock 90s；`maxSteps` 12；逾時→abort→`error`／UI unknown。 |
| M7 | **關閉** | HOW「Assess 生命週期」Mainnet 段；INDEX 驗收「Mainnet RPC 未就緒」——tool 失敗→error／unknown，不擋核准／模擬。 |
| M8 | **關閉** | HOW「訊息橋信任根」——offscreen 綁 sandbox `MessageEvent.source`；SW 只接受自家 offscreen／擴充頁；信任根非自報 `from`。 |
| M9 | **關閉** | INDEX「報告生命週期」；HOW「Assess 生命週期」§7——`ui.resolvePending`／`takePending`／逾時／關窗／`ui.abortPending`／`clearSignTxState` 同級皆清理；resolve **不得**等 assess。 |
| M10 | **關閉** | INDEX「Key 存放」＋驗收；HOW「Settings 欄位」——`toPublicSettings`／`getState` omit key；`readIntegrationSecrets` 增 `openRouterApiKey`（僅擴充頁）；`normalizeSettings` 未知模型回退；`PublicSettings` 不得含明文 key。 |
| M11 | **關閉** | INDEX「驗收」——假 tool／`sendTransaction` 拒絕；flags 下限手驗／單元；locale≠zh-Hant；Decisions 失敗→灰 icon；Mainnet 未就緒路徑。 |

本輪無新增 MEDIUM。同意項均已落檔，無「仍開應修」MEDIUM。

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **仍開，非阻擋** | INDEX／狀態仍標「rough／提案稿」。門檻已通過；規劃側宜去掉「草案」或升格用語，避免實作 agent 以為可自行改語意。 |
| L2 | **仍開，非阻擋** | HANDOFF 仍寫閘門待複審、實作 paste-ready 待補。複審通過後應更新閘門句並補實作 starter（Track 順序＋禁區句）。 |
| L3 | **關閉** | HOW「Decisions」——「路徑若變更須改本契約再出貨」。 |
| L4 | **仍開，非阻擋** | 概念稿 `tx-ai-analysis-ux.html` 非架構契約；INDEX 已聲明視覺同意。實作跟 catalog／design-principles，勿把 demo 字串當已定案。 |
| L5 | **關閉** | INDEX「Runtime 隔離」；HOW「Assess 生命週期」§8——同時最多一筆 assess；第二筆等結束或直接 `error`（擇一實作須一致）。 |

本輪無新增 LOW／HIGH。

## 驗收對照

| 驗收句（INDEX） | 設計層是否可測 | 缺口 |
|----------------|----------------|------|
| `typecheck`／`build` | 可測 | 無（實作項） |
| Settings 四欄；未知 Decisions 回退；`getState`／`toPublicSettings` 無明文；secrets 含 key | 可測 | 無（M10 已關） |
| off／無 key：無控件、無 OpenRouter | 可測 | 無（M3 觸發已寫死） |
| on＋key：運算中→icon；報告；locale＝en／zh-Hans | 可測 | 無（M4／M11） |
| 分析中可改 CU／refresh／核准；核准不等待 | 可測 | 無（M5／M9） |
| Refresh 不重跑 AI、不洗報告 | 可測 | 無 |
| Approve／reject／abort 後無上筆報告；offscreen 已關 | 可測 | 無（M9） |
| Sandbox 無 `chrome.storage`／特權訊息 | 可測 | 無（M2 CSP＋驗收） |
| 假 tool／寫入 RPC 拒絕；flags 下限；Decisions 失敗灰 icon；Mainnet 未就緒 | 可測 | 無（H2／M7／M11） |
| 文件無真實秘密；未封裝擴充主路徑 | 可測 | 無 |

待拍板欄＝空。GUIDELINES 硬契約（pending 唯 SW、結果只回發起 tab／frame、storage＋onChanged、pending 不進持久 Zustand、無硬編碼密碼、未實作 WS 方法不宣告）——本版 INDEX／HOW／HANDOFF **未推翻**；assess 掛 SW pending 記憶體、不 persist，與禁區一致。

## 與現碼抽樣

現碼未做本版 ≠ 設計 HIGH。下列為現行行為與提案的對照（互斥處＝Track 應改；相容處＝可沿用）。

| 現碼 | 0.30.0 提案 |
|------|-------------|
| `manifest.config.ts`：無 `offscreen`、無 `sandbox.pages`；permissions 含 storage／tabs／sidePanel | Track 2 加 offscreen＋sandbox；出貨對齊 `0.30.0` |
| `Settings`／`PublicSettings`：僅 Jupiter／Helius 秘密＋configured | 新欄＋`openRouterConfigured`；omit key（M10） |
| `isExtensionPage` 閘 `wallet.*`／`ui.*` | 同閘；`readIntegrationSecrets` 形狀擴充 |
| `pending` Map＋`clearSignTxState`；`ui.getPending` 回整筆；shell 只帶 `requestId` | assess 掛同一記憶體；結束同級清理；不進 storage |
| `approval/shell.ts`：模擬／CU／approve／reject；無 AI 控件 | Track 4 並行加控件；refresh 仍只 `ui.simulatePendingTx` |
| 無 offscreen／sandbox 程式 | 新建；現碼缺失≠設計缺陷 |

未把 `docs/brainstorm/` 或 `../solibra-wallet` 當現行程式。

## 焦點核對（本輪）

| 焦點 | 第 2 輪結論 |
|------|-------------|
| offscreen＋`manifest.sandbox` 是否自足 | **自足**：執行點（M1）、CSP（M2）、橋信任根（M8）、清理（M9）、單筆互斥（L5）已寫滿 |
| Tool／RCE 面 | **H2 關閉**；禁 eval／動態 import 仍在 INDEX；flags **H1 關閉** |
| 與 pending／模擬並行 | 觸發（M3）、bytes（M5）、resolve 不等待（M9）已關 |
| Settings key 形狀 | M10 關閉；對齊 0.27 句式 |
| Decisions＋flags 下限 | 來源與下限表完整；失敗→unknown |
| 非目標偷渡 | 未見代簽／auto-approve／persist／手動再分析／npm 出貨 harness／改 WS 表 |
| Locale 報告 | 已定案＋驗收非繁中手驗 |
| Approve／reject 丟棄 | 清理入口列全 |

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | **關閉** | INDEX「確定性 flags」／「Flags 下限」／「等級來源」；HOW「確定性 flags」「Decisions」 |
| H2 | HIGH | **關閉** | INDEX「Tool 面」；HOW「Host tool 允許表」 |
| M1 | MEDIUM | **關閉** | INDEX「Runtime 隔離」；HOW「Offscreen 承載」 |
| M2 | MEDIUM | **關閉** | INDEX「Tool 面」；HOW「Sandbox CSP」 |
| M3 | MEDIUM | **關閉** | INDEX「觸發條件」；HOW「Assess 生命週期」§1 |
| M4 | MEDIUM | **關閉** | INDEX「UI」；HOW「Pending 記憶體」 |
| M5 | MEDIUM | **關閉** | INDEX「Assess 位元組」；HOW「Assess 生命週期」§2 |
| M6 | MEDIUM | **關閉** | HOW「Assess 生命週期」§6 |
| M7 | MEDIUM | **關閉** | HOW Assess Mainnet 段；INDEX 驗收 |
| M8 | MEDIUM | **關閉** | HOW「訊息橋信任根」 |
| M9 | MEDIUM | **關閉** | INDEX「報告生命週期」；HOW「Assess 生命週期」§7 |
| M10 | MEDIUM | **關閉** | INDEX「Key 存放」＋驗收；HOW「Settings 欄位」 |
| M11 | MEDIUM | **關閉** | INDEX「驗收」checklist |
| L1 | LOW | 仍開，非阻擋 | （待規劃升格 INDEX 狀態用語） |
| L2 | LOW | 仍開，非阻擋 | （待閘門後補 HANDOFF 實作 paste-ready） |
| L3 | LOW | **關閉** | HOW「Decisions」路徑變更句 |
| L4 | LOW | 仍開，非阻擋 | — |
| L5 | LOW | **關閉** | INDEX「Runtime 隔離」；HOW Assess §8 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-11 | 有未關閉 HIGH（H1、H2）。門檻未通過。不可行＝否。應修 M1–M11。 |
| 第 2 輪複審 | 2026-10-11 | H1／H2／M1–M11 均關閉；L3／L5 關閉；L1／L2／L4 非阻擋。不可行＝否。**審查門檻通過**。 |
