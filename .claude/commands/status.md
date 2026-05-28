---
description: Project snapshot + regenerate .cairn/.startup.md, the orientation file that workflow commands (/spec, /build) read at entry so they start oriented without scanning the codebase.
argument-hint: (none)
---

# /status — Snapshot & Orientation-Context Generator

You are running Cairn's **status** phase. It reports the project's current state and, as its main job, rebuilds `.cairn/.startup.md` — the compact file `/spec` and `/build` read at entry so the workflow starts oriented without reading 40 source files. (Cairn does not auto-inject this at session start; it's read on workflow entry, so it never clutters sessions where you're not building.)

## Step 0 — Scan
Gather, in parallel where possible (cheap **haiku** probes):
- `.cairn/docs/*.md` — id, title, status, phase, tags, depends_on of every feature
- `.cairn/plans/*.md` — which features have open plans
- `.cairn/learnings.md` — the promoted Durable Rules section (if present)
- detected stack (from `package.json` / `go.mod` / `pyproject.toml`)
- current git branch
- last `/digest` or build activity if discernible

## Step 1 — Report (to the user, in chat)
```
📊 Cairn Status

Features:  N docs in .cairn/docs/
  ✅ complete: a   🔨 in_progress: b   📝 draft: c
Plans:     d open in .cairn/plans/
Learnings: e durable rules promoted
Branch:    <current>
Stack:     <detected>

Drift watch: <features whose last_synced predates recent commits, if any>
```
(Drift watch is a light heuristic here — the full `/scan` machinery is the optional MDD add-on, not core.)

## Step 2 — Rebuild `.cairn/.startup.md`
Write the file with an auto-generated section (rebuilt every run) above a preserved, append-only Notes section below a `---` divider. Do **not** clobber existing notes.

```
## Project Snapshot
Generated: <date> | Branch: <branch>

## Stack
<detected stack one-liner>

## Features
- 01-<slug> (complete) [tag, tag, tag]
- 02-<slug> (in_progress) [tag, tag]

## Durable Rules
<promoted rules from .cairn/learnings.md — the rules a fresh session must know>

## Last Activity
<last build/ship/digest, if known>

---
## Notes
<preserved append-only; never overwritten>
```

The **Durable Rules** block is what closes the learnings loop: promoted learnings become standing context that `/spec` and `/build` load at entry.

## Step 3 — Confirm
```
🧭 .cairn/.startup.md rebuilt — N features, M durable rules surfaced.
   /spec and /build will load this orientation at entry.
```

## Anti-rationalization
- "The project is small, startup context is unnecessary" → even small projects benefit: the hook injects ~hundreds of tokens instead of the agent re-deriving structure from source. Cheap orientation beats expensive rediscovery.
- "I'll just regenerate the whole file including notes" → notes are append-only human/agent memory. Preserve everything below the `---`. Rebuild only the auto section above it.
- "Skip the durable rules in startup" → then the learnings loop dead-ends. The whole point is prior root causes greet the next session. Include them.
