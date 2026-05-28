# Cairn

> Doc-first, subagent-driven engineering workflow for Claude Code.
> A fork of [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), extended with an SDD execution engine, a documentation persistence layer, and a learnings loop.

A cairn is a stack of stones that marks a trail — a manual made of rock. Same idea for code: a small, durable doc marks the path, and the agent follows it.

Cairn keeps everything agent-skills provides (23 lifecycle skills, 3 personas, the full 7-command lifecycle) and adds four things on top.

| Layer                 | From                            | What it adds                                                                                                                 |
| --------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Skill library**     | agent-skills (this fork's base) | 23 phase-organized skills + anti-rationalization tables + 3 review personas                                                  |
| **Execution engine**  | OBRA superpowers (pattern)      | Subagent-driven `/build`: fresh subagent per task, cheapest-capable model at dispatch, green-gate loop, 5x→debugging handoff |
| **Persistence layer** | TheDecipherist/mdd (pattern)    | Feature docs as the single source of truth (`.cairn/docs/`), Branch Guard hook, `.startup.md` orientation                    |
| **Learnings loop**    | GSD / lessons (pattern)         | `/digest` extracts durable rules from completed work; 3x recurrence promotes to a CLAUDE.md candidate                        |
| **Structural layer**  | code-review-graph (optional)    | Blast-radius / dependency awareness across the whole codebase (see CRG integration)                                          |

## Commands (9)

The full agent-skills 7-command lifecycle, plus Cairn's `/digest` and `/status`.

| Command          | Phase  | What it does                                                                                                                   |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `/spec`          | Define | Writes the one source-of-truth doc to `.cairn/docs/NN.md` (opt-in). Loads the meta-skill at entry.                             |
| `/plan`          | Plan   | Decomposes the doc into subagent-ownable tasks with a file-declaration gate + complexity signal.                               |
| `/build`         | Build  | SDD dispatcher: fresh subagent per task, model tiering, green gate, 5x→`debugging-and-error-recovery`, hands off to `/review`. |
| `/test`          | Verify | Holistic verification — full suite + browser testing. (Reused from base.)                                                      |
| `/review`        | Review | Spec-compliance (Axis 0) → quality → security → performance. Runs standalone too.                                              |
| `/code-simplify` | Review | Optional, run on the milestone before ship. (Reused from base.)                                                                |
| `/ship`          | Ship   | Milestone deploy checkpoint: serial Ship gates → parallel persona fan-out → go/no-go.                                          |
| `/digest`        | Learn  | Extracts durable learnings into `.cairn/learnings.md`; 3x promotes.                                                            |
| `/status`        | Orient | Rebuilds `.cairn/.startup.md` (read at `/spec` and `/build` entry — no SessionStart injection).                                |

## Design decisions

* **Standalone npm-installable** on top of the fork: `cairn install`.
* **Opt-in doc-first.** The doc is written only when you invoke `/spec`. `/build` works with or without one — direct implementation is never blocked.
* **Model tiering at dispatch.** Subagents run on the cheapest capable model (haiku → sonnet → opus by task complexity).
* **One spec artifact.** `.cairn/docs/NN.md` is the only spec file; `spec-driven-development` writes no competing file. Plans (`.cairn/plans/`) are distinct and ephemeral.
* **No SessionStart hook.** Workflow context (meta-skill, `.startup.md`, learnings) loads at command entry, so it never clutters sessions where you're not building. Branch Guard is the only hook.

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

## The lifecycle

```
/spec  → /plan → /build → /test → /review → [/code-simplify] → /ship
                                                                  │
                  /digest (after build or ship)   /status (anytime)
```

## Branch Guard

A `PreToolUse` hook blocks file writes on `main`/`master` in any project with a `.cairn/` directory. It fires at the OS level on every write, so it can't be compacted away or reasoned around. No-op outside Cairn projects, on feature branches, and in repos without a `.cairn/` dir.

## Structural layer (optional): code-review-graph

Cairn carries *intent*; [code-review-graph](https://github.com/tirth8205/code-review-graph) (CRG) carries *what-connects-to-what*. Install CRG and wire its blast-radius tools into the Cairn lifecycle so brownfield changes see cross-codebase dependents, not just the slice in the doc. See `CRG-INTEGRATION.md`. Cairn degrades gracefully if CRG is absent.

## Staying current with upstream

This is a fork. Pull Addy's upstream improvements without losing Cairn's changes:

```Shell
git remote add upstream https://github.com/addyosmani/agent-skills   # one-time
git fetch upstream && git merge upstream/main
```

Cairn's changes are additive (new commands, new skills, `.cairn/` writes) plus modifications to `spec`/`plan`/`build`/`review`/`ship`. Merge conflicts, when they happen, are confined to those few command files.

## Credit

Built on [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) (MIT). The SDD execution pattern draws on OBRA superpowers; the doc-first persistence pattern on TheDecipherist/mdd; the learnings loop on GSD. Structural layer via [code-review-graph](https://github.com/tirth8205/code-review-graph).

## License

MIT.
