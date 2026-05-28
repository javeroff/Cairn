---
description: Break a Cairn feature doc into subagent-ownable tasks with a file-declaration gate. Run after /spec, before /build.
argument-hint: <feature-id, e.g. 02 or 02-user-auth>
---

# /plan — Task Decomposition

You are running Cairn's **plan** phase. Input is a feature doc; output is an ordered task list that `/build` dispatches to subagents. Plan quality is the lever that lets `/build` use cheap models — invest here.

## Inputs
- `$ARGUMENTS` — a feature id (`02` or `02-user-auth`).

## Step 0 — Load
1. Resolve the doc: glob `.cairn/docs/<id>*.md`. If none, tell the user to run `/spec` first and stop.
2. Read the doc fully. The frontmatter (`source_files`, `routes`, `models`, `test_files`, `depends_on`) and the Business Rules / Edge Cases sections are your decomposition source.

## Step 1 — Decompose into units
Apply unit decomposition (OBRA's rule): each task is **one clear purpose, a well-defined interface, independently testable**. Test: can someone understand what a unit does without reading its internals? If not, split it.

For each task capture:
- **id** — `T1`, `T2`, … in dependency order
- **purpose** — one line
- **files** — exact paths this task will create or modify (the file-declaration gate depends on this being precise)
- **tests** — which test file(s) prove this task; what behaviors they assert
- **depends_on** — task ids that must complete first
- **layer** — tasks with no unmet dependency and no file overlap share a layer and may run as parallel subagents
- **complexity** — `mechanical` | `standard` | `novel`. This is a *signal* for `/build`'s model inference, not a binding tag. Guidance: mechanical = fully specified, no design decisions (boilerplate, wiring, simple CRUD). standard = ordinary implementation with local decisions. novel = architectural ambiguity, security-sensitive, or irreversible.

## Step 2 — File-declaration gate
Build the file→task map. **No two tasks in the same layer may declare the same file.** If two parallel tasks need the same file, either serialize them (add a dependency) or split the file's concerns. Report the gate result explicitly.

**Graph-aware gate (if the code graph is present).** For each task's declared `files`, call `get_impact_radius_tool` (dependency facts about specific files — not minimal-context). Then call `get_affected_flows_tool` to see which execution paths the task touches, and check the task's files against `get_hub_nodes_tool` / `get_bridge_nodes_tool`. **If a task touches a hub or a bridge, "parallel-safe" is suspect** — a widely-called function or a chokepoint isn't isolated even if no sibling task declares the same file. Serialize or split when the graph says a file is central. (Degrades gracefully if the graph is absent.)

## Step 3 — Write the plan
Write `.cairn/plans/<id>.md`:

\`\`\`
---
feature: <id>
created: <today>
layers: <count>
---

## Layer 1  (parallel-safe)
### T1 — <purpose>
- files: src/a.ts, tests/a.test.ts
- tests: a.test.ts asserts <behaviors>
- depends_on: []
- complexity: mechanical

### T2 — <purpose>
- files: src/b.ts
- depends_on: []
- complexity: standard

## Layer 2
### T3 — <purpose>
- files: src/a.ts        # touches a file T1 owned → must be a later layer
- depends_on: [T1]
- complexity: novel
\`\`\`

## Step 4 — Confirm
Print the layer/task tree, the file-declaration gate result, and the complexity mix. Then:

\`\`\`
🗂  Plan written: .cairn/plans/<id>.md
   Tasks: N across L layers | parallel-safe in layer 1: X
   File-declaration gate: PASS
   Complexity: <a mechanical, b standard, c novel>

Next: /build <id>
\`\`\`

Update the feature doc frontmatter: `phase: plan`.

## Anti-rationalization
- "These two tasks are related, I'll merge them into one big task" → big tasks force expensive models and defeat the cheap-model dispatch. Keep units small and single-purpose.
- "I'll let the files sort themselves out during build" → the file-declaration gate is what makes parallel subagents safe. Declare files precisely now or parallelism corrupts state later.
- "Everything is complexity: novel to be safe" → over-tagging novel wastes money on Opus. Tag honestly; mechanical tasks on Haiku is the whole point.
