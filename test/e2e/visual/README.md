# Visual check

Shot list: [`matrix.yaml`](./matrix.yaml). One golden per shot: `refs/{shell}/en/{id}.png`. [`manifest.json`](./manifest.json) records which wallet version those PNGs were taken from.

Locale is English. Popup shots use the toolbar action popup at Chrome's default size. Approve shots are sidepanel only, opened with `#btn-shell-to-sidebar` from Home. Do not open the sidepanel as a tab, and do not maximize the popup.

## How to check

For each shot, reach the frame in `enter` / `trigger`, then look at the live UI next to the golden. Judge only that shot's `look` lines.

These differences are expected and are not failures: Side panel height, pixels outside the wallet surface, the account address, and the exact SOL amount.

If a `look` line is missing or wrong, say which shot and shell, and whether changelog / design demos / roadmap for the manifest version explain it. Replace the PNG only after the maintainer confirms.

## Record

Build `wallet/dist`, load it, start mock and test-web, and `bun run e2e-prep -- <address>` when the shot's `prep` is `e2e-prep`. Save the new PNG over `refs/{shell}/en/{id}.png` and update `manifest.json` (`walletVersion`, `branch`, `git`, `recordedAt`).
