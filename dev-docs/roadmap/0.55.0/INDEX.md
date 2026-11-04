# 0.55.0 — e2e scenarios and visual checks

- **Status:** `shipped`
- **Changelog:** one paragraph under `0.55.0` (2026-11-05).
- **Upstream:** [0.54.0](../0.54.0/INDEX.md) shipped. No wallet behavior change in this version.

## Product

None. The extension, test-web, and mock server behave as in 0.54.0.

## Docs

1. This file
2. [docs/reasoning.md](./docs/reasoning.md)
3. [docs/how.md](./docs/how.md)

## Decided

| Topic | Decision |
|-------|----------|
| Scope | This version only changes the e2e harness the agent follows. It does not change `wallet/` or `test/test-web/`. |
| Behavior scenarios | `test/e2e/scenarios/01` through `07` stay English prose. The verdict is that file's **Pass** paragraph. There is no YAML frontmatter and no second copy of the pass condition. Every behavior scenario runs in the real Side panel. |
| Visual list | `test/e2e/visual/matrix.yaml` is the only shot list. Each shot has `look` lines. Goldens are `test/e2e/visual/refs/{shell}/en/{id}.png`. `test/e2e/visual/manifest.json` records the wallet version those PNGs were taken from. |
| How to judge a shot | Open the golden beside the live frame and check `look` only. Side panel height, browser chrome, the account address, and the exact SOL digits are not failures. A missed `look` line is a report to the maintainer. Replace the PNG only after they confirm. |
| Shells | Popup shots are the toolbar action popup at Chrome's default size. Approve shots (`approve-sign`, `approve-v1-fee`, `approve-cluster-mismatch`) are sidepanel only. |
| No pixel diff | Do not add an image-diff dependency or a compare script. Do not treat a full-frame pixel match as the pass condition. |
| Instructions | `.agents/skills/e2e-wallet/SKILL.md` points at `test/e2e/visual/README.md` for the visual check. Setup and architecture stay in that skill and in `test/e2e/README.md`. |

## Out of scope

- Wallet features, copy, or layout.
- A CI job that fails the build on a screenshot.
- Popup goldens for approve screens.
- Locales other than English.

## Acceptance

- [x] `test/e2e` has no `pixelmatch` or `pngjs` dependency, and the root `package.json` has no `e2e-visual-compare` script.
- [x] Scenarios `01`–`07` have a **Pass** paragraph and no YAML frontmatter.
- [x] `matrix.yaml` shots match the PNGs under `refs/sidepanel/en` and `refs/popup/en`. Approve shots have no popup PNG.
- [x] Scenarios `01`–`07` were not re-run for this ship. Wallet and test-web are unchanged from 0.54.0, so the file checks above are the acceptance.

## Anchors

| Path | Role |
|------|------|
| `test/e2e/scenarios/` | Behavior steps and the Pass paragraph |
| `test/e2e/visual/matrix.yaml` | Shot list and `look` lines |
| `test/e2e/visual/refs/` | English goldens |
| `test/e2e/visual/README.md` | How to record and how to judge |
| `.agents/skills/e2e-wallet/SKILL.md` | Agent entry |

## Still to decide

(none)
