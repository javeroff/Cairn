---
name: learnings-capture
description: Capture durable engineering rules from failures, user corrections, and discoveries into .cairn/learnings.md. Use when a green gate fails repeatedly, the user corrects an approach, an external tool/API behaves unexpectedly, or a better approach is found for a recurring task. Also load relevant learnings before starting a spec or build.
---

# Learnings Capture

## Overview
Turns one-off pain into durable rules. Mid-flight it records corrections and root causes; at completion (`/digest`) it consolidates them. The point is forward transfer: the next `/spec` and `/build` start already knowing what bit you last time.

This is the GSD/lessons pillar of Cairn. It is **not** `.startup.md` (current project state) — learnings are durable, cross-feature rules.

## When to Use
Append a learning when any of these happen, in any phase:
- A green gate failed 3+ times and `debugging-and-error-recovery` found a non-obvious root cause.
- The user corrects Claude ("no, that's wrong", "actually use X not Y").
- An external API/tool/library behaved differently than assumed.
- A spec-compliance or code-quality review caught a class of mistake, not a one-off typo.
- A better approach was discovered for something you'll do again.

Load learnings (read-only) at the start of `/spec` and `/build`, filtered by the feature's `tags`.

## Core Process
1. **Locate the file.** `.cairn/learnings.md`. Create from this structure if absent:
   ```
   # Cairn Learnings

   ## Durable Rules (promoted)

   ## Recent Learnings
   ```
2. **Write one entry** under Recent Learnings:
   ```
   ### <date> — <feature-id or "ad-hoc">
   - WHAT HAPPENED: <one line>
   - ROOT CAUSE: <the actual cause, not the symptom>
   - DURABLE RULE: <the rule a future task should follow>
   - TAGS: [<domain keywords for retrieval>]
   ```
3. **Dedupe + promote.** If a Recent Learning's DURABLE RULE matches an existing one, increment a `(seen Nx)` counter instead of duplicating. When a rule reaches **3x**, move it to **Durable Rules (promoted)** and flag it as a candidate for a project `CLAUDE.md` rule or a new skill.
4. **Keep it terse.** A learning is a rule, not a story. One root cause, one rule. If you can't state the rule in a sentence, you haven't found the root cause yet.

## Examples
```
### 2026-05-28 — 03-payment-flow
- WHAT HAPPENED: green gate failed 5x on webhook signature verification
- ROOT CAUSE: Stripe webhook secret is distinct from the API secret key; tests used the wrong env var
- DURABLE RULE: webhook tests must use STRIPE_WEBHOOK_SECRET, never STRIPE_SECRET_KEY
- TAGS: [stripe, webhooks, env]
```
Promoted after recurrence:
```
## Durable Rules (promoted)
- [esm] Use `jose`, not `jsonwebtoken`, in ESM projects — CJS interop breaks. (seen 3x) → candidate CLAUDE.md rule
```

## Common Rationalizations
- "I'll remember this next time" → you won't; the next session is a fresh context. Write it.
- "This is too specific to be worth recording" → specific root causes are exactly what transfers. Vague learnings ("be careful with auth") are the useless ones.
- "I'll just add it to CLAUDE.md directly" → not until it recurs. Unproven rules bloat CLAUDE.md. Let the 3x promotion gate decide.

## Red Flags
- learnings.md full of symptoms ("test failed") instead of root causes ("wrong env var because X").
- Duplicate rules with no seen-counter — dedupe is being skipped.
- Learnings never read back at `/spec`/`/build` entry — capture without feedback is a diary, not a mechanism.

## Verification
- [ ] Every entry has a ROOT CAUSE and a one-sentence DURABLE RULE.
- [ ] Recurring rules carry a seen-counter; 3x rules are promoted.
- [ ] `/spec` and `/build` read tag-matched learnings before work begins.
