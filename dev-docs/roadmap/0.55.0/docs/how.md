# How the 0.55.0 harness is laid out

## Behavior

Files `test/e2e/scenarios/01-devnet-sign-and-send.md` through `07-v1-sign.md` are the steps. The agent follows `.agents/skills/e2e-wallet/SKILL.md` and `test/e2e/README.md` for validator, mock, unlock, and the single airdrop. The scenario file's **Pass** paragraph is the only verdict.

## Visual

1. Read `test/e2e/visual/matrix.yaml`.
2. For each shot, use that shot's `shells`, `prep`, `settings`, `enter`, and `trigger`.
3. Compare the live frame to `test/e2e/visual/refs/{shell}/en/{id}.png` using only the `look` list in `test/e2e/visual/README.md`.
4. On a miss, name the shot id and shell. Do not overwrite the PNG until the maintainer confirms. Then update `walletVersion`, `branch`, `git`, and `recordedAt` in `test/e2e/visual/manifest.json`.

Popup captures stay at the default toolbar size. Side panel captures use `#btn-shell-to-sidebar`.

## Checks for this version

```text
cd test/e2e && bun install
```

Confirm `test/e2e/package.json` lists no `pngjs` or `pixelmatch`, and that each `matrix.yaml` `id` has a PNG for every shell in that shot's `shells` list.
