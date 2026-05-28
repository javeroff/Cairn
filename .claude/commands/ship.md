---
description: End-of-milestone deploy checkpoint. The final gate before deploying — runs the Ship-phase skills as serial gates, then a parallel three-persona review, and emits one go/no-go verdict. Not a per-feature step.
argument-hint: [milestone or feature ids being shipped]
---

# /ship — Milestone Deploy Checkpoint

You are running Cairn's **ship** phase. This is the final checkpoint before a milestone deploys — not something run per feature. It composes the existing Ship-phase skills as ordered gates, then fans out three specialist personas in parallel, and synthesizes a single deploy decision.

## Inputs
- `$ARGUMENTS` — the milestone name or the feature ids being shipped. If empty, ship the current branch's completed features.

## Step 0 — Scope & branch
1. Confirm not on `main`/`master` (Branch Guard enforces this for writes). Shipping merges *into* main; you prepare from the feature/milestone branch.
2. Identify the features in scope: those with `status: complete` (or the ids passed in). List them.

## Step 1 — Serial gates (each must pass before the next)
Compose the existing Ship-phase skills **in order**. A failing gate stops the ship.

1. **`git-workflow-and-versioning`** — clean history, conventional commits, version bump appropriate to the change (semver), changelog updated. This skill applies on any code change — it always runs.
2. **`ci-cd-and-automation`** — the pipeline is green: tests, lint, typecheck, build all pass in CI, not just locally. If there's no CI, flag it and run the equivalents locally.
3. **`documentation-and-adrs`** — public-facing docs reflect the shipped features; any architecturally significant decision in this milestone has an ADR.
4. **`deprecation-and-migration`** — *only if* anything was deprecated or requires a migration. Confirm migration steps and dependent-feature flags (cross-check `depends_on` in the shipped docs).
5. **`shipping-and-launch`** — the launch checklist: rollback plan, feature flags for risky changes, monitoring/alerts in place, canary strategy if applicable.

## Step 2 — Parallel persona fan-out
With the gates green, dispatch the three specialist personas **concurrently** (fresh subagents) against the full milestone diff:
- **`code-reviewer`** — five-axis review across the milestone (not per-task; the integrated whole).
- **`security-auditor`** — vulnerability scan of the shipped surface (auth, input handling, secrets, dependencies).
- **`test-engineer`** — coverage and test-strategy adequacy for what's shipping.

Each returns findings by severity. This is the one endorsed multi-persona orchestration — they run in parallel and do not invoke each other.

## Step 3 — Synthesize the verdict
Merge the gate results and the three persona reports into a single decision:

```
🚢 SHIP CHECKPOINT — <milestone>
   Features: <ids>

   Gates:   git ✅ | ci ✅ | docs ✅ | migration n/a | launch ✅
   Reviews: code-reviewer <P1:0 P2:1> | security <P1:0> | test <coverage 84%>

   VERDICT: GO | NO-GO
   Blocking: <list any P1/critical findings or failed gates>
   Recommended before deploy: <non-blocking but advised>
```

`NO-GO` if any gate failed or any persona returned a P1/critical finding. Otherwise `GO`.

## Step 4 — On GO
Update shipped docs to `status: complete` (if not already) and `phase: ship`. Offer: merge to main / open PR / hold. After merge, suggest `/digest` on the shipped features to capture milestone learnings, and `/status` to refresh `.cairn/.startup.md`.

## Anti-rationalization
- "Tests pass locally, skip CI" → local ≠ CI. Environment drift is exactly what ship-time CI catches. Run the gate.
- "Security review for a small milestone is overkill" → the persona fan-out is cheap (parallel) and ship is the last gate before users. Run all three.
- "One P2 finding, ship anyway" → P2 is non-blocking; record it as recommended-before-deploy and proceed. But never wave through a P1 — that's what NO-GO is for.
- "Ship each feature as it finishes" → no. Ship is milestone-level. Per-feature completion is `/build` + `/digest`; `/ship` gates the integrated whole.
