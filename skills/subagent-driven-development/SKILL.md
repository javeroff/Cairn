---
name: subagent-driven-development
description: Orchestrates a build by dispatching a fresh subagent per task instead of writing code in the main context. Use when running Cairn's /build on a planned, multi-task feature — to isolate each task's context, tier the model to task difficulty, gate on green, and review with fresh eyes. This is the orchestrator's playbook; the dispatched subagents carry the craft.
---

# Subagent-Driven Development

## Overview

You are the **orchestrator**. You do not write the feature — you decompose it into tasks, dispatch one fresh subagent per task, gate each on green, and review. "The expensive model thinks; the cheap model types." This skill is the orchestrator's craft; the *implementer* skills (test-driven-development, source-driven-development, …) belong to the subagents you dispatch, never to you.

The point of the boundary: a subagent that holds only its one task stays focused and cheap; your context stays clean for sequencing and review. Loading a craft skill into your own context would make you implement instead of orchestrate — and its "write the code this way" instructions would contradict this skill's "dispatch, don't code."

## When to Use

- Running `/build` on a feature with a `.cairn/plans/<id>.md` task list (planned mode).
- Any build with two or more independent or sequential tasks worth isolating.

**When NOT to use:** a single trivial freeform task with no plan — `/build`'s **direct mode** handles that in-session (you load the craft skills yourself and just do it; there's nothing to orchestrate). Do not dispatch a subagent to save yourself one small edit.

## The Layer Boundary (load-bearing)

You load, at the orchestrator layer:
- **this skill** — how to dispatch, tier, gate, and review.
- **`incremental-implementation`** — which you realize by dispatching **one vertical slice per subagent** and green-gating each before the next. You do not write slices yourself.
- **`context-engineering`** — which you realize by feeding each subagent **only** its task + the relevant doc excerpt + its impact radius. Right-sized context per worker is your job.

You do **not** load test-driven-development, source-driven-development, api-and-interface-design, frontend-ui-engineering, or doubt-driven-development. Those go into the **subagent** via `implementer-prompt.md`. (`doubt-driven-development`'s fresh-context adversarial review is realized at *your* layer — the risk-tiered review below — because a subagent cannot spawn its own reviewer.)

## Core Process

Process tasks in dependency order; dispatch parallel-safe tasks (no file overlap, no unmet deps) concurrently.

1. **Pick the model.** mechanical → haiku · standard → sonnet · novel / security-sensitive / irreversible → opus. Floor: any task where skill-adherence is load-bearing runs **sonnet minimum** — haiku under-follows multi-step skills.
2. **Dispatch a fresh subagent** (Task tool) using **`implementer-prompt.md`**. Fill its slots: the one task + acceptance criteria + verify command; the doc excerpt; the impact-radius facts (if the graph is present, `get_impact_radius_tool` on the task's files so it can't break a caller it never read); and the task's **complexity + file types** so the subagent classifies correctly against the prompt's routing table. Never hand-wave the skill list — the template owns it.
3. **Read the report.** It opens with `SKILLS LOADED: [...]` and closes with one status. **Verify the SKILLS LOADED line covers every skill the task's facts triggered** (e.g. a framework-API task must show `source-driven-development`). If a required skill is missing → re-dispatch; do not accept the work.
   - `DONE` / `DONE_WITH_CONCERNS` → proceed to the green gate (carry any concern to `/review`).
   - `BLOCKED` / `NEEDS_CONTEXT` → supply the missing context or surface to the user. Never dispatch a blind retry.
4. **Green gate** — run the task's tests + typecheck **yourself** (evidence before claims; don't trust the report). 5-iteration ceiling, a one-line diagnosis each iteration, fix implementation only — never edit tests to pass. 5th failure → stop and dispatch a fresh subagent that loads `debugging-and-error-recovery` with the full iteration history. No 6th guess.
5. **On green** — flip the task's box to `- [x]` in the plan, then the **risk-tiered review**: mechanical/standard → trust the subagent's inline self-review (already in its report); novel/security/irreversible → dispatch a **fresh** subagent (never the author) to check spec-compliance independently. This fresh-eyes pass is `doubt-driven-development` realized at depth-1.

All dispatches (implementer, debugger, reviewer) are issued by **you**, the orchestrator — depth-1. Subagents never dispatch subagents.

## Common Rationalizations

| Excuse | Reality |
|---|---|
| "I'll just implement this task myself, it's faster" | You pollute your context and skip the fresh-eyes gate. Dispatch it. Direct mode exists only for *no-plan* trivial work. |
| "The subagent probably loaded the right skills" | Probably isn't evidence. Read the `SKILLS LOADED:` line; re-dispatch if a triggered skill is missing. |
| "Tests pass, the report says DONE, I'm done" | Run the gate yourself. A passing report you didn't reproduce is a claim, not proof. |
| "I'll load TDD so I can review the code properly" | That drags you into the implementer layer. You review against the task's acceptance criteria and the diff — not by re-running its craft. |
| "This novel task is fine, skip the fresh reviewer" | Novel/security/irreversible is exactly where author-blindness costs the most. Dispatch the independent check. |

## Red Flags

- You wrote feature code in the orchestrator context (you should have dispatched).
- A craft skill (TDD, source-driven, UI, API) appears in your own loaded-skills list.
- You accepted a report whose `SKILLS LOADED:` line is empty or misses a triggered skill.
- You declared a task green without running its gate yourself.
- A subagent tried to dispatch another subagent (depth > 1).

## Verification

- [ ] Every planned task was dispatched via `implementer-prompt.md` (none implemented in the orchestrator context).
- [ ] Every returned report carries a `SKILLS LOADED:` line that covers the task's triggered skills; missing-skill reports were re-dispatched.
- [ ] Each green gate was run independently by the orchestrator, not taken on the report's word.
- [ ] Novel/security/irreversible tasks got a fresh-eyes reviewer (author ≠ reviewer).
- [ ] Orchestrator loaded only this skill + `incremental-implementation` + `context-engineering` — no craft skills.
