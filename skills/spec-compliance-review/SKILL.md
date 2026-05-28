---
name: spec-compliance-review
description: Verify an implementation matches its feature doc — every business rule and edge case implemented, no scope drift. The first of Cairn's two review stages, run before code-quality review. Use when reviewing a diff against a .cairn/docs/ feature doc. Judges whether the RIGHT thing was built, not how well it was written.
---

# Spec-Compliance Review

## Overview
Given a feature doc and the diff that claims to implement it, this review answers one question: **does the code do what the doc says, no more and no less?** It is distinct from `code-review-and-quality` / the `code-reviewer` persona, which judge *how* the code is written. This judges *whether the right thing was built*. Both run; this one first — there is no point polishing code that implements the wrong spec.

Run it as a **fresh subagent**, never the agent that wrote the code. The implementer's context is exactly the bias that hides missing requirements.

## When to Use
- In `/build`, after a task's green gate passes, before the code-quality stage.
- Any time a diff is offered as "done" against a `.cairn/docs/NN.md` doc.
- Before `/ship`, as a milestone-level check that shipped features match their docs.

## Core Process
1. **Load both sides.** Read the feature doc fully (Business Rules, Edge Cases, API/Interface, Data Model) and the diff. Do not read the wider codebase — the doc and diff are the scope.
2. **Build a requirement checklist from the doc.** Every Business Rule is a line item. Every Edge Case is a line item. Every documented route/signature/model field is a line item.
3. **Check each item against the diff**, marking:
   - ✅ implemented (point to the file:line that satisfies it)
   - ❌ missing (documented but absent in the diff)
   - ⚠️ partial (started but incomplete, or handles the happy path but not the documented edge case)
4. **Scan for scope drift** — code in the diff that no doc section asked for. Two kinds: harmless (a helper) vs. meaningful (a new endpoint, a behavior change, a dependency). Flag meaningful drift; the doc is the contract, and undocumented behavior is unreviewed behavior.
5. **Check the doc-vs-reality direction too.** If the implementation revealed the doc is wrong (a business rule that can't hold, an edge case that doesn't exist), say so — the doc may need updating, not the code. Surface it; don't silently conform code to a wrong doc or vice versa.

## Output format
```
SPEC-COMPLIANCE REVIEW — <feature-id>

Requirements: N total
  ✅ implemented: a
  ❌ missing: b        ← BLOCKING if b > 0
  ⚠️ partial: c        ← BLOCKING if c > 0

Missing:
  - <business rule / edge case> (doc §<section>) — not found in diff
Partial:
  - <item> — happy path only; documented edge case <X> unhandled
Scope drift:
  - <file:line> adds <behavior> not in the doc — confirm intended or remove
Doc correctness:
  - <doc rule> appears wrong because <reason> — recommend doc update

VERDICT: PASS | BLOCKED (b missing, c partial)
```

## Common Rationalizations
- "The code is clean and obviously works, it complies" → clean ≠ compliant. A beautifully written function that skips a documented edge case fails this review. Check the checklist, not the vibe.
- "This extra code is a nice improvement, I'll let the drift slide" → undocumented behavior is unreviewed behavior. Flag it; let the orchestrator decide to keep it (and update the doc) or cut it.
- "A rule is missing but it's minor" → minor-but-documented is still missing. Mark it ❌. The author of the doc decided it mattered.

## Red Flags
- Review passes with prose praise but no per-requirement checklist — you skipped Core Process step 2.
- Scope drift never flagged across many reviews — you're not checking the reverse direction.
- The same reviewer subagent also wrote the code — invalid; must be fresh.

## Verification
- [ ] Every Business Rule and Edge Case in the doc is a checklist line with a ✅/❌/⚠️ and (for ✅) a file:line.
- [ ] Scope drift checked both directions (code beyond doc; doc beyond code).
- [ ] Verdict is BLOCKED if any requirement is missing or partial.
