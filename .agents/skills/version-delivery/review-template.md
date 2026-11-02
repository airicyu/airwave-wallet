# Review report skeleton

Review subagents use this structure when writing `dev-docs/roadmap/<VER>/docs/`. Append rounds to the same file. Write the report in English.

## design-review.md

```markdown
# Design review — <VER> Airwave Wallet

- Date: (Asia/Hong_Kong)
- Round: **initial** / **re-review N**
- Role: design review (does not edit INDEX / HOW / reasoning / HANDOFF / code; this file is not the contract)
- Baseline: decided sentences and acceptance in [`../INDEX.md`](../INDEX.md); links to HOW / WHY / HANDOFF
- Architecture bans: [`../../GUIDELINES.md`](../../GUIDELINES.md)
- Current-code sample: (anchor files; write "none" if the repo has no code yet)
- **Verdict:** (no open HIGH / open HIGH remains / proposal not feasible). Whether the review gate passes.

## Findings (this round)

Closed = written into INDEX / HOW / HANDOFF. Open = the contract still diverges. Non-blocking = record only.

### HIGH
#### H1 — title — **open / closed / infeasible**
The problem, why it is HIGH, and the full sentence to write into the decided section (one option must be locked).

### MEDIUM
Table or subsections: ID, status this round, basis.

### LOW
A table is enough.

## Acceptance cross-check
Acceptance sentence | testable at design level | gap

## Current-code sample
Current code not yet doing this version is not a design HIGH. Call out current behavior that contradicts the proposal. Do not treat backlog or unscheduled ideas as current code.

## Fix tracker
ID | grade | status | where it closed (INDEX item / HOW section)

## Prior rounds
Round | date | conclusion
```

## implementation-review.md

```markdown
# Implementation review — <VER> Airwave Wallet

- Date, round, baseline = INDEX
- Role: implementation review (does not change code)
- **Verdict:** whether it can ship (no open HIGH / whether this version's tests or manual checks passed)

## Findings
H / M / L, stable IDs

## Acceptance cross-check
INDEX acceptance sentence | pass / fail | evidence (test / file / unpacked-extension manual check)

## Test results
Command: what this version's INDEX or GUIDELINES names. If none, write "no full-suite test command" and list manual-check results.
Do not write mnemonics, private keys, or passwords.

## Fix tracker
## Prior rounds
```
