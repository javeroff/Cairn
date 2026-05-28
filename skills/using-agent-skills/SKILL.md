---
name: using-agent-skills
description: The Cairn workflow discovery map. Loaded at /spec entry (not session start). Maps incoming work to the right command and skill across the full lifecycle, and defines shared operating rules. Read this first when entering the build workflow or deciding which skill applies.
---

# Using Cairn

Cairn = agent-skills (the skill library) + subagent-driven development (the execution engine) + doc-first persistence + a learnings loop. This skill is the map: it routes work to the right command and skill. It loads at **`/spec` entry** — not at session start — so the workflow machinery is present when you're building and absent when you're not.

## The lifecycle (commands)

```
/spec  →  /plan  →  /build  →  /test  →  /review  →  [/code-simplify]  →  /ship
                                                                          │
                          /digest (after build or ship)   /status (anytime)
```

| Command | Phase | What it does |
|---|---|---|
| `/spec` | Define | Writes the one source-of-truth doc to `.cairn/docs/NN.md` (opt-in). Composes interview-me, idea-refine, spec-driven-development. Reads `.cairn/learnings.md` + `.startup.md` at entry. |
| `/plan` | Plan | Decomposes the doc into subagent-ownable tasks with a file-declaration gate and complexity signal → `.cairn/plans/NN.md`. |
| `/build` | Build | SDD dispatcher: fresh subagent per task on the cheapest capable model, green gate (5x → debugging), light per-task compliance sanity, then hands off to `/review`. |
| `/test` | Verify | Holistic verification — full suite + browser testing. Reused from base as-is. |
| `/review` | Review | Spec-compliance (Axis 0, when a doc exists) → quality → security → performance. The home of review. Runs standalone too. |
| `/code-simplify` | Review | Optional. Run on the milestone before ship. Reused from base as-is. |
| `/ship` | Ship | Milestone deploy checkpoint: serial Ship gates → parallel persona fan-out → go/no-go verdict. |
| `/digest` | Learn | Extracts durable rules from completed work into `.cairn/learnings.md`; 3x recurrence promotes. |
| `/status` | Orient | Rebuilds `.cairn/.startup.md` (project snapshot + promoted durable rules). |

## Skill discovery flowchart

Not every task needs every skill. Match intent to skill:

```
What are you doing?
├── Clarifying an underspecified ask? ──────→ interview-me
├── Exploring a rough idea? ────────────────→ idea-refine
├── Defining a feature/project? ────────────→ spec-driven-development  (via /spec → writes the doc)
├── Breaking a spec into tasks? ────────────→ planning-and-task-breakdown  (via /plan)
├── Building a feature? ────────────────────→ incremental-implementation  (via /build)
│   ├── UI work? ────────────────────────────→ frontend-ui-engineering
│   ├── API / interface work? ───────────────→ api-and-interface-design
│   ├── Need the right context loaded? ──────→ context-engineering          (build composes at entry)
│   ├── Framework code from memory? ─────────→ source-driven-development     (build composes when stack-specific)
│   └── High stakes / unfamiliar / irreversible? → doubt-driven-development  (build composes on novel-tier tasks)
├── Writing or running tests? ──────────────→ test-driven-development  (via /build per task, /test holistic)
│   └── Browser-based? ──────────────────────→ browser-testing-with-devtools
├── Something broke (5x green-gate fail)? ──→ debugging-and-error-recovery  (build dispatches on 5x)
├── Reviewing before merge? ────────────────→ /review:
│   ├── Does it match the doc? ──────────────→ spec-compliance-review   (Axis 0)
│   ├── Is it well written? ─────────────────→ code-review-and-quality  (Axis 1)
│   ├── Security concerns? ──────────────────→ security-and-hardening   (Axis 2)
│   └── Performance concerns? ───────────────→ performance-optimization (Axis 3)
├── Code works but is hard to read? ────────→ code-simplification  (via /code-simplify, optional pre-ship)
├── Shipping a milestone? ───────────────────→ /ship:
│   ├── Commits/versioning? ─────────────────→ git-workflow-and-versioning  (always on code change)
│   ├── Pipeline? ───────────────────────────→ ci-cd-and-automation
│   ├── Removing/migrating? ─────────────────→ deprecation-and-migration
│   ├── Decisions/docs? ─────────────────────→ documentation-and-adrs
│   └── Launch readiness? ───────────────────→ shipping-and-launch
└── Closing the loop? ──────────────────────→ learnings-capture  (via /digest)
```

A bug fix might only need: debugging-and-error-recovery → test-driven-development → /review. Load selectively — more context isn't better.

## What Cairn adds over base agent-skills

- **Doc-first source of truth.** `.cairn/docs/NN.md` persists, drives drift awareness, gives 1-doc context via tags. `spec-driven-development` writes *into* it — never a competing spec file (composition contract).
- **Subagent-driven `/build`.** Fresh subagent per task, cheapest-capable model at dispatch, green gate with a 5x→debugging handoff. The orchestrator thinks; cheap subagents type.
- **`spec-compliance-review`** as Axis 0 of `/review` — judges *whether the right thing was built*, before quality judges *how*.
- **Learnings loop.** `/digest` → `learnings-capture` → promoted rules → surfaced at the next `/spec` and `/build` entry. Capture without read-back is a diary; this closes the loop.
- **Branch Guard** (PreToolUse hook) — the one always-on mechanism, because it's enforcement, not context.

## Operating rules (shared)

1. **Opt-in doc-first.** `/spec` writes the doc only when invoked. `/build` works with or without one — never block direct implementation.
2. **One spec artifact.** The doc is the only spec file. Plans (`.cairn/plans/`) are distinct and ephemeral.
3. **Reviews are fresh-eyes.** Never let the author review their own work — per-task sanity and `/review` both use fresh subagents.
4. **Reuse over reinvention.** Reference existing skills; never duplicate them.
5. **Read learnings before building.** At `/spec` and `/build` entry, surface tag-matched durable rules from `.cairn/learnings.md`.
