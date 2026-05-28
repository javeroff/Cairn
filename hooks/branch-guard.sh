#!/usr/bin/env bash
# Cairn Branch Guard — PreToolUse hook.
# Blocks Write/Edit/NotebookEdit on main/master in any project that has a .cairn/ directory.
# Survives context compaction because it fires at the OS level on every tool call.
# No-op outside .cairn projects and on any non-main/master branch.

set -euo pipefail

# Only guard inside a Cairn project.
if [ ! -d ".cairn" ]; then
  exit 0
fi

# Resolve current branch; if not a git repo, do nothing.
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
if [ -z "$branch" ]; then
  exit 0
fi

if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  cat >&2 <<'EOF'
⛔  CAIRN BRANCH GUARD

    File modification is blocked on this branch.
    Cairn never writes files directly on main or master.

    Create a feature branch, then re-run your command:

      git checkout -b feat/<feature-name>
EOF
  # Exit code 2 signals Claude Code to block the tool call.
  exit 2
fi

exit 0
