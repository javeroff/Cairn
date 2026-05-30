---
description: Build phase. Orchestration only — delegates the dispatch loop to subagent-driven-development; the subagents carry the craft. Works with or without a plan (opt-in doc-first).
argument-hint: <feature-id> | <freeform task if no doc>
---

# /build — Build phase

Orchestration only. The dispatch methodology lives in a skill; this command picks the mode, wires the `.cairn` lifecycle, and hands off to `/review`. It does not restate the dispatch loop.

## Wire-up
- Plan at `.cairn/plans/<id>.md` → **planned mode** (dispatch). Doc but no plan → offer `/plan` or single-task. Neither → **direct mode** (never block for lack of a doc).
- Read `.cairn/.startup.md` + tag-matched `.cairn/learnings.md` at entry.
- Confirm not on `main` (Branch Guard enforces); create `feat/<id>` if needed.
- Planned-mode entry: set feature `status: in_progress`. **`/build` never sets `complete` — only `/ship` does.**

## Planned mode — delegate the orchestration
**Load and follow the `subagent-driven-development` skill.** It owns the whole dispatch loop: process tasks in dependency order (parallel-safe ones concurrently), pick the model per task, dispatch a fresh subagent via its `implementer-prompt` template (which routes the craft skills into the subagent and makes loading them verifiable), run the green gate yourself, route 5x failures to `debugging-and-error-recovery`, and do the risk-tiered fresh-eyes review.

As the orchestrator you also **load and follow `incremental-implementation`** (realized by dispatching one vertical slice per task, green-gating each before the next) and **`context-engineering`** (realized by feeding each subagent only its task + doc excerpt + impact radius). You do **not** load the implementer craft skills (test-driven-development, source-driven-development, api-and-interface-design, frontend-ui-engineering, doubt-driven-development) into your own context — they go into the subagents via the template.

## Direct mode — no plan, single trivial task
Work in-session: load and follow the craft skills that apply (`test-driven-development` always; `source-driven-development` if it touches a framework API; `frontend-ui-engineering` if UI; `api-and-interface-design` if it defines an interface; `doubt-driven-development` if novel/high-stakes), then implement and green-gate. Nothing to orchestrate — don't dispatch a subagent to save one small edit.

## Finish
Integration gate — real HTTP/DB/browser/CLI behavior, not just green tests. Then run the **/review** flow; don't declare done until it passes. Update feature frontmatter `status: in_progress` (NOT complete), `phase: build`, `last_synced` today. (.startup.md is derived — `/status` rebuilds it.)
