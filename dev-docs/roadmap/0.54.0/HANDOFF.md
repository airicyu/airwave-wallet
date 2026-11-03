# 0.54.0 handoff

## Done this session

The git branch is `v0.54.0`. The contract is [INDEX.md](./INDEX.md). Design review passed. The v1 fee path is in the working tree. `cd wallet && npm run typecheck` and `cd test/test-web && npm run build` passed. The user walked all of test-web on 2026-11-04, including the v1 sign and sign-and-send buttons, and reported it OK.

## Next session

Do not reopen the product choices in the INDEX. Remaining hand checks are the settings priority-fee row, an in-wallet token send, and a close-empty batch. Do not commit unless the user asks. Do not mark shipped unless the user says ship.

Read `INDEX.md`, then `docs/reasoning.md`, then `docs/how.md`. On conflict, the INDEX wins.

## Paste-ready

```text
Implement Airwave 0.54.0, the single track in dev-docs/roadmap/0.54.0/docs/how.md. Read INDEX.md, docs/reasoning.md, and docs/how.md first. Start with defaultPriorityFeeLamports, then the v1 fee card. Do not commit.
```
