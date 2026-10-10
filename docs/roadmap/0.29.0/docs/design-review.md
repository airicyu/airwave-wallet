# Design review — 0.29.0 Airwave Wallet

- 日期：2026-10-10（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**（累加於初審；穩定 ID 未重編號）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：同初審（現碼未做本版 ≠ 設計 HIGH）
- **總評：** 無未關閉 HIGH；初審 M1–M7 已寫進 INDEX／HOW／HANDOFF，審查門檻通過。開工前應修 M8（Home 停住鈕導向未寫死）。

## Findings（累加）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

（無）

未違反 pending 權威、結果只回發起 tab、chrome.storage＋onChanged、pending 不進持久 Zustand、custody、未宣告新 Wallet Standard 方法。本版不改 pending 生命週期；`rpcGuideDismissed` 屬 settings 布林、非秘密。現碼仍把 Mainnet 空 `active` 退回官方公用 URL——那是 0.27.0 行為，不是設計 HIGH。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉** | INDEX「需 RPC 的命令」→ HOW 命令表。HOW 已列 `wallet.getHomeTokens`、`wallet.getHomeActivity`、`wallet.beginSend`、`wallet.listClosableTokenAccounts`／`planCloseEmpty`／`commitCloseEmpty`、`ui.simulatePendingTx`、核准後錢包內廣播／收回租金、`dapp.signAndSendTransaction` 核准後廣播；Mainnet 未就緒不建 RPC／不 fetch／不 WebSocket，回 `MAINNET_RPC_UNSET`（UI 能擋則不發）。 |
| M2 | **關閉** | HOW：空字串禁止傳入 `solanaRpcForUrl`、`simulateTransactionRpc`、`createSolanaRpc`、`createSolanaRpcSubscriptions`。INDEX 需 RPC 的命令同禁。 |
| M3 | **關閉** | INDEX「網站簽名」＋ HOW：`dapp.signTransaction` 與 `dapp.signAndSendTransaction` 仍開審批殼；`signAndSend` 核准後不廣播、錯誤只回發起 tab／frame、`MAINNET_RPC_UNSET`；`signTransaction` 仍只簽。HANDOFF starter 已摘要。採初審方案 A。 |
| M4 | **關閉** | INDEX 首次引導：主按鈕與略過**兩者都**寫 `rpcGuideDismissed: true`。HOW 同句。HANDOFF starter 同句。 |
| M5 | **關閉** | INDEX「Mainnet 刪光」：`urls: []`、`active: ""`、不得把官方 URL 加回 `urls` 或當 radio。HOW：刪到零條同一形狀；列表不含官方公用列；寫入時機與 0.27.0 相同。 |
| M6 | **關閉** | INDEX Track 1 驗收指向 HOW `effectiveRpcUrl` 對照表。HOW 表：空 active、官方字面、不合法、active 不在 `urls` → Mainnet `""`；就緒則該 URL。Devnet 維持 0.27.0。 |
| M7 | **關閉** | INDEX Home：未就緒且無 Helius **不發** `wallet.getHomeActivity`；有 Helius 維持 0.28.0 `before`／`hasMore`、不改組 URL。HOW 命令表＋例外句同。 |
| M8 | **仍開** | HOW 引導主按鈕寫死進 `settings-rpc`。Home 停住只定 catalog `home.goSetRpc`，未寫導向。驗收「可進 RPC 設定」可被做成 Settings hub。建議與引導同一句：進 `settings-rpc`。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | 記錄 | `ClusterRpcConfig.active` 現碼註解「空字串＝該鏈公開節點」；本版 Mainnet 空＝未設定。實作改註解即可。 |
| L2 | **關閉** | HANDOFF starter 已含概念稿路徑、`rpcGuideDismissed` 雙鈕、`signAndSend` 不廣播。 |
| L3 | 記錄 | `NetworkScreen` 摘要現寫死官方 URL，與 INDEX「就緒顯示自訂、未就緒 catalog」衝突——屬 Track 2 現碼差距，非設計互斥。 |
| L4 | 記錄 | 引導次按鈕與雙鈕殼底位置未對 `design-principles` 頁殼逐條寫；HOW 已允許無帳戶 pill、須中間捲＋底列主按鈕。概念稿仍是 Track 3 產物。 |
| L5 | 記錄 | 出貨才回寫 DOMAIN「Mainnet RPC 未設定」；合理。 |
| L6 | 記錄 | HOW 錢包內核准後廣播未點名 `ui.resolvePending`。INDEX 已寫未就緒不進確認。SW 若仍收到核准，應與命令表同級擋、不對空 `rpcUrl` 送出。 |
| L7 | 記錄 | 引導全屏未寫死 `View` 名（現 `View` 聯集無此屏）。實作自取一鍵即可；衝突時以 INDEX 行為為準。 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| `cd wallet && npm run typecheck` 與 `npm run build` | 可測 | 無 |
| Devnet 無自訂：餘額／airdrop 仍走官方 devnet | 可測 | INDEX 未列 airdrop 命令名；現碼無獨立 airdrop command。Devnet `effectiveRpcUrl` 維持 0.27.0 即可 |
| Mainnet 無自訂：網路不出現對 `api.mainnet-beta.solana.com` 的 JSON-RPC；Home Tokens 停住且可進 RPC | 可測 | M1／M2 已關閉。Home 鈕落點見 M8 |
| 只填 Helius、不填 Mainnet RPC：Tokens 仍停住；不因此打官方 RPC | 可測 | 無（通道已定案） |
| 填一條合法 Mainnet 自訂後 Tokens 打該 URL | 可測 | 合法集沿用 0.27.0 `isAllowedCustomRpc` |
| 第一個帳戶後一屏引導；略過後不再全屏；Home 未就緒仍停住 | 可測 | M4 已關閉 |
| 未封裝擴充走完（popup 或側欄） | 可測 | 無 |
| 文件無真實 key、助記詞、密碼 | 可測 | 本輪契約檔未見 |

## 與現碼抽樣

現碼未做本版 ≠ 設計 HIGH。

| 現碼 | 與提案 |
|------|--------|
| `effectiveRpcUrl`：無合法 `active` 則 `PUBLIC_RPC_BY_CLUSTER[cluster]`（Mainnet＝官方公用） | 本版 Mainnet 改回 `""`；Devnet 維持 |
| `customRpcForCluster`／`normalizeClusterRpc` 已丢掉官方字面與不合法 URL | 與「官方 URL＝未設定」相容；須停止其後的官方後備 |
| `CURRENT_SCHEMA_GENERATION === 1`；`Settings` 無 `rpcGuideDismissed` | 本版加欄、世代仍 1 |
| `RpcClusterCard` 兩鏈都 prepend 官方列；`NetworkScreen` 摘要寫死官方 URL | Track 2 要改；非禁區衝突 |
| 首帳戶成功後 `navigateTo("home-token")`（如 Accounts） | Track 3 插入引導條件 |
| `dapp.signTransaction`／`signAndSendTransaction` 現在一律可 enqueue | 與仍開審批相容；核准後送出依 M3 |
| Activity 無 Helius 走 Kit `getSignaturesForAddress(settings.rpcUrl)` | 未就緒須停；有 Helius 不改 0.28.0 翻頁 |
| `solanaRpcForUrl` 無空字串檢查 | 見已關閉的 M2 |

未把 `docs/brainstorm/` 或 `../solibra-wallet` 當已定案。`backlog/mainnet-rpc-first-run.md` 僅構想；拍板項已進 INDEX。待拍板：（無）。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| M1 | MEDIUM | 關閉 | INDEX「需 RPC 的命令」；HOW「失敗 code」命令清單 |
| M2 | MEDIUM | 關閉 | HOW 就緒判斷「空字串禁止傳入…」；INDEX 同禁 |
| M3 | MEDIUM | 關閉 | INDEX「網站簽名」；HOW 失敗 code；HANDOFF starter |
| M4 | MEDIUM | 關閉 | INDEX「首次引導」兩者 dismissed；HOW 首次引導；HANDOFF starter |
| M5 | MEDIUM | 關閉 | INDEX「Mainnet 刪光」；HOW Settings／刪到零條 |
| M6 | MEDIUM | 關閉 | INDEX Track 1 驗收；HOW `effectiveRpcUrl` 對照表 |
| M7 | MEDIUM | 關閉 | INDEX Home；HOW 失敗 code＋Helius 例外 |
| M8 | MEDIUM | 仍開 | — |
| L1、L3–L5、L6、L7 | LOW | 記錄 | 非阻擋 |
| L2 | LOW | 關閉 | HANDOFF starter |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-10 | 無 HIGH；可行。應修 M1–M7 後再開實作 |
| 第 2 輪複審 | 2026-10-10 | M1–M7 已關閉。無 HIGH。門檻通過。應修 M8 後開工 |
