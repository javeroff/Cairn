---
description: Verify phase. Delegates to test-driven-development (and browser-testing-with-devtools for browser work). Run the full suite; for bugs, the Prove-It pattern.
argument-hint: [feature-id | area | "bug: <description>"]
---

# /test — Verify phase

Orchestration only. The Verify skills do the work.

## Delegate
- **Load and follow the `test-driven-development` skill** — full-suite verification, the test pyramid, test sizing, and for bug fixes its Prove-It pattern (write a failing test that reproduces the bug, then make it pass). The skill owns the method.
- **If the change runs in a browser: load and follow the `browser-testing-with-devtools` skill** for the live reproduce → inspect → verify loop. Skip for backend/CLI.

## Cairn wiring
If a feature doc covers the area, check its Verification section is satisfied and note gaps. Report pass/fail plus any missing coverage; feed a recurring class of gap to `/digest`.
