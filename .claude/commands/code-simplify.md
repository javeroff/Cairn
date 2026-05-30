---
description: Review phase, optional. Delegates to code-simplification. Run on a milestone before /ship.
argument-hint: [feature-id | path]
---

# /code-simplify — Simplification (optional)

Orchestration only.

## Delegate
**Load and follow the `code-simplification` skill** — Chesterton's Fence, the Rule of 500, reduce complexity while preserving exact behavior, run tests after each change and revert on failure. The skill owns the method.

## Cairn wiring
Run after `/review` passes, before `/ship`. Behavior must not change — the test suite is the proof. Keep changes separate from feature commits.
