# 0.40.0 HANDOFF

**狀態：** `shipped`（2026-10-14）。手驗通過；見 [implementation-review.md](./docs/implementation-review.md)。

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [docs/how.md](./docs/how.md)
3. [docs/design-review.md](./docs/design-review.md)
4. [`connect-consent-ux.html`](../../design-demos/connect-consent-ux.html)

## 產品摘要

Connect 同意頁：置中站點＋帳戶、主按鈕「連線」、無 connectLead。

## Track

1. ConnectPage + CSS + i18n

## Paste-ready

```text
讀 dev-docs/roadmap/0.40.0/INDEX.md、docs/how.md。實作 ConnectPage 與 popup/popout connect CSS；ui-messages approval.connect/connecting。cd wallet && npm run typecheck && npm run build。手驗 test-web connect。不要 commit。
```
