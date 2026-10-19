# 0.49.0 handoff

## Done this session

**Track 5 landed (React shell hosts).** Removed `shell.ts`, `mountApprovalShell`, `disposeApprovalShell`, and `buildApprovalRootHtml`. Added `ApprovalShell.tsx` plus `ApprovalUnlock`, `ApprovalExpired`, `ApprovalSign` (fee/send-status placeholders `ApprovalFeeDetails` / `ApprovalSendStatus`; imperative paint still in `approval-shell-runtime.ts`). `bindApprovalShell` wires React DOM refs to the former shell logic. `ApprovalHost`, `SignFlowPage`, and `popout/main.tsx` render `ApprovalShell`; popout connect still uses `ConnectPage`. `cd wallet && npm run typecheck` passed. User hand-verified Track 5 on unpacked extension.

## Next session

- Implementation review (spawn fresh agent per `agent-workflow.md`).
- Optional second commit: `approval-shell-*` module split (post–Track 5 React port).

## Paste-ready

```text
Implement one phase of dev-docs/roadmap/0.49.0. Status must be in progress or the design gate must already have passed. Read INDEX.md, then only the matching phase in docs/how.md. Stop after that phase. Do not edit the other oversized files. Run cd wallet && npm run typecheck.
```
