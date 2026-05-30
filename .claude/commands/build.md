---
description: Build phase, subagent dispatcher. Orchestration spine only; the build skills do the craft. Works with or without a plan (opt-in doc-first).
argument-hint: <feature-id> | <freeform task if no doc>
---

# /build — Build phase

The command orchestrates: dispatch a fresh subagent per task, pick the cheapest capable model, gate on green, route failures and review, and wire the `.cairn` lifecycle. The **build skills do the actual work** — the subagent loads and follows them; this command does not reproduce their content. "The expensive model thinks; the cheap model types."

## Wire-up
- Plan at `.cairn/plans/<id>.md` → planned mode. Doc but no plan → offer `/plan` or single-task. Neither → direct mode (never block for lack of a doc).
- Read `.cairn/.startup.md` + tag-matched `.cairn/learnings.md` at entry.
- Confirm not on `main` (Branch Guard enforces); create `feat/<id>` if needed.
- Planned-mode entry: set feature `status: in_progress`. **`/build` never sets `complete` — only `/ship` does.**

## Per-task dispatch (process in dependency order; dispatch parallel-safe tasks concurrently)
1. **Pick the model**: mechanical → haiku, standard → sonnet, novel/security/irreversible → opus. Floor: any task where skill adherence is load-bearing runs sonnet minimum — haiku under-follows multi-step skills.
2. **Dispatch a fresh subagent** (Task tool) with only the doc + this one task + its test file(s) — plus, if the graph is present, the affected callers/dependents/tests from `get_impact_radius_tool` on the task's files, so it can't break a caller it never read. Instruct it to **load and follow the build skills that apply**: `incremental-implementation` and `test-driven-development` always; `context-engineering` at entry; `source-driven-development` if it touches a framework/library API; `doubt-driven-development` if novel/high-stakes/irreversible; `frontend-ui-engineering` if UI; `api-and-interface-design` if API. The subagent follows each skill's own process — the command does not restate it. **It closes with exactly one status:** `DONE` (complete, self-reviewed, committed), `DONE_WITH_CONCERNS` (complete but flags an issue to carry forward), `BLOCKED` (cannot proceed — needs a decision or unblock), or `NEEDS_CONTEXT` (missing information to implement correctly). Orchestrator response: `DONE`/`DONE_WITH_CONCERNS` → run the green gate (carry any concern to `/review`); `BLOCKED`/`NEEDS_CONTEXT` → supply the missing context or surface to the user — never dispatch a blind retry.
3. **Green gate** (tests + typecheck), 5-iteration ceiling with a one-line diagnosis each iteration; fix implementation only. 5th failure → stop, dispatch a fresh subagent that loads **`debugging-and-error-recovery`** with the iteration history. No 6th guess. (If the graph is present, that subagent localizes via `get_impact_radius_tool` / `query_graph_tool` / `get_affected_flows_tool`.)
4. On green: flip the task's box to `- [x]` in `.cairn/plans/<id>.md`, then run the per-task spec-compliance check **tiered by risk**: mechanical/standard tasks → the implementer runs an inline self-review checklist against the task's acceptance criteria before reporting `DONE` (no extra dispatch); novel/security/irreversible tasks → a **fresh** subagent (never the author) runs the check independently. The full `/review` flow at Finish runs regardless of tier.

## Finish
Integration gate — real HTTP/DB/browser/CLI behavior, not just green tests. Then run the **/review** flow; don't declare done until it passes. Update feature frontmatter `status: in_progress` (NOT complete), `phase: build`, `last_synced` today. (.startup.md is derived — `/status` rebuilds it.)
