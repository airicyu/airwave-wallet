---
name: version-delivery
description: >-
  Delivers one Airwave Wallet version: design-review rounds, then Track
  implementation, then the ship checklist. Spawns a fresh design reviewer,
  merges findings into INDEX/docs/HANDOFF, and repeats until the design gate
  passes, or stops if the proposal is not feasible. Use when the user names a
  version (e.g. 0.1.0), asks to execute dev-docs/roadmap/X.Y.Z, invokes
  /version-delivery, or asks to deliver or ship a roadmap version.
disable-model-invocation: true
---

# Version delivery (design-review gate → Track implementation → ship)

This skill runs one **Airwave Wallet roadmap version**. Sources: [`dev-docs/roadmap/agent-workflow.md`](../../../dev-docs/roadmap/agent-workflow.md), [`dev-docs/roadmap/GUIDELINES.md`](../../../dev-docs/roadmap/GUIDELINES.md), and the repo-root `AGENTS.md`.

Reply to the user in **Traditional Chinese**. **Do not commit unless the user asks.** Docs this skill writes default to **English**. Work stays on the version branch or a feature branch, not on `master`. That branch may hold several commits. Open a merge request into `master` only when the user says the branch is finished.

Paste-ready prompts and the report skeleton are in this directory: [prompts.md](prompts.md), [review-template.md](review-template.md).

The working directory is the **airwave-wallet repo root**. Do not edit a parent `docs/agent-roadmap/` if one exists.

## Trigger and version

Version status is the table in [`dev-docs/roadmap/README.md`](../../../dev-docs/roadmap/README.md). Version-cutting rules are in the repo-root `AGENTS.md`.

If the user names a version (`0.1.0`) or a directory, do that version. If they do not, read the table. Do not invent a new number:

- The latest version is `in progress`: add the work to that version's INDEX and under that version's changelog heading. Do not open the next version.
- The latest version is `shipped` and the next version's directory does not exist: record **code** changes in [`dev-docs/roadmap/unversioned.md`](../../../dev-docs/roadmap/unversioned.md) and add one sentence under `Next` at the top of the root `changelog.md`. Both places list the same changes. Do not open the next version yourself. The user later chooses: fold them into the version just shipped, open the next version for them, or leave them unversioned after shipping. Docs, the privacy policy, and terms are not tracked on the roadmap.
- The previous version is not `shipped` and the user still names a new version: remind them of the soft rule. Do not hard-block. Open the next version only if they still want it.

Work in `dev-docs/roadmap/<VER>/`. Required: `INDEX.md`. Also read `docs/*` and `HANDOFF.md` when they exist. Compare the previous version's INDEX and related `backlog/*.md` (ideas; **do not override this version's decisions**). When this version absorbs unversioned work, write those `unversioned.md` items into the INDEX and move the changelog `Next` sentences under this version's heading. Both places then have nothing left to assign.

## Roles (required)

| Role | Who | May change | Forbidden |
|------|-----|------------|-----------|
| **Design review** | A **fresh** Task subagent each time (`generalPurpose`; **no** `resume`) | Only write or update the **same** `docs/design-review.md` | INDEX / HOW / reasoning / HANDOFF / code; treating this file as the contract; commit |
| **Planning convergence** | **This session** (the agent running this skill) | INDEX, HOW, reasoning, HANDOFF | Product code before the gate passes; verbal "watch out later" that is not written to a file |
| **Implementation** | **This session** after the gate passes | Code and tests in this repo; INDEX status `in progress` | Inventing semantics the INDEX does not state; non-goals; editing an old wallet repo |
| **Implementation review** | A **fresh** spawn after the code is roughly done (do not resume the implementation context) | Only write or update the **same** `docs/implementation-review.md` | Changing code, adding features, commit |

One long conversation must not both review and grade its own review. A review is a **new subagent with no residue from this chat**.

## Flow

```
0  Preflight: INDEX is self-sufficient
1  Loop: spawn design review → this agent converges the proposal
   until the design gate passes, or stop if the proposal is not feasible
2  Fill in or update HANDOFF (including paste-ready)
3  Implement by Track and check that Track; when all Tracks finish, run this version's tests or manual checks
4  Spawn implementation review → fix holes → re-review when needed
5  Ship docs; do not commit unless the user asks
```

Small change: if the user explicitly says to skip design review, step 1 may be skipped. The INDEX must still be self-sufficient, and Track checks still run. **Do not skip by default.**

---

## 0. Preflight

Read `INDEX.md`, its linked docs, and the architecture bans in `dev-docs/roadmap/GUIDELINES.md`. Run the GUIDELINES self-sufficiency check.

If this version is not yet `in progress` (just opened, or the first run of this skill): in the same turn, before implementation, remind the user in Traditional Chinese of `wallet/src` files that miss the source-file rules in [`dev-docs/code-design-principles.md`](../../../dev-docs/code-design-principles.md). Count code lines only (blanks and full-line comments do not count), as that file defines. List all three groups, with path and code-line count: a `.ts`, `.tsx`, or `.css` file over 400 code lines; a command file directly under `background/wallet/` (not already inside that command's folder) at 150 code lines or more; a `.ts` file with no English responsibility header (any length). This list does not block opening the version and does not add a split to the INDEX. If the user does not ask for the fix, only remind them.

If **decisions still required before start** is non-empty (and those items are not already marked non-goals): **stop**. Tell the user to decide first. Do not open a review loop as a substitute for a decision.

If the INDEX is too short, decided items are not full sentences, or acceptance cannot be judged objectively: this agent **fills the docs until they are reviewable**, then enters step 1. Filling means writing the already stated intent clearly. It does not invent new product semantics. Ask the user when a product choice is required.

Preflight bans:

- Do not leave a decision only in chat
- Do not write mnemonics, private keys, passwords, personal addresses, or production RPC secrets into INDEX / docs / reasoning / HANDOFF / review reports
- Do not treat backlog or unscheduled ideas as decided. When they conflict with the INDEX, the INDEX wins
- The main path must not: find a request by hydrating an operation store, broadcast to every tab by default, use a handwritten rehydrate bus as the main sync path, hardcode or persist a plaintext password, let inject hold a long-lived private key, or declare an unimplemented Wallet Standard method
- The repo has no full-suite test command yet. This version's INDEX must name the manual checks or test commands. **Do not** assume `bun test`
- Implementation stays in this repo

---

## 1. Design-review loop

One file: `dev-docs/roadmap/<VER>/docs/design-review.md`. **Do not open a new file per round.** Append rounds. Keep stable IDs (`H1`, `M3`, …). A fix round **does not renumber**.

### 1a. Spawn the review

Use Task: `subagent_type=generalPurpose`, **no** `resume`. `run_in_background=false`. Use the full "Design review" prompt in [prompts.md](prompts.md). Fill `<VER>` and the anchor paths.

Require the subagent to return: one-sentence verdict, open HIGH list, MEDIUMs that should be fixed, **whether the proposal is infeasible**, and the report path.

If Task fails: retry once with a new spawn. If it fails again, stop and tell the user.

### 1b. Read the report and route

Read `design-review.md` (the file is the source; ignore subagent chatter).

**Stop (proposal not feasible)** — stop on any of these. **Do not** twist a product sentence to pass the gate:

- The review says this version cannot be reconciled with non-goals, architecture bans, or an existing contract, and there is no fix that only edits docs without changing product intent
- The main path works only if pending is durable Zustand, results broadcast to every tab, or a password is hardcoded
- The main path depends on a capability the INDEX forbids (including a Wallet Standard method that is relied on but not declared)
- An open decision cannot be derived from decided sentences, and more doc edits would only be a guess
- The same HIGH makes no progress across several rounds because the product is undecided

When stopping: explain in Traditional Chinese, cite finding IDs, and list the questions the user must decide before work can continue. **Do not** start implementation.

**Converge (feasible)** — this agent:

1. Agreed HIGH and MEDIUM that should be fixed → write them into the INDEX decided section and the matching HOW / reasoning / HANDOFF (full sentences, GUIDELINES self-sufficient)
2. Disagreed MEDIUM / LOW → write the rejection reason in the INDEX or reasoning, or mark the report item **non-blocking** (it must really not block the main path or acceptance)
3. The review file is not the contract. The contract is INDEX plus docs
4. If a decided change alters a product sentence, a non-goal, or an architecture ban: ask the user first. Small implementation details may be decided here

Then **1a again** (new spawn, no resume). Tell the reviewer: compare the **current** INDEX; check old ID status; new IDs are allowed; do not renumber old ones.

Suggested cap: **8** rounds. If open HIGHs remain at the cap: stop and report. Do not implement silently.

### Design gate (required before implementation)

- [ ] No open **HIGH**
- [ ] Agreed **MEDIUM** items are written into files, or marked non-blocking
- [ ] INDEX decisions-before-start is empty (or only non-goals)
- [ ] `HANDOFF.md` exists and contains a paste-ready starter prompt
- [ ] Non-goals are written clearly
- [ ] The latest round's verdict says the gate passes (this agent checks the file; do not trust one sentence blindly)

---

## 2. HANDOFF

After the gate passes, confirm `HANDOFF.md`: read order, product summary, **Track order**, bans, anchors, done checks, paste-ready.

When implementation starts: INDEX status → `in progress`.

---

## 3. Track rhythm and tests

Follow the Track order in the INDEX / HANDOFF. Non-goals are forbidden. Do not re-ask what the INDEX already decided. **Ask only when it is silent.** Silence still obeys the GUIDELINES architecture bans.

Tests are the commands or manual checks that **this version's INDEX** names. The repo has no default full-suite command. After one exists, follow the "ship files" table in `dev-docs/roadmap/GUIDELINES.md`.

| When | Expected test |
|------|----------------|
| **End of each Track** | Unit or manual checks for that Track. The matching acceptance sentence holds before the next Track |
| **All Tracks done** | Run this version's agreed full suite. If there is no command, complete each INDEX manual check and record the result |
| **Around implementation review** | Run the same set again. Write the result into implementation-review |

When popup, popout, or an injected page changes behavior: walk that flow in the unpacked extension (this version's acceptance points: connect, reject, sign, lock, and so on). A static screenshot is not enough. If no browser can load the extension right now, write which acceptance items were not walked in a browser.

When introducing a test runner, the changelog, or a global contract file, update the GUIDELINES "ship files" table, and keep root `CHANGELOG.md` consistent with the version number.

---

## 4. Implementation-review loop (default for medium changes and up)

File: `dev-docs/roadmap/<VER>/docs/implementation-review.md` (append rounds to the same file).

Spawn a new Task (do not resume the implementation conversation). Use the "Implementation review" prompt in [prompts.md](prompts.md).

| Round | Who | What |
|-------|-----|------|
| Initial | New subagent | Read only INDEX + docs + diff; open findings; run this version's tests or manual checks and record them |
| Fix | This implementation session | Fix only tracked items; update the status column in the same report |
| Re-review | A new subagent (suggested), or this agent self-checks and then spawns an independent review | Check closed items; rerun tests; watch for regressions |
| Independent check (suggested for medium changes and up) | A **new** spawn | Does not continue the implementation chat; rechecks code and this version's tests |

Finding grades and the ship bar match agent-workflow: HIGH must close; MEDIUM is fixed by default or marked non-blocking; LOW may stay open. The review agent **does not change code**.

If implementation review finds the **design contract** still diverges: return to planning convergence in step 1 and edit docs. Run another design review when needed. Do not "invent" semantics in code that the INDEX does not have.

---

## 5. Before ship (this skill stops at "ready to ship, waiting for the user to allow commit")

- [ ] No open HIGH
- [ ] Agreed MEDIUM items are fixed or marked non-blocking
- [ ] INDEX **acceptance** is fully checked (or implementation-review passes each item)
- [ ] This version's tests or manual checks passed, and the UI flow was walked in the extension (or the report says why it could not be walked)
- [ ] Root `changelog.md` records this version, and `Next` has no sentence that still belongs to this version. If `package.json` exists, `version` matches `X.Y.Z`. `wallet/manifest.config.ts` `version` matches `X.Y.Z`. The version sentence in root `README.md` matches `version.md`, and `version.md` equals the latest `shipped` row in the README table
- [ ] That row in [`dev-docs/roadmap/README.md`](../../../dev-docs/roadmap/README.md) is `shipped`. That table is the status source. The INDEX status matches it
- [ ] Paths for messages, storage, custody, or capability tables added or changed in this version are written in the INDEX
- [ ] A shipped idea is **removed from the table and its standalone file is deleted** under `dev-docs/roadmap/backlog/`
- [ ] If this version absorbed unversioned work: those items are cleared from `unversioned.md` and changelog `Next`
- [ ] INDEX status becomes `shipped` **only** when acceptance and tests pass and the user agrees to ship. Otherwise it stays `in progress`

**Do not git commit** unless the user explicitly asks.

---

## Progress for the user (short)

At the end of each stage, a short paragraph: current round, open HIGHs, and the next step (review again / converge / implement Track X / stop). Do not paste the full subagent text into the chat.
