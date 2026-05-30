# Cairn

> Doc-first, subagent-driven engineering workflow for Claude Code.
> A fork of [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), extended with a subagent execution engine, a documentation persistence layer, and a learnings loop.

A cairn is a stack of stones that marks a trail — a manual made of rock. Cairn does the same for code: a small, durable doc marks the path, and the agent follows it.

You drive a feature through a short lifecycle of slash commands — **spec → plan → build → review → ship** — and Cairn keeps a paper trail in a `.cairn/` directory: what you meant to build, how it was broken down, and what each build taught. Every command is thin orchestration; the real craft lives in reusable **skills** the commands load on demand.

## What you get

Cairn keeps everything agent-skills provides and adds four layers on top:

| Layer | Borrowed from | What it adds |
| --- | --- | --- |
| **Skill library** | agent-skills (this fork's base) | 26 phase-organized skills + anti-rationalization tables + 3 review personas. Commands load skills; they never re-implement them. |
| **Execution engine** | OBRA superpowers (pattern) | Subagent-driven `/build`: a fresh subagent per task on the cheapest capable model, a green-gate loop, and a 5×→debugging handoff. |
| **Persistence layer** | TheDecipherist/mdd (pattern) | Feature docs as the single source of truth (`.cairn/docs/`), drift detection, and a `.startup.md` orientation file. |
| **Learnings loop** | GSD / lessons (pattern) | `/digest` mines durable rules from finished work; 3× recurrence promotes a rule to a CLAUDE.md candidate. |
| **Structural layer** *(optional)* | [code-review-graph](https://github.com/tirth8205/code-review-graph) | Blast-radius / dependency awareness across the whole codebase. Degrades gracefully when absent. |

## The lifecycle

```
 /spec ─→ /plan ─→ /build ─→ /test ─→ /review ─→ [/code-simplify] ─→ /ship
   (Define) (Plan)  (Build)  (Verify)  (Review)    (Review, opt.)     (Ship)

 off-cycle:  /digest  (after build or ship)      /status  (anytime)
```

## Commands

Nine commands: the agent-skills 7-command lifecycle plus Cairn's `/digest` and `/status`. Arguments in `<angle brackets>` are required, `[square brackets]` optional.

| Command | What it does | When to use it | How to run it |
| --- | --- | --- | --- |
| **`/spec`** | Captures intent *before* code: writes one source-of-truth feature doc to `.cairn/docs/NN-slug.md` (composing `interview-me`, `idea-refine`, `spec-driven-development`). | Starting a non-trivial feature and you want the *what & why* pinned down first. Opt-in — skip it for throwaway work. | `/spec <feature description>` to create · `/spec sync <id>` to re-sync a doc that drifted from its code |
| **`/plan`** | Breaks the doc into small, independently-ownable tasks (vertical slices) with a file-ownership gate and a complexity tag → a checkbox list in `.cairn/plans/NN.md`. | After `/spec`, when the work is more than one task. | `/plan <feature-id>` — e.g. `/plan 02` |
| **`/build`** | Executes the plan. As orchestrator it loads `subagent-driven-development` + `incremental-implementation` + `context-engineering`, then dispatches a fresh subagent per task on the cheapest capable model; each subagent loads its own craft skills via a dispatch contract, and every task is green-gated before the next. Hands off to `/review`. | After `/plan` (planned mode). For a quick one-off with no doc it runs in-session (direct mode). Never blocked by a missing doc. | `/build <feature-id>` (planned) · `/build <freeform task>` (direct) |
| **`/test`** | Test-driven verification: write a failing test → implement → confirm; full suite + browser checks; the Prove-It pattern reproduces a bug before fixing it. | Verifying a feature or area, or fixing a bug. | `/test <feature-id \| area>` · `/test "bug: <description>"` |
| **`/review`** | Fresh-eyes review in stages: spec-compliance (did it build the *right* thing?) → quality → security → performance. | Before merging *any* change — Cairn-built or not. | `/review <feature-id \| git-ref \| "staged">` (defaults to current branch vs base) |
| **`/code-simplify`** | Reduces complexity without changing behavior; the test suite is the proof. | Optional, on a milestone before `/ship`, when working code reads harder than it should. | `/code-simplify [feature-id \| path]` |
| **`/ship`** | End-of-milestone deploy gate: serial Ship-phase gates (git, CI, docs, deprecation, launch) → a parallel 3-persona review → one go/no-go verdict. The only command that marks a feature `complete`. | At a milestone, when you're ready to deploy. Not a per-feature step. | `/ship [milestone or feature ids]` |
| **`/digest`** | Closes the loop on a finished feature: extracts durable rules (with source attribution) into `.cairn/learnings.md`, distils a `## Build Notes` section onto the doc, and archives the spent plan. | Right after `/build` or `/ship`, while the build context is fresh. | `/digest <feature-id>` |
| **`/status`** | Project snapshot: rebuilds `.cairn/.startup.md` (the orientation file commands read at entry) and flags docs that have drifted from their code. | Anytime — at session start, or to check for drift. | `/status` |

### A typical run

```Shell
/spec add rate limiting to the login endpoint   # → .cairn/docs/03-rate-limiting.md
/plan 03                                         # → .cairn/plans/03.md  (tasks T1, T2, …)
/build 03                                        # a subagent per task, each green-gated
/review 03                                       # spec-compliance → quality → security → performance
/digest 03                                       # rules → learnings.md, build notes → doc, archive plan
# …at the milestone:
/ship                                            # go/no-go deploy gate
```

## What Cairn writes to `.cairn/`

| Path | Purpose |
| --- | --- |
| `.cairn/docs/NN-slug.md` | The **feature doc** — the durable source of truth (intent, rules, edge cases). Written by `/spec`, kept fresh by `/build` / `/ship` / `/spec sync`, distilled into by `/digest`. |
| `.cairn/plans/NN.md` | The **task breakdown** + checkbox progress for a feature. Ephemeral build scaffolding — archived to `plans/archive/` by `/digest`. |
| `.cairn/learnings.md` | Durable, **cross-feature rules** mined from real failures and corrections. Read back at `/spec` and `/build` entry, so prior pain informs new work. |
| `.cairn/.startup.md` | An auto-generated **orientation snapshot** commands read at entry, so they start oriented without scanning the whole codebase. Rebuilt by `/status`. |

## Install

Cairn runs straight from GitHub with `npx` — no clone, no global npm install, no dependencies.

```Shell
# Interactive — asks whether to install globally or locally:
npx github:javeroff/Cairn install
```

Or pick the scope up front (non-interactive — for CI, scripts, or piped contexts):

```Shell
npx github:javeroff/Cairn install --global         # ~/.claude/ (all projects)
npx github:javeroff/Cairn install --install-local  # ./.claude/ + ./CLAUDE.md (this project only)
```

* **Global** installs to `~/.claude/` and applies across every project.
* **Local** installs to `./.claude/` + `./CLAUDE.md` and **scopes Branch Guard to that project** — recommended for regulated work so the guard only fires where you want it.
* With no terminal (CI, pipes, some `npx` contexts) the bare command defaults to **global** and prints how to override.

Re-run any time to refresh files (idempotent):

```Shell
npx github:javeroff/Cairn update
```

<details>
<summary>Alternative: clone + global <code>cairn</code> binary</summary>

```Shell
git clone https://github.com/javeroff/Cairn cairn
cd cairn
npm install -g .
cairn install                  # interactive scope prompt (global vs local)
cairn install --global         # ~/.claude/
cairn install --install-local  # ./.claude/ + ./CLAUDE.md (scopes Branch Guard)
cairn install --dir <path>     # custom directory (skips CLAUDE.md)
cairn update                   # re-run install (idempotent)
```

</details>

## How it's built

* **Commands orchestrate; skills carry the craft.** Each command is thin — it wires the `.cairn` lifecycle and says "load and follow skill X." The 26 skills hold the actual process, verification, and anti-rationalizations, so logic lives in exactly one place.
* **Opt-in doc-first.** A doc is written only when you invoke `/spec`. `/build` works with or without one — direct implementation is never blocked.
* **Model tiering at dispatch.** Subagents run on the cheapest capable model (haiku → sonnet → opus by task complexity). The expensive model thinks; the cheap model types.
* **One spec artifact.** `.cairn/docs/NN.md` is the only spec file; `spec-driven-development` writes no competing file. Plans are distinct and ephemeral.
* **No SessionStart hook.** Workflow context (the discovery map, `.startup.md`, learnings) loads at command entry, so it never clutters sessions where you're not building. Branch Guard is the only always-on hook.

## Branch Guard

A `PreToolUse` hook blocks file writes on `main`/`master` in any project with a `.cairn/` directory. It fires at the OS level on every write, so it can't be compacted away or reasoned around. It's a no-op outside Cairn projects, on feature branches, and in repos without a `.cairn/` dir.

## Structural layer (optional): code-review-graph

Cairn carries *intent*; [code-review-graph](https://github.com/tirth8205/code-review-graph) (CRG) carries *what-connects-to-what*. Install CRG and Cairn's commands will fold its blast-radius tools into the lifecycle, so brownfield changes see cross-codebase dependents — not just the slice named in the doc. The per-command graph mapping lives in `CLAUDE.md` under "Cairn x graph (lifecycle mapping)." Cairn degrades gracefully if CRG is absent.

## Staying current with upstream

This is a fork. Pull Addy's upstream improvements without losing Cairn's changes:

```Shell
git remote add upstream https://github.com/addyosmani/agent-skills   # one-time
git fetch upstream && git merge upstream/main
```

Cairn's changes are additive (new commands, new skills, `.cairn/` writes) plus edits to `spec` / `plan` / `build` / `review` / `ship`. Merge conflicts, when they happen, are confined to those few command files.

## Credit

Built on [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) (MIT). The subagent execution pattern draws on OBRA superpowers; the doc-first persistence pattern on TheDecipherist/mdd; the learnings loop on GSD. Optional structural layer via [code-review-graph](https://github.com/tirth8205/code-review-graph).

## License

MIT.
