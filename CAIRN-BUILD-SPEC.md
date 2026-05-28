# Cairn — Build Specification

> **Purpose of this document.** This is an executable build spec. Fork `addyosmani/agent-skills`, drop this file in the repo root, open Claude Code, and instruct it: *"Implement CAIRN-BUILD-SPEC.md task by task. Follow the build sequence in §6. Stop at each acceptance gate and report."* Every task names exact file paths and acceptance criteria so Claude Code can self-verify.

---

## 1. Goal & non-goals

**Goal.** Extend a fork of agent-skills into **Cairn**: a doc-first, subagent-driven workflow. Add three things agent-skills lacks, and *only* those, reusing everything else:

1. A **persistent feature-doc layer** (the source of truth artifact) — opt-in via `/spec`.
2. A **subagent-driven `/build`** that dispatches fresh subagents per task on the cheapest capable model, with a green-gate loop and two-stage review (OBRA's model).
3. **Hook-based enforcement + orientation** — a Branch Guard `PreToolUse` hook and a `.startup.md` session-context file (MDD's model).
4. **npm packaging** so it installs like MDD (`npm install -g` + `cairn install`).
5. A **learnings-digestion loop** (GSD's model) — on spec completion, digest the build's artifacts into durable rules that feed the next spec.

**Non-goals.**
- Do **not** rewrite or duplicate any of the 23 existing skills. Reference them.
- Do **not** add a new debugging agent — reuse `debugging-and-error-recovery`.
- Do **not** add a new code-quality reviewer — reuse the `code-reviewer` persona.
- Do **not** make doc-first mandatory. It is opt-in (only `/spec` writes a doc; `/build` works with or without one).

---

## 2. Design decisions (locked — do not relitigate)

| Decision | Choice | Rationale |
|---|---|---|
| Distribution | Standalone npm package layered on the fork: `npm install -g` + `cairn install` | Install convenience like MDD; the fork is the source repo |
| Doc-first strictness | **Opt-in** — doc written only on `/spec`; `/build` never requires one | User decision |
| Model tiering | **OBRA-style**: orchestrator infers cheapest-capable model *at dispatch*; plan emits a complexity signal to feed inference | Faithful to superpowers' shipped behavior |
| 5x green-gate failure | Stop, then dispatch the existing **`debugging-and-error-recovery`** skill in a fresh subagent for root-cause (not a 6th guess) | User decision + reuse |
| Review | Two-stage: **spec-compliance** (NEW) → **code-quality** (reuse `code-reviewer` persona) | Compliance-first ordering |
| `/ship` | End-of-milestone deploy checkpoint composing existing Ship skills + persona fan-out | User clarification |
| Learnings | `/digest` after completion extracts root causes/corrections into `.cairn/learnings.md`; 3x recurrence promotes to a durable rule / CLAUDE.md candidate | GSD's continuous-improvement model + user's `lessons` pattern |
| Meta-skill loading | `using-agent-skills` loads at `/spec` entry, **not** SessionStart. No auto-injection of workflow context at session start; `.startup.md`/learnings read at command entry | User decision — keep sessions clean when not building |

---

## 2.1 Composition contract — docs vs. spec/plan (read before building §4.3–§4.5)

agent-skills' `spec-driven-development` and `planning-and-task-breakdown` are **processes** that, left alone, would each emit their own working files (ephemeral, deletable before merge). MDD's docs are **persistent, committed, per-feature architecture records**. Naively running both produces two competing "what to build" artifacts that drift. The contract that prevents this:

- **One spec artifact.** `.cairn/docs/NN.md` (MDD-style, committed) is the *only* spec document. `spec-driven-development` is invoked for its process and its six content areas (Objective, Commands, Project Structure, Code Style, Testing Strategy, success criteria) which map **into** the doc body — it must **not** write a separate spec file. The command (`/spec`) owns the output location; the skill owns the method.
- **Plans are distinct and ephemeral.** `.cairn/plans/NN.md` is the task breakdown, consumed by `/build`. Different role and lifecycle from the doc: the plan may be gitignored; the doc is committed.
- **Namespace.** Everything lives under `.cairn/` (dotfolder) — never the project's human-facing `docs/`.
- **What the doc does (and the ephemeral spec does not):** persists as the committed knowledge base; drives drift detection (`last_synced` vs git); maps cross-feature `depends_on`; gives 1-doc fast context via `tags` in `.startup.md`; tracks lifecycle `status`. These are the MDD functions Cairn adopts. (The fuller MDD machinery — a `/scan` drift command and a dependency-graph renderer — is **optional**; worth it for regulated/insurance work, extra surface otherwise. Not in the core build.)

## 3. Reuse inventory — DO NOT rebuild these

These already exist in the fork. Cairn **references** them.

**Skills (skills/&lt;name&gt;/SKILL.md):**
- Define: `interview-me`, `idea-refine`, `spec-driven-development`
- Plan: `planning-and-task-breakdown`
- Build: `incremental-implementation`, `test-driven-development`, `context-engineering`, `source-driven-development`, `doubt-driven-development`, `frontend-ui-engineering`, `api-and-interface-design`
- Verify: `browser-testing-with-devtools`, **`debugging-and-error-recovery`** ← the 5x-failure target
- Review: `code-review-and-quality`, `code-simplification`, `security-and-hardening`, `performance-optimization`
- Ship: `git-workflow-and-versioning`, `ci-cd-and-automation`, `deprecation-and-migration`, `documentation-and-adrs`, `shipping-and-launch`
- Meta: `using-agent-skills`

**Personas (agents/&lt;role&gt;.md):** `code-reviewer` (five-axis review — the code-quality stage), `test-engineer`, `security-auditor`

**Existing commands (.claude/commands/):** `/spec`, `/plan`, `/build`, `/test`, `/review`, `/code-simplify`, `/ship` — these are MODIFIED, not replaced.

**Skill anatomy** (any NEW skill must follow it): frontmatter (name, description) → Overview → When to Use → Core Process → Examples → Common Rationalizations → Red Flags → Verification.

---

## 4. New & modified components

Each component below is a build task. `[NEW]` = create. `[MODIFY]` = edit existing. `[PORT]` = adapt from MDD.

### 4.1 `[PORT]` Branch Guard hook
**Files:** `hooks/branch-guard.sh`, register in `hooks/hooks.json` under `PreToolUse` (matcher `Write|Edit|NotebookEdit`).
**Behavior:** If `.cairn/` exists in cwd and current git branch is `main`/`master`, write a block message to stderr and `exit 2` (blocks the tool call). No-op otherwise. Resolve branch via `git rev-parse --abbrev-ref HEAD`; if not a git repo or no branch, `exit 0` (fail-open).
**Why a hook, not instructions:** survives context compaction — fires at OS level on every write.
**Acceptance:** in a `.cairn/` repo on `main`, a Write is blocked (exit 2); on `feat/*`, allowed (exit 0); in a non-`.cairn/` repo, no-op (exit 0). Re-running install does not duplicate the hook registration.

### 4.2 `[NEW]` Feature-doc schema
**File:** `templates/feature-doc.md`.
**Frontmatter fields:** `id` (NN-slug), `title`, `depends_on` (feature-doc ids only), `source_files`, `routes`, `models`, `test_files`, `data_flow` (path or `greenfield`), `tags` (4–8 keywords), `status` (draft→in_progress→complete→deprecated), `phase` (spec|plan|build|review|ship), `last_synced`, `cairn_version`, `known_issues`.
**Body sections:** Purpose, Architecture, Data Model, API/Interface, Business Rules, Edge Cases, Dependencies, Verification, Known Issues.
**Acceptance:** schema documented; `/spec` produces docs that validate against it.

### 4.3 `[MODIFY]` `/spec` — doc-first entry point
**File:** `.claude/commands/spec.md`.
**Change:** today `/spec` invokes `spec-driven-development` only. Add: (a) **load the `using-agent-skills` meta-skill first** — this is where the meta-skill loads (workflow entry), not at session start; (b) ensure `.cairn/docs/` exists; (c) compute next `NN`; (d) read `.cairn/.startup.md` + tag-matched `.cairn/learnings.md` for orientation; (e) dispatch up to 3 parallel **haiku** context probes (rules / existing-docs / codebase); (f) compose existing `interview-me` + `idea-refine` for the question round; (g) tag-overlap detection; (h) write `.cairn/docs/NN-slug.md` from the template; (i) end at a confirmed doc — do not plan or build.
**Reuse:** `interview-me`, `idea-refine`, `spec-driven-development`. Do not reimplement their logic — invoke them. **Anti-duplication (critical):** `spec-driven-development` provides the *process* and the six content areas only; it must not write its own spec file. The `.cairn/docs/NN.md` doc is the single spec artifact (see §2.1). Map the six areas into the doc body.
**Acceptance:** `/spec "add JWT auth"` writes a valid doc with populated frontmatter + body, surfaces overlaps, and stops. No code written. **Exactly one spec file exists — no separate spec-driven-development artifact alongside the doc.**

### 4.4 `[MODIFY]` `/plan` — decomposition + file-declaration gate
**File:** `.claude/commands/plan.md`.
**Change:** today `/plan` invokes `planning-and-task-breakdown` only. Add: read the feature doc; decompose into single-purpose tasks (each: id, purpose, files, tests, depends_on, layer, `complexity` ∈ {mechanical|standard|novel}); run the **file-declaration gate** (no two tasks in one layer declare the same file — else serialize or split); write `.cairn/plans/NN.md` with layers; set doc `phase: plan`.
**Reuse:** `planning-and-task-breakdown`. The `complexity` tag is a *signal* for §4.5's model inference, not a binding assignment.
**Acceptance:** plan groups parallel-safe tasks into layers; gate reports PASS/FAIL; over-tagging `novel` is flagged as waste.

### 4.5 `[REWRITE]` `/build` — the SDD dispatcher (keystone)
**File:** `.claude/commands/build.md`.
**Change:** today `/build` invokes `incremental-implementation` + `test-driven-development` in the main context. Rewrite so the main agent is an **orchestrator** that does not write implementation code. Per task, in layer order (parallel within a layer):

1. **Infer model tier at dispatch** (OBRA-style). Rubric: `mechanical`→haiku, `standard`→sonnet, `novel`/security/irreversible→opus. Uncertain → pick cheaper, let subagent escalate.
2. **Dispatch a fresh subagent** at that model with *only* the doc + this one task + its test file(s). Instruct strict TDD (RED→GREEN, never edit tests to pass). Compose conditionally: UI task → reference `frontend-ui-engineering`; API task → `api-and-interface-design`; framework/library code → `source-driven-development`; `novel`/high-stakes → **`doubt-driven-development`**; always → `context-engineering` at entry. (Reference the skills; don't inline them.)
3. **Out-of-depth protocol:** subagent stops and reports a specific blocker rather than guessing; orchestrator resolves (re-dispatch higher tier / refine / ask user).
4. **Green gate, 5-iteration ceiling, mandatory diagnosis** each iteration (exact error/file/line · wrong assumption · the one fix). On the **5th failure: STOP**, dispatch a fresh subagent running the existing **`debugging-and-error-recovery`** skill with the task + test + iteration history. It returns a diagnosed fix or a precise blocked-reason. No 6th guess.
5. **Per-task compliance sanity (light).** After green, a fresh subagent checks only: did this task implement its slice of the doc's business rules/edge cases? Fast catch of a missed requirement. `/build` does **not** own the full review — at feature completion it invokes the `/review` flow (§4.6) and blocks on its result.
6. **Integration gate** after all layers: real HTTP/DB/browser/CLI check, not just green tests. Ownership default: "my code is wrong until proven otherwise."
7. **Direct mode:** if no doc/plan exists, build the freeform task with the green gate + reviews, skipping per-layer dispatch. Never block for lack of a doc.

**Acceptance:** a planned feature runs task-by-task; mechanical tasks dispatch on haiku; a forced 5x failure hands off to `debugging-and-error-recovery` (not a loop); reviews run as separate subagents; direct mode works with no doc.

### 4.6 `[NEW + MODIFY]` `/review` + spec-compliance review
**Files:** `skills/spec-compliance-review/SKILL.md` (NEW, follow skill anatomy), `.claude/commands/review.md` (MODIFY existing).
**`spec-compliance-review` skill:** given a feature doc and a diff, verify every Business Rule and Edge Case is implemented and flag scope drift. Distinct from `code-review-and-quality` (which judges *how* code is written) — this judges *whether the right thing was built*. Output: pass / blocking findings.
**`/review` modification:** the existing `/review` runs `code-review-and-quality` + `security-and-hardening` + `performance-optimization`. **Prepend Axis 0: spec-compliance-review** (only when a `.cairn/docs/` doc covers the change; skip + note otherwise). Order: compliance → quality → security → performance. This is the single home of review logic — `/build` invokes this flow at feature completion; it also runs standalone on any change.
**Reused as-is (no modification needed):** `/test` (verify phase — runs the suite + browser testing after build) and `/code-simplify` (optional, run on the milestone before `/ship`) stay exactly as the fork ships them. Cairn keeps the full 7-command lifecycle.
**Acceptance:** `/review` on a feature with a doc runs spec-compliance first and blocks on a missing rule; on code with no doc, skips Axis 0 and still runs quality/security/performance; a deliberately omitted business rule is caught.

### 4.7 `[NEW]` `/status` + `.startup.md` (read at command entry, not session start)
**File:** `.claude/commands/status.md`. **No SessionStart hook** — Cairn deliberately does not auto-inject at session start (keeps sessions clean when you're not building).
**Behavior:** `/status` scans `.cairn/docs/` + `.cairn/plans/` + the promoted rules in `.cairn/learnings.md`, writes `.cairn/.startup.md` (project snapshot: stack, features with tags + status, promoted durable rules; append-only Notes preserved). `/spec` and `/build` **read `.cairn/.startup.md` at entry** for orientation.
**Acceptance:** `/status` rebuilds `.startup.md`; `/spec`/`/build` load it at entry; nothing is injected at session start.

### 4.8 `[MODIFY]` `/ship` — end-of-milestone deploy checkpoint
**File:** `.claude/commands/ship.md`.
**Role:** the final gate before deploying a milestone — not a per-feature step. Compose existing Ship skills as serial gates: `git-workflow-and-versioning` → `ci-cd-and-automation` → `documentation-and-adrs` (+ `deprecation-and-migration` if anything was deprecated) → `shipping-and-launch`. Then the endorsed parallel persona fan-out (`code-reviewer` + `security-auditor` + `test-engineer`) producing a synthesized go/no-go report. Update shipped docs to `status: complete`.
**Acceptance:** `/ship` runs the gates in order, fans out the three personas in parallel, and emits a single deploy readiness verdict.

### 4.9 `[NEW]` npm packaging
**Files:** `package.json` (bin: `cairn`), `bin/cli.js`, `src/install.js`.
**Behavior:** `cairn install` copies `commands/` → `~/.claude/commands/`, `skills/` → `~/.claude/skills/`, `agents/` → `~/.claude/agents/`, mode/template files → `~/.claude/cairn/`, hooks → `~/.claude/hooks/cairn/`; chmods the `.sh` hooks; registers Branch Guard + SessionStart in `~/.claude/settings.json` **idempotently** (de-dupe by command-string signature); injects a CLAUDE.md guidance block behind strip-and-replace markers. Flags: `--install-local` (→ `./.claude/` + `./CLAUDE.md`, scopes Branch Guard to the project), `--dir <path>` (custom, skips CLAUDE.md). `cairn update` re-runs install without duplicating.
**Acceptance:** install produces the tree above; re-install adds zero duplicate hook entries; `--install-local` scopes Branch Guard.

> A **complete, tested reference implementation of every section (§4.1–§4.10)** exists and ships alongside this spec — install is idempotent, Branch Guard verified, all 6 commands and 2 new skills present. Claude Code's job in the fork is **placement + integration into agent-skills' layout + verification**, not authoring from scratch. Regenerate from this spec only if a file is lost. See FORK-SETUP.md.

### 4.10 `[NEW]` Learnings digestion (the GSD pillar)
**Files:** `skills/learnings-capture/SKILL.md` (follow skill anatomy), `.claude/commands/digest.md`.
**`learnings-capture` skill:** appends durable rules to `.cairn/learnings.md` when a green gate fails 3+ times with a non-obvious root cause, the user corrects an approach, an external tool surprises, a review catches a class of mistake, or a better approach is found. Entry format: WHAT HAPPENED / ROOT CAUSE / DURABLE RULE / TAGS. Dedupe by rule; seen-counter; **3x recurrence promotes** to a Durable Rules section + flags a CLAUDE.md / new-skill candidate.
**`/digest <id>` command:** run after `/build` or `/ship`. Gathers the feature's artifacts (doc, plan, green-gate iteration histories, `debugging-and-error-recovery` reports, blocking review findings, diff-vs-doc, user corrections), invokes `learnings-capture` to extract rules, mines specifically: root causes behind 5x→debugging handoffs (highest value), user corrections, complexity-tag estimation misses (recalibrates `/plan`), tool/API surprises, scope drift. Updates `.cairn/.startup.md` Rules Summary with promoted rules.
**Feedback loop (modify §4.3 and §4.5):** `/spec` and `/build` read tag-matched learnings from `.cairn/learnings.md` (read-only) at entry, so prior root causes are in context before work starts. This closes the loop — capture without feedback is just a diary.
**Acceptance:** a 5x→debugging root cause becomes a learning; a rule seen 3x is promoted; `/spec` on a feature whose tags match an existing learning surfaces it before asking questions.

---

### 4.11 `[MODIFY]` `using-agent-skills` meta-skill
**File:** `skills/using-agent-skills/SKILL.md`.
**Change:** the base meta-skill maps work to skills but predates Cairn's additions. Update it to the full Cairn workflow: the 9-command lifecycle (spec→plan→build→test→review→[code-simplify]→ship + digest + status), the discovery flowchart extended with `spec-compliance-review` and `learnings-capture` and the command each skill routes through, the "what Cairn adds" section (doc-first, SDD dispatch, model tiering, learnings loop, Branch Guard), and the operating rules (opt-in doc-first, one spec artifact, fresh-eyes review, reuse-over-reinvention, read-learnings-before-building).
**Loading:** this meta-skill loads at **`/spec` entry** (§4.3), not at session start. That is the deliberate replacement for an always-on SessionStart injection.
**Acceptance:** `/spec` reads the meta-skill at entry; the flowchart references every Cairn skill and command with correct names; no SessionStart injection of the meta-skill exists.

## 5. Build sequence (ordered for Claude Code)

Dependency-ordered. Each step has an acceptance gate; stop and report at each.

1. **§4.9 npm packaging + §4.1 Branch Guard + §4.7 hook** — the plumbing. Verify install is idempotent and Branch Guard behaves. *Gate: install tree correct, hook exit codes correct.*
2. **§4.2 doc schema + §4.3 `/spec`** — the artifact foundation. *Gate: `/spec` writes a valid doc, no code.*
3. **§4.4 `/plan`** — decomposition + file-declaration gate. *Gate: layers + gate PASS on a real doc.*
4. **§4.6 spec-compliance skill** — needed before `/build` can review. *Gate: catches an omitted rule.*
5. **§4.5 `/build` rewrite** — the keystone. *Gate: task dispatch + tiering + 5x→debugging handoff + two-stage review + direct mode all work on one real feature.*
6. **§4.8 `/ship`** — milestone checkpoint. *Gate: gates in order + persona fan-out + verdict.*
7. **§4.10 learnings — `learnings-capture` skill + `/digest`** — then wire the read-back feedback into `/spec` and `/build`. *Gate: a 5x root cause becomes a learning; 3x promotes; `/spec` surfaces a tag-matched learning.*
8. **§4.7 `/status`** — orientation. *Gate: `.startup.md` rebuilt and injected next session.*

After step 5, **stop and run one real feature end-to-end** (`/spec → /plan → /build`) on an actual project before building 6–7. Verify before extending.

---

## 6. Acceptance criteria (whole system)

- [ ] `npm install -g . && cairn install` produces the documented tree; re-install adds no duplicates.
- [ ] Branch Guard blocks writes on `main` in a `.cairn/` project, allows feature branches, no-ops elsewhere.
- [ ] `/spec` writes an opt-in feature doc and stops; no doc is ever required by `/build`.
- [ ] `/plan` decomposes with a passing file-declaration gate and honest complexity tags.
- [ ] `/build` dispatches fresh subagents per task on inferred model tiers; mechanical tasks land on haiku.
- [ ] `/build` runs the SDD loop with a light per-task compliance sanity, then invokes `/review` at feature completion; it does not own multi-axis review.
- [ ] `/review` runs spec-compliance (Axis 0, when a doc exists) before quality/security/performance, and works standalone on any change.
- [ ] `/test` and `/code-simplify` remain available, unchanged from the fork — the full 7-command lifecycle is intact.
- [ ] A 5x green-gate failure hands off to `debugging-and-error-recovery`, not a 6th iteration.
- [ ] `/ship` runs Ship-skill gates in order plus the three-persona fan-out and emits one verdict.
- [ ] `/digest` turns a 5x→debugging root cause into a durable rule; 3x recurrence promotes it; `/spec` and `/build` read tag-matched learnings at entry.
- [ ] No existing skill is duplicated — all new components reference, not reimplement.

---

## 7. Target end-state file tree (additions to the fork)

```
<fork-of-agent-skills>/
├── package.json                         # NEW — bin: cairn
├── bin/cli.js                           # NEW
├── src/install.js                       # NEW
├── templates/feature-doc.md             # NEW — doc schema
├── hooks/
│   ├── branch-guard.sh                  # PORT (MDD) — the only hook
│   └── hooks.json                       # MODIFY — register Branch Guard (PreToolUse) only
├── skills/
│   ├── spec-compliance-review/SKILL.md  # NEW
│   ├── learnings-capture/SKILL.md        # NEW — the GSD pillar
│   └── using-agent-skills/SKILL.md       # MODIFY — full Cairn workflow map, loads at /spec entry
├── .claude/commands/
│   ├── spec.md                          # MODIFY — doc-first + read learnings at entry
│   ├── plan.md                          # MODIFY — file-declaration gate
│   ├── build.md                         # REWRITE — SDD dispatcher + read learnings at entry
│   ├── review.md                        # MODIFY — prepend spec-compliance as Axis 0
│   ├── ship.md                          # MODIFY — milestone checkpoint
│   ├── digest.md                        # NEW — learnings digestion
│   ├── status.md                        # NEW
│   └── (test.md, code-simplify.md unchanged — reused from the fork as-is)
└── (everything else unchanged — 23 skills, 3 personas, references/, docs/)
```

Runtime artifacts created per project: `.cairn/docs/`, `.cairn/plans/`, `.cairn/.startup.md`, `.cairn/learnings.md`.

---

*End of spec. Cairn = agent-skills (the library) + superpowers SDD (the engine) + MDD persistence (docs + hooks) + GSD learnings (the digestion loop), assembled lean — new code only where no existing asset covers it.*
