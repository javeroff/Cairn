---
description: Digest a completed feature's artifacts into durable learnings. Run after /build or /ship to extract root causes, corrections, and discoveries into .cairn/learnings.md.
argument-hint: <feature-id>
---

# /digest — Completion Learning Digestion

You are running Cairn's **digest** phase — the close of the loop. A spec is done; now extract what it taught so the next spec starts smarter. This is the GSD pillar.

## Inputs
- `$ARGUMENTS` — the completed feature id.

## Step 0 — Gather the evidence
For the feature, collect the artifacts the build produced:
- the feature doc (`.cairn/docs/<id>.md`) and its `known_issues`
- the plan (`.cairn/plans/<id>.md`) — which tasks were `novel`, which needed escalation
- green-gate iteration histories — any task that needed 3+ iterations or hit the 5x debugging handoff
- the `debugging-and-error-recovery` reports from any handoff
- spec-compliance and code-quality review findings that blocked
- the final diff vs. what the doc specified (scope drift in either direction)
- any user corrections during the build

## Step 1 — Extract durable rules
Invoke the `learnings-capture` skill. For each piece of evidence, ask: *is this a one-off, or a rule a future task should follow?* Record only the rules. Specifically mine:
- **Root causes** behind every 5x→debugging handoff (these are the highest-value learnings — they cost the most to discover).
- **Corrections** the user made (their corrections encode preferences and constraints the doc missed).
- **Estimation misses** — tasks tagged `mechanical` that turned out `novel` (recalibrates future `/plan` complexity tagging).
- **Tool/API surprises** — anything that behaved differently than the doc assumed.
- **Scope drift** — code beyond the doc, or doc rules never implemented.

## Step 2 — Write + promote
Append entries to `.cairn/learnings.md` via the skill's format. Dedupe against existing rules; increment seen-counters; promote anything at 3x to Durable Rules and flag it as a `CLAUDE.md` rule or new-skill candidate.

## Step 3 — Feed back
Update `.cairn/.startup.md` so its Rules Summary reflects any newly promoted durable rules. This is what makes the next session start with the learning already in context.

## Step 4 — Report
\`\`\`
🧠 Digest complete: <id>
   New learnings: N (root causes: a, corrections: b, estimation: c, tooling: d)
   Promoted to durable rules: M
   Candidates for CLAUDE.md / new skill: <list>
\`\`\`

## Anti-rationalization
- "The feature shipped fine, nothing to learn" → a clean build still teaches: which complexity tags were accurate, which tasks were trivial, what the doc got right. Even confirmations recalibrate `/plan`. But don't manufacture learnings — if it was genuinely uneventful, record that the doc/plan were well-calibrated and move on.
- "I'll digest a batch of features later" → the iteration histories and correction context are freshest now. Digest at completion, while the evidence is intact.
- "This root cause is obvious in hindsight" → hindsight-obvious is exactly what a fresh context won't have. Write it.
