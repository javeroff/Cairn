# agent-skills

This is the agent-skills project — a collection of production-grade engineering skills for AI coding agents.

## Project Structure

```
skills/       → Core skills (SKILL.md per directory)
agents/       → Reusable agent personas (code-reviewer, test-engineer, security-auditor)
hooks/        → Session lifecycle hooks
.claude/commands/ → Slash commands (/spec, /plan, /build, /test, /review, /code-simplify, /ship)
references/   → Supplementary checklists (testing, performance, security, accessibility)
docs/         → Setup guides for different tools
```

## Skills by Phase

**Define:** interview-me, idea-refine, spec-driven-development
**Plan:** planning-and-task-breakdown
**Build (orchestrator):** subagent-driven-development, incremental-implementation, context-engineering
**Build (implementer subagent, routed via implementer-prompt):** test-driven-development, source-driven-development, api-and-interface-design, frontend-ui-engineering, doubt-driven-development
**Verify:** browser-testing-with-devtools, debugging-and-error-recovery
**Review:** code-review-and-quality, code-simplification, security-and-hardening, performance-optimization
**Ship:** git-workflow-and-versioning, ci-cd-and-automation, deprecation-and-migration, documentation-and-adrs, shipping-and-launch

## Conventions

- Every skill lives in `skills/<name>/SKILL.md`
- YAML frontmatter with `name` and `description` fields
- Description starts with what the skill does (third person), followed by trigger conditions ("Use when...")
- Every skill has: Overview, When to Use, Process, Common Rationalizations, Red Flags, Verification
- References are in `references/`, not inside skill directories
- Supporting files only created when content exceeds 100 lines

## Commands

- `npm run validate` (or `node scripts/validate-skills.cjs`) — checks skill anatomy (frontmatter + required sections), that every command's skill/persona reference resolves, and that README/CLAUDE doc links are live. CI runs this on every push.
- `npm test` — runs `node --test` (no unit suite yet; the validator is the gate).

## Boundaries

- Always: Follow the skill-anatomy.md format for new skills
- Never: Add skills that are vague advice instead of actionable processes
- Never: Duplicate content between skills — reference other skills instead

## Cairn additions (beyond base agent-skills)

- **Build is two-layer.** `/build` loads `subagent-driven-development` (the orchestrator's dispatch loop) + `incremental-implementation` + `context-engineering`, then dispatches a fresh subagent per task. Each subagent loads its own craft skills via `skills/subagent-driven-development/implementer-prompt.md` — a routing table + anti-rationalization table + a `SKILLS LOADED:` report-back the orchestrator verifies. The orchestrator never loads the implementer craft skills into its own context. Planned builds dispatch; a trivial no-plan task runs in-session (direct mode).
- **`/spec sync <id>`** re-syncs a drifted feature doc to its code (rewrite changed sections; preserve `known_issues` / `depends_on`).
- **`/status`** flags docs whose `source_files` changed since the doc's last sync commit (drift detection, via a commit-range — not a bare date).
- **`/digest`** mines durable rules into `.cairn/learnings.md` (each with a SOURCE), appends a dated `## Build Notes` section to the feature doc, and archives the spent plan to `.cairn/plans/archive/`.

<!-- CAIRN:CRG:START -->
### Cairn x graph (lifecycle mapping)
/spec entry: get_minimal_context + semantic_search_nodes (escalate to explore-codebase on hard brownfield). /plan + /build per-task: get_impact_radius + get_affected_flows + hub/bridge checks. /build 5x-debug: get_impact_radius + query_graph + get_affected_flows. /review: detect_changes + get_review_context + get_affected_flows (opt-in find_large_functions, get_knowledge_gaps). /ship: detect_changes + get_affected_flows. Onboarding a brownfield repo: get_architecture_overview + list_communities once. Cairn commands are the front door; never run CRG's parallel skills (review-changes, debug-issue) alongside their Cairn counterparts. Do NOT use CRG's wiki/docs tools — Cairn owns intent. Blast radius is perfect-recall / loose-precision: widen context safely. Degrades gracefully if the graph is absent.
<!-- CAIRN:CRG:END -->
