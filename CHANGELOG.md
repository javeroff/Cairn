# Changelog

All notable changes to Cairn are recorded here. Format follows
[Keep a Changelog](https://keepachangelog.com/); versions follow [SemVer](https://semver.org/).

## [0.2.0] — 2026-05-30

### Added
- **`subagent-driven-development` skill** — the orchestrator's dispatch playbook (fresh subagent per task, model tiering, green gate, status vocabulary, risk-tiered review), plus `implementer-prompt.md`: a dispatch contract with a skill routing table, anti-rationalization table, and a verifiable `SKILLS LOADED:` report-back. Makes per-task craft-skill assignment impossible to silently drop.
- **`/spec sync <id>`** — re-syncs a drifted feature doc to its code (rewrites changed sections; preserves `known_issues` / `depends_on`).
- **Doc drift detection in `/status`** — flags docs whose `source_files` changed since the doc's last sync commit (commit-range based, not a bare date).
- **`/digest` consolidation** — appends a dated `## Build Notes` section to the feature doc and archives the spent plan to `.cairn/plans/archive/`; learnings now carry a `SOURCE` attribution.
- **Subagent status vocabulary** in `/build` (`DONE` / `DONE_WITH_CONCERNS` / `BLOCKED` / `NEEDS_CONTEXT`) and risk-tiered per-task review (inline self-review for standard tasks; fresh-subagent review for novel/security/irreversible).
- **Reference-integrity validation** — `scripts/validate-skills.cjs` now also checks that every command's skill/persona reference resolves (errors on dead refs and on `skills/<name>/SKILL.md` file-path refs) and that README/CLAUDE local links + file mentions are live. `npm run validate` added.

### Changed
- **Commands are thin again.** Each command delegates to its full phase skill set instead of re-implementing skill methods inline; `/plan` defers vertical slicing to `planning-and-task-breakdown` (no more contradicting "layers" structure).
- **README rewritten** with a what / when / how command reference, a `.cairn/` artifact guide, and a typical-run walkthrough.

### Fixed
- `scripts/validate-skills.cjs` (was `.js`) now runs under the package's `"type": "module"` — the CommonJS validator had silently failed in CI since the npx-install change.
- Removed a dead `CRG-INTEGRATION.md` reference from the README (the graph mapping lives in `CLAUDE.md`).

### Removed
- `CAIRN-BUILD-SPEC.md` and `FORK-SETUP.md` — one-time bootstrap docs, superseded now that the project is built.

## [0.1.0]

### Added
- Initial Cairn fork of [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills): the `.cairn/` lifecycle (feature docs, plans, learnings, `.startup.md`), subagent-driven `/build`, two-stage `/review`, `/digest`, `/status`, the Branch Guard hook, and npx-based install.
