# HANDOFF — 0.28.0

## 讀檔順序

1. [AGENTS.md](../../../AGENTS.md)、[GUIDELINES.md](../GUIDELINES.md)、[design-principles.md](../../design-principles.md)
2. [INDEX.md](./INDEX.md)
3. [docs/how.md](./docs/how.md)
4. [docs/reasoning.md](./docs/reasoning.md)

## 產品摘要

Activity 先顯示最近最多 20 筆。`.screen-body` 捲到底且上一頁滿 20 時，用最舊 signature 當 `before` 再抓一頁接在後面。底欄 CSS loading widget；失敗留列＋`error.activityOlderLoad`，須離開底部再捲才重試。列上時間是本地 `YYYY-MM-DD HH:MM:SS`。Enhanced 列有 mint 時左側 https token icon（持倉快取再 Jupiter）；沒有 mint 不畫圖。

## Track

1 命令與查詢游標 → 2 畫面 infinite scroll → 3 token icon

## 禁區

不要把活動寫進 storage。不要 Helius 失敗改簽名粗列。不要載入更多按鈕。不要宣告新 Wallet Standard 方法。不要改 `../solibra-wallet`。不要 commit，除非使用者要求。本版不是簽署 AI 評估卡。

## Paste-ready starter prompt

```text
只認檔案。讀 docs/roadmap/0.28.0/HANDOFF.md、INDEX.md、docs/how.md、docs/reasoning.md。依 Track 1→2 實作。wallet.getHomeActivity 可選 payload.before；Helius 與 getSignaturesForAddress 帶 before。每頁 20。HomeActivityList：第一頁無 before；sentinel 的 IntersectionObserver root 是 .screen-body。滿 20 才 hasMore。下一頁底欄 CSS widget（activity.loadingOlder aria-label），成功接列去重，失敗留列＋error.activityOlderLoad，須 sentinel 先離開可見區才能重試。切帳戶／cluster／rpc／heliusConfigured、或離開 Activity 再進入：作廢進行中的下一頁、清列、整頁載入中重抓第一頁。過期回應不得 append。下一頁失敗＝信封 ok 不是 true、或 result.error、或拋錯；phase 保持 list。列上時間 activityWhen 本地 YYYY-MM-DD HH:MM:SS，刪 activity.when.* catalog。跑 wallet/scripts/gen-ui-messages.mjs。cd wallet && npm run typecheck。不要 commit。
```

## 完成檢查

- [x] Track 1 `before` 查詢
- [x] Track 2 sentinel、widget、失敗重試、catalog
- [x] Track 3 token icon
- [x] `cd wallet && npm run typecheck`
- [x] 未封裝擴充手驗（INDEX 驗收；實作審查 H1）
