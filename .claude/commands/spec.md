---
description: Write a feature doc to .cairn/docs/ before code. Opt-in entry point to the Cairn workflow. Use when starting a non-trivial feature, or when the user types /spec.
argument-hint: <feature description>
---

# /spec — Feature Documentation (opt-in doc-first)

You are running Cairn's **spec** phase. The output is a single feature doc that becomes the source of truth for `/plan` and `/build`. This phase is opt-in: it only runs when the user invokes `/spec`. Do not force it elsewhere.

## Inputs
- `$ARGUMENTS` — the feature description from the user.

## Step 0 — Bootstrap (silent)
1. **Load the workflow map.** Read the `using-agent-skills` meta-skill first — it routes work to the right command and skill across the lifecycle. This is where the meta-skill loads (at workflow entry), not at session start.
2. Ensure `.cairn/docs/` exists. Create it if missing, no prompt.
3. Glob `.cairn/docs/*.md` to find the highest existing `NN` prefix. The new doc is `NN+1` (zero-padded, two digits).
4. Read `~/.claude/cairn/templates/feature-doc.md` for the frontmatter schema you must follow.
5. Read `.cairn/.startup.md` if present for project orientation (it is no longer auto-injected at session start).

## Step 1 — Understand before asking (parallel context gather)
Before asking the user anything, dispatch up to 3 lightweight context probes **in parallel** using the Task tool with the **cheapest capable model (haiku)**:
- **Rules probe:** read `CLAUDE.md` and any `ARCHITECTURE.md` → return coding rules + quality gates.
- **Features probe:** glob `.cairn/docs/*.md` → return existing feature IDs, titles, statuses, dependency chains.
- **Codebase probe:** glob `src/**` (or repo root if no `src/`) → return directory structure + detected stack.

Skip a probe when it's obviously irrelevant (e.g. greenfield repo → skip codebase probe).

Also read `.cairn/learnings.md` if present and surface any durable rules whose TAGS match this request — prior root causes should inform the doc before you ask the user anything.

## Step 2 — Focused questions
Compose the define-phase skills here. If installed, follow `interview-me` and `idea-refine` skill guidance, and `spec-driven-development` for the speccing process and its six content areas (Objective, Commands, Project Structure, Code Style, Testing Strategy, success criteria). **Critical:** `spec-driven-development` contributes its *method and content* only — it must not write a separate spec file. This doc (`.cairn/docs/NN.md`) is the single source of truth; map the six areas into the body sections below. Ask only what the doc needs and the probes did not answer. Always ask:
- Does this depend on any existing feature doc? (offer the IDs the features probe found)
- Known edge cases or error scenarios?

For backend/API features additionally ask:
- Database storage needed?
- API endpoints?
- Auth/authorization?
- Real-time, background jobs, or external integrations?

Keep it to one batched round of questions where possible. Do not interrogate.

## Step 3 — Detect overlap
If the features probe shows an existing doc whose `tags` overlap the new request, surface it before writing:
> "This overlaps `02-user-auth`. Use `/spec` to create a new doc anyway, or revise that one?"
Let the user decide. Never silently duplicate.

## Step 4 — Write the doc
Create `.cairn/docs/NN-<slug>.md` from the template. Fill every frontmatter field you can determine; leave `known_issues: []` empty. Populate the body sections from the answers. `status: draft`, `phase: spec`, `last_synced` = today.

Infer `tags` (4-8 domain keywords) from the title and purpose — these drive prompt-overlap detection later.

## Step 5 — Confirm and hand off
Print a compact summary:

\`\`\`
📋 Cairn spec written: .cairn/docs/NN-<slug>.md
   Depends on: <ids or none>
   Routes: <count> | Models: <count> | Tags: <list>

Next: /plan NN-<slug>  — break this into subagent-ownable tasks
\`\`\`

Do **not** start planning or implementing in this phase. Spec ends at a written, confirmed doc.

## Anti-rationalization
- "I basically know what to build, I'll skip the doc" → the doc is the artifact `/build` dispatches from. No doc = no source of truth for the subagents. Write it.
- "The user gave a short description, I'll pad the doc with assumptions" → mark anything inferred in Business Rules as an assumption, or ask. Never invent constraints silently.
- "This is similar to an existing feature, I'll copy its doc" → overlap detection (Step 3) exists precisely so you surface this to the user instead of duplicating.
