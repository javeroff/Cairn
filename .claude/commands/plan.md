---
description: Decompose a .cairn feature doc into tasks. Delegates to planning-and-task-breakdown; persists the skill's plan + checklist into the .cairn lifecycle. Run after /spec, before /build.
argument-hint: <feature-id, e.g. 02 or 02-user-auth>
---

# /plan — Plan phase

Orchestration only. `planning-and-task-breakdown` does the decomposition; this command feeds it the feature doc and persists its output to the `.cairn` lifecycle. Do not restate or override the skill's method here.

## Wire-up
1. Resolve the doc: glob `.cairn/docs/<id>*.md`. None → tell the user to run `/spec` first and stop.
2. Read it fully — frontmatter (`source_files`, `routes`, `models`, `depends_on`) plus Business Rules and Edge Cases are the decomposition source.
3. Read tag-matched `.cairn/learnings.md` if present.

## Delegate
**Load and follow the `planning-and-task-breakdown` skill.** It owns the entire process: read-only plan mode, the dependency graph, **vertical slicing (one complete path per task — not horizontal layers)**, tasks with acceptance criteria and verification steps, the task-sizing table, and checkpoints between phases. Follow the skill; the command adds nothing to its method.

## Cairn persistence (all this command contributes)
Persist the skill's output to `.cairn/plans/<id>.md`: its plan plus the **checkbox task list** it produces — one `- [ ]` per task carrying that task's acceptance criteria and verify command. This is the skill's task list, kept in the `.cairn` lifecycle so `/build` checks each box (`- [x]`) as its green gate passes. For each task also record `depends_on` and a parallel-safe hint (which tasks declare no overlapping files) — an annotation for `/build`'s dispatcher, not a re-layering of the plan.

(If the code graph is present, per task: `get_impact_radius_tool` (file dependencies) + `get_affected_flows_tool` (runtime paths the task touches), and check the files against `get_hub_nodes_tool` / `get_bridge_nodes_tool` — a hub or bridge touch makes "parallel-safe" suspect even when no sibling declares the same file. Degrades gracefully if absent.)

Set the feature doc frontmatter `phase: plan`. Status stays `draft` — `/build` moves it to `in_progress`.
