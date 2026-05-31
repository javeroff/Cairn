---
id: NN-feature-slug
title: Human Readable Title
depends_on: []          # feature-doc IDs this requires (never task docs)
source_files: []        # files this feature will create or modify
routes: []              # API routes, e.g. POST /api/v1/auth/login
models: []              # DB tables/collections touched
test_files: []          # test files for this feature
data_flow: greenfield   # path to flow analysis doc, or "greenfield"
tags: []                # 4-8 domain keywords surfaced in .startup.md for prompt-overlap detection
status: draft           # draft -> in_progress -> complete -> deprecated
phase: spec             # last completed phase: spec | plan | build | review | ship
last_synced: YYYY-MM-DD # drives drift detection
cairn_version: 0.2.0
known_issues: []
---

# NN - Title

## Purpose
What this feature does and why it exists. One paragraph.

## Architecture
How it fits the system. Key components and their relationships.

## Data Model
Tables/collections, fields, types, constraints.

## API / Interface
Endpoints, function signatures, or CLI surface. Exact shapes.

## Business Rules
The logic that must hold. Each rule is testable.

## Edge Cases
Known failure scenarios, boundary conditions, error paths.

## Dependencies
What must exist first. Maps to depends_on.

## Verification
How we prove this works for real (HTTP call / DB query / browser check),
not just unit tests passing.

## Known Issues
Discovered during build or audit. Empty at spec time.

## Build Notes
Filled by `/digest` at feature completion. Distilled residue from the plan/tasks —
gotchas, complexity tags that proved wrong, key build decisions — for whoever builds
something related next. Empty until digested.
