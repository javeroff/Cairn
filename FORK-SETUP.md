# Cairn — Fork Setup & Full Build Sequence

> **What this is.** The single runbook to turn a fork of `addyosmani/agent-skills` into Cairn. Part 0 is the handful of things *you* do by hand. Parts 1–3 are executed by **Claude Code** — hand it this file plus `CAIRN-BUILD-SPEC.md` and the reference `cairn/` folder, and it does the rest.

---

## Part 0 — Human steps (do these first, by hand)

1. **Fork** `https://github.com/addyosmani/agent-skills` on GitHub (gives you an `upstream` to pull fixes from later).
2. **Clone and branch:**
   ```bash
   git clone https://github.com/<you>/agent-skills cairn
   cd cairn
   git remote add upstream https://github.com/addyosmani/agent-skills
   git checkout -b cairn-init
   ```
3. **Unpack the bundle** somewhere outside the repo:
   ```bash
   mkdir -p ~/cairn-unpacked && tar -xzf cairn-bundle.tar.gz -C ~/cairn-unpacked
   ```
   You now have `~/cairn-unpacked/CAIRN-BUILD-SPEC.md` and `~/cairn-unpacked/cairn/` (the reference implementation).
4. **Drop the two driver files into the repo root:**
   ```bash
   cp ~/cairn-unpacked/CAIRN-BUILD-SPEC.md .
   cp ~/cairn-unpacked/FORK-SETUP.md .          # this file
   ```
   Leave the reference `~/cairn-unpacked/cairn/` where it is — Claude Code will pull from it.
5. **Open Claude Code in the repo** and paste the handoff prompt at the bottom of this file.

That's all you do manually. Everything below is for Claude Code.

---

## Part 1 — Claude Code: place the reference implementation

The reference was built as a standalone package; the fork uses agent-skills' layout. Map files accordingly. **Source** = `~/cairn-unpacked/cairn/`. **Dest** = the fork root.

| Reference file | Fork destination | Action |
|---|---|---|
| `commands/spec.md` | `.claude/commands/spec.md` | **Overwrite** (modified doc-first version) |
| `commands/plan.md` | `.claude/commands/plan.md` | **Overwrite** (adds file-declaration gate) |
| `commands/build.md` | `.claude/commands/build.md` | **Overwrite** (SDD dispatcher) |
| `commands/review.md` | `.claude/commands/review.md` | **Overwrite** (prepends spec-compliance Axis 0) |
| `commands/ship.md` | `.claude/commands/ship.md` | **Overwrite** (milestone checkpoint) |
| `commands/digest.md` | `.claude/commands/digest.md` | **New** |
| `commands/status.md` | `.claude/commands/status.md` | **New** |
| `skills/learnings-capture/SKILL.md` | `skills/learnings-capture/SKILL.md` | **New** |
| `skills/spec-compliance-review/SKILL.md` | `skills/spec-compliance-review/SKILL.md` | **New** |
| `skills/using-agent-skills/SKILL.md` | `skills/using-agent-skills/SKILL.md` | **Overwrite** (full Cairn workflow map) |
| `skills/spec-compliance-review/SKILL.md` | `skills/spec-compliance-review/SKILL.md` | **New** |
| `hooks/branch-guard.sh` | `hooks/branch-guard.sh` | **New** |
| `templates/feature-doc.md` | `templates/feature-doc.md` | **New** (`mkdir templates`) |
| `bin/cli.js` | `bin/cli.js` | **New** (`mkdir bin`) |
| `src/install.js` | `src/install.js` | **New** (`mkdir src`) |

**Before overwriting `spec.md`/`plan.md`/`build.md`/`review.md`/`ship.md`:** diff against the fork's existing versions. If the fork's versions contain wiring the reference omits (e.g. tool-specific notes), preserve it. The reference versions are the intended behavior per the spec; the fork's are the baseline being replaced. **Leave `test.md` and `code-simplify.md` untouched** — Cairn reuses them from the fork as-is.

**Integration tasks (resolve these — they're the standalone→fork seams):**

1. **`package.json`** — do **not** overwrite the fork's. Merge in: a `"bin": { "cairn": "bin/cli.js" }` field, `"type": "module"`, and add `bin/`, `src/`, `templates/`, `commands/`, `skills/`, `hooks/` to `"files"`. Keep the fork's existing fields (plugin metadata, etc.). The fork stays installable both as a Claude Code plugin (via its `.claude-plugin/plugin.json`) **and** via `cairn install`.

2. **`src/install.js` source paths** — the reference copies from `PKG_ROOT/commands`, `PKG_ROOT/skills`, etc. In the fork, commands live at `.claude/commands/`. Update the installer's source paths so it reads from the fork's real locations (`.claude/commands/`, `skills/`, `hooks/`, `templates/`) and writes to `~/.claude/`. Verify the install still works (Part 1 acceptance below).

3. **`hooks/hooks.json`** — register **only** the Branch Guard `PreToolUse` entry (matcher `Write|Edit|NotebookEdit`, command `bash hooks/branch-guard.sh`). Cairn intentionally registers **no SessionStart hook** — workflow context (meta-skill, `.startup.md`, learnings) loads at command entry, not session start. If the fork's base shipped a SessionStart meta-skill injector, remove that registration.

4. **Skill name prefix** — the reference `build.md` references skills as `agent-skills:debugging-and-error-recovery` and `agent-skills:code-reviewer`. Confirm the namespace prefix is correct for the fork's installed name. If you rename the plugin to `cairn`, update these references to match the actual prefix Claude Code resolves.

5. **`.gitignore`** — append:
   ```
   .cairn/plans/      # ephemeral task breakdowns
   .cairn/audits/     # if you later add the optional /scan machinery
   ```
   Do **not** ignore `.cairn/docs/` or `.cairn/learnings.md` — those are committed knowledge base.

6. **CLAUDE.md guidance** — the reference `src/install.js` injects a guidance block on install. Confirm it lands in the fork's `CLAUDE.md` (or the installed `~/.claude/CLAUDE.md`) behind the `CAIRN:GUIDANCE` markers, idempotently.

**Part 1 acceptance gate (verify, then report):**
- `node bin/cli.js install --dir /tmp/cairn-test` produces a tree containing the commands, the new skills, the Branch Guard hook, the template, and a `settings.json` with the Branch Guard hook registered (no SessionStart hook).
- Re-running install adds **zero** duplicate hook entries.
- In a scratch repo with a `.cairn/` dir on `main`, the Branch Guard blocks a write (exit 2); on a `feat/*` branch it allows it (exit 0); with no `.cairn/` dir it no-ops (exit 0).

Commit: `git add -A && git commit -m "Cairn: place reference implementation (commands, hooks, learnings, packaging)"`

---

## Part 2 — Claude Code: confirm completeness

The reference implements **every** spec section (§4.1–§4.10) — all 6 commands, both new skills, both hooks, the schema, and the packaging. There is **nothing to build from scratch.** Your job was placement + the six integration tasks in Part 1.

Confirm each spec component is present and wired after placement:

| Spec § | Component | Where |
|---|---|---|
| §4.1 | Branch Guard hook | `hooks/branch-guard.sh` + `hooks.json` PreToolUse |
| §4.2 | Feature-doc schema | `templates/feature-doc.md` |
| §4.3 | `/spec` (doc-first, anti-duplication) | `.claude/commands/spec.md` |
| §4.4 | `/plan` (file-declaration gate) | `.claude/commands/plan.md` |
| §4.5 | `/build` (SDD dispatcher) | `.claude/commands/build.md` |
| §4.6 | `spec-compliance-review` skill + `/review` (Axis 0 prepended) | `skills/spec-compliance-review/` + `.claude/commands/review.md` |
| §4.7 | `/status` (`.startup.md` read at command entry; no SessionStart hook) | `.claude/commands/status.md` |
| §4.8 | `/ship` (milestone checkpoint) | `.claude/commands/ship.md` |
| §4.9 | npm packaging | `bin/cli.js`, `src/install.js`, merged `package.json` |
| §4.10 | `learnings-capture` + `/digest` | `skills/learnings-capture/` + `.claude/commands/digest.md` |
| §4.11 | `using-agent-skills` meta-skill (loads at `/spec` entry) | `skills/using-agent-skills/SKILL.md` |

If any is missing after placement, regenerate it from the matching spec section — but the reference should contain all of them. Then verify the §1 non-goals and §2.1 composition contract still hold across the placed files (no duplicated skills; `.cairn/docs/NN.md` is the only spec artifact).

Commit: `git add -A && git commit -m "Cairn: complete reference placed and integrated"`

---

## Part 3 — Verify end to end (the real test)

Before declaring done, run one real feature through the whole loop on a throwaway project:

```bash
# in a scratch git repo with the fork installed via `cairn install`
/spec add a health-check endpoint that returns 200 and uptime
/plan 01-health-check
/build 01-health-check
/digest 01-health-check
```

Confirm:
- `/spec` wrote exactly one doc to `.cairn/docs/` (no separate spec-driven-development file) and stopped.
- `/plan` produced layered tasks with a passing file-declaration gate.
- `/build` dispatched subagents on inferred model tiers and ran the two-stage review.
- `/digest` wrote a learning (even "doc/plan well-calibrated") to `.cairn/learnings.md`.
- Branch Guard blocked any attempt to write on `main`.

Report what worked and what felt off. **Do not tune the 3x learnings-promotion threshold or any other guessed number until after this real run** — the run is what calibrates them.

Then: `git checkout main && git merge cairn-init`, push, and optionally open a PR for your own records.

---

## The handoff prompt (paste this into Claude Code)

> Read `FORK-SETUP.md` and `CAIRN-BUILD-SPEC.md` in this repo. The complete, tested reference implementation is at `~/cairn-unpacked/cairn/`.
>
> Execute FORK-SETUP.md in order:
> 1. **Part 1** — place the reference files into this fork's layout per the mapping table, resolve the six integration tasks (package.json merge, installer source paths, hooks.json, skill-name prefix, .gitignore, CLAUDE.md injection), and pass the Part 1 acceptance gate. Commit.
> 2. **Part 2** — confirm all 10 spec components (§4.1–§4.10) are present and wired; regenerate any that are missing. Verify the §1 non-goals and §2.1 composition contract hold. Commit.
> 3. **Part 3** — run one real feature end to end (`/spec → /plan → /build → /digest`) and report.
>
> Stop and report at each acceptance gate. Do not proceed past a failing gate. Do not tune any guessed thresholds (e.g. the 3x learnings-promotion gate) until after the Part 3 real run.

---

*After this, `cairn install` works in any project, and `git merge upstream/main` keeps you current with Addy's upstream — you only three-way-merge the 4 modified command files when they change.*
