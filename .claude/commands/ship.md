---
description: Ship phase, end-of-milestone deploy checkpoint. Delegates the Ship skills as serial gates then fans out the three personas. The only command that sets a feature status to complete. Not a per-feature step.
argument-hint: [milestone or feature ids]
---

# /ship — Ship phase

Orchestration only. Each gate loads and follows its skill; this command sequences them, runs the persona fan-out, emits one verdict, and is the **sole setter of `status: complete`**.

## Wire-up
- Scope = the passed ids, else the current branch's `in_progress` features whose build + review are done. Confirm not on `main` (shipping merges into it).
- If the graph is present: `detect_changes_tool` for a risk map + `get_affected_flows_tool` for touched runtime paths; feed both to the fan-out.

## Serial gates (each delegates; a failing gate stops the ship)
1. **Load and follow the `git-workflow-and-versioning` skill.**
2. **Load and follow the `ci-cd-and-automation` skill** — green in CI, not just locally.
3. **Load and follow the `documentation-and-adrs` skill.**
4. **If anything was deprecated/migrated: load and follow the `deprecation-and-migration` skill.**
5. **Load and follow the `shipping-and-launch` skill** — rollback plan, flags, monitoring.

Each skill owns its checklist; the command does not restate them.

## Persona fan-out + verdict
Gates green → dispatch `code-reviewer`, `security-auditor`, `test-engineer` concurrently (one turn) against the milestone diff. Synthesize: NO-GO on any failed gate or any P1/critical; else GO.

## On GO (the one place complete is set)
Set the shipped features' frontmatter `status: complete`, `phase: ship`, `last_synced` today. Offer merge / PR / hold. After merge, suggest `/digest` and `/status` (which rebuilds the derived `.startup.md` from the now-updated frontmatter).
