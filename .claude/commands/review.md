---
description: Review phase. Delegates to spec-compliance-review then the Review skills (code-review-and-quality, security-and-hardening, performance-optimization), each as a fresh-eyes pass. Runs on any change.
argument-hint: [feature-id | git ref | "staged"]
---

# /review — Review phase

Orchestration only. Each axis loads and follows its skill; the command sequences them and never lets the author review their own work. (Simplification is its own command, `/code-simplify` — not folded in.)

## Wire-up
- `$ARGUMENTS` = feature id (diff vs its `.cairn/docs` doc), git ref/range, or `staged`. Empty → current branch vs base.
- If the graph is present: `detect_changes_tool` + `get_review_context_tool` to scope to the real blast radius. Don't also invoke CRG's `review-changes` — `/review` is the front door.

## Delegate (in order, fresh subagents)
- **Axis 0 — only if a feature doc exists: load and follow the `spec-compliance-review` skill.** Did it build the right thing? Runs first; BLOCKED on any missing/partial requirement. No doc → skip and note it.
- **Axis 1: load and follow the `code-review-and-quality` skill** (use the `code-reviewer` persona where it helps).
- **Axis 2: load and follow the `security-and-hardening` skill**.
- **Axis 3: load and follow the `performance-optimization` skill**.

Each skill carries its own checklist and severity labels — the command does not restate them.

## Output
Per-axis pass/findings by severity. Spec-compliance misses and any P1 are blocking; P2/P3 advisory. Feed a finding that revealed a class of mistake to `/digest`.
