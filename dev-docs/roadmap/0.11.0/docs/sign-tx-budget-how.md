# HOW — 0.11.0 交易費與 Compute Budget

上游差額／失敗 notice／鎖定：[0.10.0 sign-transaction-how](../../0.10.0/docs/sign-transaction-how.md)。INDEX 衝突以 INDEX 為準。

## 簽名槽

`VersionedTransaction.signatures`：任一元素存在且 **不是 64 個 0** → 已簽。全缺或全 0 → 未簽。**已簽禁止寫 `workingTx`。**

## Compute Budget

Program：`ComputeBudget111111111111111111111111111111`。

- data[0]＝2 + 4 bytes LE u32 → limit
- data[0]＝3 + 8 bytes LE u64 → price

寫入前：同 disc **多於一條** → 失敗，不改 `workingTx`，UI「無法寫入計算預算」。

寫入：已有該 disc（恰好一條）→ 只改該 ix data。沒有 → 插入一條（慣例 compiled ix index 0）。禁止 append 成兩條同 disc。其它 disc 不動。

靜態 keys 已含該 program → 不改 keys 序。尚未含 → program id 加在 unsigned 區（readonly unsigned），**禁止** `staticAccountKeys[0]` 與任何 signer 槽；保持 `numRequiredSignatures`；重對所有 compiled ix index。v0 lookups 原樣。組不出 → 不改 `workingTx`。

**Phase 1 量測副本不得寫入 `workingTx`。** `workingTx` **只**在「建議 limit（或使用者給的 limit）＋ Default CU price（或使用者給的 price）」**寫入成功後**更新。

批准：`workingTx ?? 原始 payload.transaction`。

## Builtin 表（phase 1 預設公式）

下列 program id 的 compiled ix 各算 **3,000** CU；**表上沒有的一律 200,000**。加總後 ×1.25 再 clamp 1,400,000（僅 fail 路徑無原始 limit 時）。

| programId | 名 |
|-----------|-----|
| `11111111111111111111111111111111` | System |
| `Vote111111111111111111111111111111111111111` | Vote |
| `Stake11111111111111111111111111111111111111` | Stake |
| `ComputeBudget111111111111111111111111111111` | Compute Budget |
| `Config1111111111111111111111111111111111111` | Config |
| `AddressLookupTab1e1111111111111111111111111` | Address Lookup Table |
| `BPFLoaderUpgradeab1e11111111111111111111111` | BPF Upgradeable Loader |
| `BPFLoader2111111111111111111111111111111111` | BPF Loader 2 |
| `BPFLoader1111111111111111111111111111111111` | BPF Loader |
| `Ed25519SigVerify111111111111111111111111111` | Ed25519 native |
| `KeccakSecp256k11111111111111111111111111111` | Secp256k1 native |
| `NativeLoader1111111111111111111111111111111` | Native Loader |

公式只用於 fail 路徑且**沒有**原始 SetComputeUnitLimit。對 **已插入兩條 CB 的 phase 1 副本** 頂層 compiled ix 加總 → `ceil(sum × 1.25)` → clamp `[1, 1_400_000]`。禁止先 clamp 加總再乘。

## `ui.simulatePendingTx`

Payload `{ requestId, cuLimit?: number, cuPrice?: number }`。

| 情況 | 行為 |
|------|------|
| 無 pending／kind 不對 | `NOT_FOUND` |
| deserialize 失敗 | `unparseable` |
| 已簽 | 忽略 cu。模擬原始。不寫 `workingTx`。limit／price 能從原 message 解則算優先費 |
| 未簽，兩欄省略，**無** `workingTx` | Phase 1（副本）→ 建議 limit → price＝settings `defaultCuPrice` → **成功寫入後**設 `workingTx` → phase 2 |
| 未簽，兩欄省略，**已有** `workingTx` | **只** phase 2 該份，不再 phase 1／1.5 |
| 未簽，兩欄皆在界內 | 寫入該組合（成功則更新 `workingTx`）→ phase 2 |
| 只給一欄或越界 | `INVALID_PAYLOAD`，不改 `workingTx` |

同一 pending：受理時遞增 `writeSeq`；較舊 seq **不得**覆寫較新已接受的 `workingTx`。Phase 2 差額同 0.10.0。Phase 1 不填給 UI 用的 `deltas`。

每次 `simulateTransaction` 15 秒。不必為手續費打 `getFeeForMessage`。Result 費用欄：`sigFeeLamports`、`priorityLamports`、`totalFeeLamports`、`cuLimit`、`cuPrice`（未知則 null）。popout **禁止**再用 `feeLamports`。

popout：進殼第一次省略 cu。估計中（尚無合法兩欄）或 CU dirty 時重試 disabled。有已提交兩欄後重試與「套用 CU」**必須帶齊**。回包用遞增世代丟棄過期。打字不發 command。

## 費用

- `sigFeeLamports`＝`5000 * numRequiredSignatures`
- `priorityLamports`＝`ceil(cuLimit * cuPrice / 1_000_000)` lamports（整數進位，與鏈上相同；缺則 null）
- `totalFeeLamports`＝兩者皆有則相加，否則 null
- UI：lamports／1e9 去尾 0 ＋「SOL」；null →「未知」，禁止用 0 充數

## Settings

樞紐第五列（API keys 與錢包密碼之間），標籤 Default CU price。`defaultCuPrice` 出廠 25000。

## 交易明細 ix

每條頂層 compiled ix：program 標籤、可選 HOW desc、`accountKeyIndexes` 對出的公鑰前 4…後 4（對不出「未解析」）、data 連續小寫 hex（空則「（空）」）。不解欄位。CPI 不列。
