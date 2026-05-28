---
description: Execute a Cairn plan via subagent-driven development. Fresh subagent per task on the cheapest capable model, green-gate loop, two-stage review. Works with or without a plan (opt-in doc-first).
argument-hint: <feature-id> | <freeform task if no doc>
---

# /build — Subagent-Driven Dispatcher

You are the **orchestrator**. You do not write implementation code yourself. You dispatch fresh subagents per task, gate their output, and integrate. "The expensive model does the thinking; the cheap model does the typing."

## Inputs
- `$ARGUMENTS` — a feature id (preferred) or, if no doc exists, a freeform task.

## Step 0 — Resolve mode (opt-in doc-first)
- If a plan exists at `.cairn/plans/<id>.md` → **planned mode** (full pipeline below).
- If a doc exists but no plan → offer to run `/plan` first, or proceed single-task using the doc as context.
- If neither exists → **direct mode**: this is allowed. Build the freeform task with the green gate + review gates below, skipping the per-layer dispatch. Never block work for lack of a doc.

## Step 1 — Branch
Confirm not on `main`/`master` (Branch Guard will block writes anyway). If on main with a clean tree, create `feat/<id-or-slug>`. If dirty, stop and offer to commit/stash.

## Step 2 — Per-task dispatch loop (planned mode)
Process layers in order. Within a layer, tasks are parallel-safe (file-declaration gate guaranteed this in `/plan`) — dispatch them concurrently.

For each task:

### 2a — Infer the model tier (OBRA-style, at dispatch)
Use the task's `complexity` signal plus your read of the task as inputs, but **you decide at dispatch**. Rubric:
- `mechanical` and fully specified → **haiku**. Boilerplate, wiring, CRUD, format changes.
- `standard` → **sonnet**. Ordinary implementation with local decisions.
- `novel`, security-sensitive, or irreversible → **opus**. Architecture, auth, money, data migrations.
- When uncertain between two tiers, pick the cheaper one and let the subagent escalate (Step 2c). A cheap-first attempt that escalates is usually cheaper than defaulting high.

### 2b — Dispatch the implementation subagent
Spawn a fresh subagent (Task tool) at the chosen model with **only**: the feature doc, this one task (purpose/files/tests), and the relevant test file(s). Not the whole plan, not sibling tasks. Instruct it to follow TDD strictly: write/confirm the failing test (RED), then minimal code to pass (GREEN). Tests are never modified to pass — only implementation.

### 2c — Out-of-depth signal
Instruct every subagent: if the task is underspecified, contradicts the doc, or needs a decision above its pay grade, **stop and report the specific blocker** rather than guessing. On that signal, you (orchestrator) resolve it — re-dispatch at a higher tier, refine the task, or ask the user. Do not let a cheap subagent invent architecture.

### 2d — Green gate (5-iteration ceiling)
After the subagent returns, run the task's tests + typecheck.
- All green → proceed to review (Step 3).
- Failing → the subagent iterates. Each iteration is **mandatory-diagnosis-first**:
  > Iteration N — exact error/file/line · which assumption was wrong · the ONE targeted fix
  Fix implementation only. Never edit tests to pass.
- **On the 5th failed iteration: STOP. Do not attempt a 6th.** Dispatch a fresh subagent that follows the existing `agent-skills:debugging-and-error-recovery` skill, passing it the task, the test, and the full iteration history. Its job is root-cause analysis, not more guessing — it returns either a diagnosed fix or a precise statement of why the task is blocked. Integrate its finding; if still blocked, surface to the user with its report. (No custom debugger — reuse the skill that already exists.)

## Step 3 — Per-task compliance sanity (light)
After a task's green gate passes, run a **light** spec-compliance check in a fresh subagent: did this task implement its slice of the doc's Business Rules and Edge Cases? This is a fast sanity pass to catch a missed requirement while context is fresh — not the full review. Blocking miss → return to step 2b. (The authoritative, multi-axis review is `/review`, run at feature completion in Step 5 — `/build` does not own review logic.)

Never let the implementing subagent check its own work; the sanity pass is a fresh subagent.

## Step 4 — Integration gate
After all layers complete, verify real behavior, not just green tests:
- backend → real HTTP call, response shape matches the doc's API section
- frontend → load it, check console + network
- db → query directly, confirm the model matches
- tooling → run against a real scenario

Ownership default: "my code is wrong until proven otherwise" — before blaming an external cause, run a minimal probe and state a falsifiable hypothesis.

## Step 5 — Finish
After all layers are green, run the full review: invoke the `/review` flow on the feature (spec-compliance + quality + security + performance). Do not declare the feature done until `/review` passes (blocking findings resolved).

Then update doc frontmatter (`status: complete` if shipping-ready, else `in_progress`; `phase: build`; `last_synced` today). Offer: commit & merge / commit only / leave for manual. Suggest the lifecycle tail: `/test` for holistic verification, `/digest <id>` to capture learnings, and `/code-simplify` + `/ship` at milestone.

Before dispatching any task in Step 2, read `.cairn/.startup.md` (if present) for project orientation and `.cairn/learnings.md` (if present), surfacing any rules whose TAGS match this feature — prior root causes belong in context before the subagents start. (These are read at entry, not auto-injected at session start.)

## Anti-rationalization
- "I'll just implement this task myself instead of dispatching" → you're the orchestrator. Implementing in the main context pollutes it and defeats the isolation that makes SDD work. Dispatch.
- "Tests are failing but the code looks right, I'll tweak the test" → forbidden. Tests are the spec made executable. Fix the implementation or escalate via the out-of-depth signal.
- "5 iterations is close, one more will do it" → no. The 5th failure means the subagent lacks the root cause. More iterations burn tokens on the same wrong model. Hand to a fresh subagent running `debugging-and-error-recovery`.
- "The implementer can review its own diff, it knows the context" → that context is exactly the bias. The per-task sanity pass and the full `/review` are both fresh subagents.
