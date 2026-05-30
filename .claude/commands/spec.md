---
description: Define phase, opt-in doc-first. Delegates to the Define skills (interview-me, idea-refine, spec-driven-development); persists one feature doc into the .cairn lifecycle. Use when starting a non-trivial feature or on /spec.
argument-hint: <feature description> | sync <feature-id>
---

# /spec — Define phase

Orchestration only. The Define skills do the work; this command picks which apply, runs them, and persists the result as the one source-of-truth doc. It does not restate the skills' methods.

**Two modes.** Default (`/spec <description>`) creates a new feature doc — the Wire-up + Delegate + persistence flow below. `/spec sync <id>` (or when the argument resolves to an existing doc id) re-syncs an existing doc to code that drifted — see Sync mode at the end.

## Wire-up
1. Load the `using-agent-skills` skill — the Cairn map (loads at `/spec` entry, not session start).
2. Read tag-matched `.cairn/learnings.md` and `.cairn/.startup.md` if present, for orientation.
3. Resolve the next id: highest `NN` in `.cairn/docs/` + 1.
4. If the code graph is present: orient with `get_minimal_context_tool`, locate existing code via `semantic_search_nodes_tool`, and escalate to the `explore-codebase` skill only when the feature touches an unfamiliar/complex existing area. Greenfield → skip.

## Delegate to the Define skills (the full phase, conditionally)
- Ask underspecified → **load and follow the `interview-me` skill**.
- Concept rough or multi-directional → **load and follow the `idea-refine` skill**.
- Always → **load and follow the `spec-driven-development` skill** for the spec method and its content areas.

Each skill runs its own process; don't reproduce it here.

## Cairn persistence (all this command adds)
Write the spec-driven-development output into a single artifact `.cairn/docs/NN-<slug>.md` from `~/.claude/cairn/templates/feature-doc.md`. **One spec artifact** — spec-driven-development must not also write a separate `SPEC.md`. Set frontmatter `status: draft`, `phase: spec`, `last_synced` today; infer `tags`. Confirm dependencies on existing docs and flag any tag-overlap before finalizing. Stop at the written doc — no planning, no code.

## Sync mode (`/spec sync <id>`)
Re-sync an existing doc to drifted code — the fix `/status` points to. Do **not** create a new doc, re-run interview/idea-refine, or reset `status`. This is the inverse direction (code→doc).
1. Resolve the doc: glob `.cairn/docs/<id>*.md`. Read it plus every path in its `source_files`.
2. Diff code against the doc — new/removed/changed endpoints, models, business rules, error cases.
3. **Rewrite only the changed sections.** Preserve `known_issues` and `depends_on` (add, never silently drop). Leave `status` and `phase` as-is; set `last_synced` today.
4. Show the proposed changes and get user confirmation before writing — no silent rewrites.

Delegate the prose to the `spec-driven-development` and `documentation-and-adrs` skills; reuse the same `~/.claude/cairn/templates/feature-doc.md` template sections.

(.startup.md is a derived view rebuilt by `/status`. `/spec` does not write it.)
