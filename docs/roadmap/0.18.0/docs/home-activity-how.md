# Home Activity — HOW

## 誰被查

`handleGetHomeActivity` 讀目前 active 帳戶，地址用 `getExposedPublicKey`（聚合＝`mainPubkey`）。沒有 active：`{ rows: [] }`，畫面為「尚無交易」。有 active，但 `getExposedPublicKey` 結果無法建成合法 `PublicKey`：回 `{ rows: [], error: "unavailable" }`，畫面「活動暫時無法載入」（與無 active 分開）。

## 兩條查詢

| 條件 | 呼叫 |
|------|------|
| `settings.cluster === "mainnet"` 且 Helius URL 能解析出 `api-key` 或 `apiKey` | `GET https://api.helius.xyz/v0/addresses/{owner}/transactions`，query：`limit=20`、`token-accounts=balanceChanged`、`sort-order=desc`、`commitment=confirmed`，以及 `api-key` |
| 其他（devnet、或沒有 key） | `new Connection(settings.rpcUrl, "confirmed").getSignaturesForAddress(owner, { limit: 20 })` |

Helius 非 2xx、逾時（20s）、或 body 不是陣列：整次 `{ rows: [], error: "unavailable" }`。不要退回簽名列表。簽名 RPC 拋錯同樣 `unavailable`。

回應的 `rows` 最多 20。不寫 `chrome.storage`。不把 API key 放進錯誤字串。

## 列

`HomeActivityRow`：`signature`、`kind`（`send`｜`receive`｜`swap`｜`tx`）、`lead`（`fail`｜`ok`｜`null`）、`detail`、`timestampSec`、`solscanUrl`。

Helius `type`（大寫比較）：

1. `SWAP` → `kind: swap`。明細優先 `events.swap` 的 token／native 進出；沒有則用涉及本地址的 token 或 SOL 腿，組成 `付出 → 得到`。
2. `TRANSFER` → 只收集 `fromUserAccount`／`toUserAccount` 等於本地址的腿。有 token 腿就不用 native 腿（避免手續費蓋過代幣）。只有出去 → `send`；只有進來 → `receive`；兩邊都有或都沒有 → `tx`。
3. 其他 type → `tx`，明細為簽名前 4…後 4。

`transactionError != null` → `lead: fail`（種類不變）。簽名粗列：`err != null` 則 `lead: fail`，否則 `lead: ok`，`kind` 一律 `tx`，`detail` 為縮寫。

數量：`rawTokenAmount.tokenAmount` 或 native lamport 以字串／安全整數建成 `BigInt`，再依 decimals 切小數。只有 Helius UI `tokenAmount` number 時，整數用 `String`，小數用 `toFixed(9)` 去掉尾端 0，不與其他筆相加。符號：SOL、USDC、USDT 用代號，其餘 mint 縮寫。概念稿若示範其他代號（如 JUP），產品仍依本規則，不以 demo 列為準。

Solscan：`solscanTxUrl`。devnet 加 `?cluster=devnet`。

## 畫面

`HomeActivityList` 在 `currentView === "home-activity"` 時發 `wallet.getHomeActivity`。切換 active、cluster、`rpcUrl`、`heliusApiUrl` 會先清列再查。每次查詢須可取消或帶世代；**只套用仍有效的那次結果**，過期／已取消回應不得改 phase 或 rows。

| 狀態 | 字 |
|------|----|
| 查詢中 | 載入中 |
| `rows` 空且無 error | 尚無交易 |
| `error` 或 `ok: false` | 活動暫時無法載入 |

標題「活動」。相對時間在 popup 用 `activityWhen`（剛剛、N 分鐘前、N 小時前、昨天、N 天前、N 週前、否則 `M/D`）。

列尾圖示熱區 **32×32**；`<a target="_blank">`，點擊 `preventDefault` 後 `chrome.tabs.create`。URL 必須以 `https://solscan.io/tx/` 開頭。整列沒有點擊。
