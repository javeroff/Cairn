---
description: Holistic review of a feature or change before merge. Runs spec-compliance (does it match the doc?) then the five-axis quality, security, and performance review. The home of spec-compliance-review. Runs on any change, not just Cairn-built.
argument-hint: [feature-id | git ref | "staged"]
---

# /review — Feature / Change Review

You are running Cairn's **review** phase. This is the holistic, multi-axis review of a change before it merges — distinct from `/build`'s per-task green gate and from `/ship`'s milestone persona fan-out. It is the single home of spec-compliance review. Run review subagents fresh; never let the author review their own work.

## Inputs
- `$ARGUMENTS` — a feature id (reviews the diff against its `.cairn/docs/` doc), a git ref/range, or `staged`. If empty, review the current branch's diff vs. its base.

## Axes (run in order; each as a fresh subagent where it benefits)

### Axis 0 — Spec compliance *(only if a feature doc exists)*
Load the `spec-compliance-review` skill. Given the doc + the diff: is every Business Rule and Edge Case implemented, with no scope drift? This runs **first** — no point judging code quality on an implementation that builds the wrong thing. If no `.cairn/docs/` doc covers the change (e.g. reviewing arbitrary code), skip this axis and note it.

### Axis 1 — Code quality
Load `code-review-and-quality` (five-axis) / the `code-reviewer` persona on the diff: correctness, clarity, structure, error handling, maintainability.

### Axis 2 — Security
Load `security-and-hardening`: input validation, authn/authz, secrets, injection surfaces, dependency risk.

### Axis 3 — Performance
Load `performance-optimization`: hot paths, N+1s, unnecessary allocation/IO, algorithmic complexity where it matters.

## Output
```
🔍 REVIEW — <feature-id / ref>

Axis 0 Spec compliance:  PASS | BLOCKED (<n missing/partial>)   [skipped: no doc]
Axis 1 Quality:          <P1:0 P2:2 P3:3>
Axis 2 Security:         <P1:0 P2:1>
Axis 3 Performance:      <P1:0 P2:0>

Blocking (must fix before merge): <P1s + spec-compliance misses>
Advisory (recommended):           <P2/P3>
```

Spec-compliance misses and any P1 are **blocking**. P2/P3 are advisory.

## Lifecycle
- `/build` calls this flow at feature completion before declaring a feature done.
- Run standalone anytime: on a PR, on legacy code, on a colleague's branch.
- After review passes, the optional `/code-simplify` may run before `/ship`.
- Feed blocking findings that revealed a class of mistake to `/digest` → `learnings-capture`.

## Anti-rationalization
- "I'll review quality first, compliance later" → no. Axis 0 is first by design: quality review of the wrong feature is wasted work.
- "No doc, so skip review entirely" → skip only Axis 0. Axes 1–3 still apply to any code.
- "The author already looked it over" → the author's context is the bias. Review is fresh-eyes by definition.
