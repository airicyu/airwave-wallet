# 0.59.2 — Transaction AI default models

- **Status:** `shipped`
- **Parent:** [0.59.1](../0.59.1/INDEX.md). Patch only. No new feature
- **Changelog:** [`changelog.md`](../../../changelog.md) under `0.59.2`

## Product

The default transaction-AI decisions model is `liquid/d1.2`. The default report chain tries `~deepseek/deepseek-flash-latest`, then `inclusionai/ling-3.0-flash`, then `nvidia/nemotron-3.5-lightning`. Default mode does not persist those ids, so an existing install on default mode uses the new chain. A custom chain is left as stored. The 0.39 migrate reference for decisions stays `liquid/d1`, so an old stored default still becomes default mode.

The sign-risk page uses the same dark panels as the connect page. Its default system prompt includes the wallet report knowledge: how to read one transaction, System Assign, durable nonce, Shielded Pool, and User Registry.

## Decided

| Topic | Decision |
|-------|----------|
| Decisions default | `DEFAULT_DECISIONS_MODEL_CHAIN` starts with `liquid/d1.2`, then `nace-ai/drex-v1.5` |
| Legacy migrate | `LEGACY_039_DEFAULT_DECISIONS_MODEL` stays `liquid/d1` and is not sent to the model |
| Report default | `DEFAULT_REPORT_MODEL_CHAIN` is DeepSeek flash latest, then Ling 3.0 flash, then Nemotron 3.5 lightning |
| Sign-risk prompt | The page default context matches the wallet zh-Hant signTransaction system prompt, including the new reading rules |

## Out of scope

- Rewriting a custom model chain already stored by the user
- Changing historical roadmap contracts that name `liquid/d1`
- A new transaction-AI feature

## Acceptance

1. Default decisions mode calls `liquid/d1.2` first.
2. Default report mode calls `~deepseek/deepseek-flash-latest` first, then the two fallbacks in the order above.
3. An illegal single decisions or report id falls back to that side's new first default.
4. The sign-risk page opens with the updated prompt, including Shielded Pool and User Registry, on the dark panel layout.
