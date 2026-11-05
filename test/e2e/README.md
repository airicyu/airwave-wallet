# Airwave e2e

可重複劇本在 `scenarios/`。執行者是能操作 Chrome 的 agent（或人工），步驟見 [`.agents/skills/e2e-wallet/SKILL.md`](../../.agents/skills/e2e-wallet/SKILL.md)。

## 兩種後端（不要混用）

| 角色 | 位址 | 負責什麼 |
| --- | --- | --- |
| `solana-test-validator` | `http://127.0.0.1:8899` | **Solana JSON-RPC**（餘額、airdrop、送交易、確認）。每則劇本用 `bun run e2e-validator` **重置**帳本，再用 `solana airdrop` 等把狀態準備好。 |
| mock server | `http://127.0.0.1:8787` | **外掛 HTTP only**：Helius 活動、Jupiter token search、OpenRouter AI，以及「另一叢集」的 `getLatestBlockhash` / `isBlockhashValid`。回應來自合成 fixture，見 [`fixtures/`](./fixtures/)。 |

不要把 Solana 主叢集 RPC mock 掉——那是 validator 的工作。不要把外掛 API 打到真網——那是 mock 的工作。

**執行期 mock 資料**在 [`fixtures/`](./fixtures/)（合成、可編輯）。可選 `AIRWAVE_E2E_FIXTURES` 覆寫根目錄。

開跑前：

```text
bun run e2e-preflight
```

## 啟動順序

1. `bun run e2e-mock`（長駐）
2. `bun run test-web`（長駐；必要時 `--host 127.0.0.1`）
3. 載入本倉庫建置的未封裝擴充：`wallet/dist`
4. **每一則需要 validator 的劇本**：用 prep **重置帳本並只 airdrop 一次**（不要手動連 airdrop 兩次）

```text
bun run e2e-mock
bun run test-web
bun run e2e-prep -- <錢包地址>          # 預設 --reset + airdrop 2 SOL 一次，並印餘額
# bun run e2e-prep -- <地址> --sol 2 --no-reset   # 僅補一次 airdrop、不重置
```

也可手動：`bun run e2e-validator`（長駐）再 `solana airdrop 2 <地址> --url http://127.0.0.1:8899`，但**同一則劇本只 airdrop 一次**，開跑前用 `getBalance`／Side panel Refresh 確認餘額。

`04`（Helius 活動）不需 validator airdrop。

### Chrome／解鎖／Side panel

- 解鎖密碼永不寫進倉庫或劇本；由執行端 out-of-band 提供。自動化填密對 `chrome-extension://` 通常無效，**Unlock 需人手**（或等同的本機操作）。
- 解鎖後、開跑前核對設定：Cluster／Devnet RPC `http://127.0.0.1:8899`、Debug On、Mainnet blockhash／Jupiter／OpenRouter／Helius 指向 mock `8787`；**預設優先費必須是 `5000`**（尤其 scenario 07；若曾改成 25000 等會 FAIL）。
- 用**真正 Side panel**：工具列 popup 到 Home 後按 `#btn-shell-to-sidebar`（`chrome.sidePanel.open`）。不要把 `chrome-extension://…/sidepanel` 當普通分頁開，也不要開裸 popout／approval URL——否則連線／簽名殼會壞掉。
- 首頁餘額以 Refresh 後為準；validator 剛 reset／airdrop 後舊數字可能還掛在畫面上。

## Mock 固定 blockhash

Mock 的 `getLatestBlockhash` 固定回 `11111111111111111111111111111111`（合法長度；validator 上 `isBlockhashValid` 為 `false`，mock 上為 `true`，給 cluster 不符劇本用）。CORS 允許 `solana-client` header（test-web 會帶）。

## 錢包設定（每則劇本開始前）

- Cluster：Devnet（活動劇本除外）
- Devnet RPC：`http://127.0.0.1:8899`（validator）
- Mainnet 不設自訂 RPC
- Debug mode 開
- Mainnet blockhash RPC：`http://127.0.0.1:8787`（mock；僅外掛探針）
- 需要代幣名稱時，Jupiter API URL：`http://127.0.0.1:8787`
- 需要簽交易 AI 時，OpenRouter base URL：`http://127.0.0.1:8787`
- 活動劇本另把 Helius API URL 設成 `http://127.0.0.1:8787`

`test-web` 預設仍可能打公開 Devnet。劇本要加：`http://127.0.0.1:5173/?rpc=http://127.0.0.1:8899`。Cluster 不符再加 `&otherRpc=http://127.0.0.1:8787`。

不要點 test-web 的「危險樣本」，也不要在錢包裡核准：`#sign-tx-suspicious`、`#sign-tx-nonce`、`#sign-tx-steal`。沒有劇本使用它們。若簽名字畫面已打開，按拒絕。

## Scenario 07（v1）

- 需要能接受 v1 交易的本機 validator：Solana CLI / Agave **4.2+**（`enable_tx_v1`；本機已用 4.3.x 驗證過）。
- 錢包設定裡的預設優先費必須出廠 `5000`（步驟 1 驗「交易內已帶 5000、未被設定覆寫」；步驟 2 才驗省略優先費時帶入設定預設值）。若設定裡是別的數字（例如 `25000`），先改回再跑，否則整則 FAIL。
- 每則前用 `bun run e2e-prep -- <地址>`（或等效 reset＋**單次** airdrop），不要在 prep 之外再 airdrop。
- test-web 按鈕：`Sign transaction（v1）`、`…省略優先費`、`…優先費 0`、`…省略 CU limit`、`…已有簽章`、`signAndSendTransaction（v1，錢包代送）`。

## Scenario 格式

行為劇本是 `scenarios/01`–`07` 的短步驟，判定只看該檔的 **Pass** 段。一律在 Side panel 跑，不要為 popup 再複製一篇。

## 視覺檢查

畫面清單只在 [`visual/matrix.yaml`](./visual/matrix.yaml)。做法見 [`visual/README.md`](./visual/README.md)：對著 `refs/` 看該 shot 的 `look`，不對整張圖做像素比對。Side panel 高度、地址、SOL 數字可以不同。`look` 不符就向 maintainer 匯報，確認後才換金樣。

## 已知限制

- 真實 docked Side panel 難被一般 Playwright 掛上；agent／人工點 UI 即可。

