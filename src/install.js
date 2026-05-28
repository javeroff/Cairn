import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, "..");

// Source layout in the fork (differs from the standalone reference):
//   commands live under .claude/commands/, skills/ agents/ hooks/ templates/ at the root.
const SRC = {
  commands: path.join(PKG_ROOT, ".claude", "commands"),
  skills: path.join(PKG_ROOT, "skills"),
  agents: path.join(PKG_ROOT, "agents"),
  templates: path.join(PKG_ROOT, "templates"),
  // Cairn's only hook. The fork's hooks/ also holds unrelated base hooks — copy just this one.
  branchGuard: path.join(PKG_ROOT, "hooks", "branch-guard.sh"),
};

// Marker used to keep CLAUDE.md injection idempotent.
const GUIDE_START = "<!-- CAIRN:GUIDANCE:START -->";
const GUIDE_END = "<!-- CAIRN:GUIDANCE:END -->";

const GUIDANCE_BLOCK = `${GUIDE_START}
## Cairn workflow

When the user describes a feature, fix, or implementation task, consider suggesting the Cairn workflow (never auto-invoke — always ask):

1. \`/spec <description>\` — write a feature doc to \`.cairn/docs/\` before code (opt-in; only when explicitly invoked)
2. \`/plan <feature-id>\` — break the doc into subagent-ownable tasks with a file-declaration gate
3. \`/build <feature-id>\` — dispatch a fresh subagent per task, green-gate loop, then two-stage review (spec compliance → code quality)
4. \`/review\` / \`/ship\` — close the lifecycle

If a \`.cairn/docs/\` directory exists, read \`.cairn/.startup.md\` for oriented context instead of scanning the whole codebase. Cairn is opt-in: never block direct implementation if the user hasn't invoked \`/spec\`.
${GUIDE_END}`;

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readVersion() {
  const pkg = JSON.parse(
    await fs.readFile(path.join(PKG_ROOT, "package.json"), "utf8")
  );
  return pkg.version;
}

async function copyDir(src, dest) {
  // Source may be absent (e.g. agents/ when we reuse the fork's personas). Skip cleanly.
  if (!(await pathExists(src))) return;
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(s, d);
    } else {
      await fs.copyFile(s, d);
    }
  }
}

async function copyFile(src, dest) {
  if (!(await pathExists(src))) return;
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

async function injectGuidance(claudeMdPath) {
  let existing = "";
  if (await pathExists(claudeMdPath)) {
    existing = await fs.readFile(claudeMdPath, "utf8");
  }
  // Strip any prior Cairn block, then append the current one. Idempotent.
  const startIdx = existing.indexOf(GUIDE_START);
  if (startIdx !== -1) {
    const endIdx = existing.indexOf(GUIDE_END);
    if (endIdx !== -1) {
      existing =
        existing.slice(0, startIdx).trimEnd() +
        existing.slice(endIdx + GUIDE_END.length);
    }
  }
  const next = `${existing.trimEnd()}\n\n${GUIDANCE_BLOCK}\n`;
  await fs.writeFile(claudeMdPath, next.trimStart(), "utf8");
}

async function registerHooks(settingsPath, hooksDir) {
  let settings = {};
  if (await pathExists(settingsPath)) {
    try {
      settings = JSON.parse(await fs.readFile(settingsPath, "utf8"));
    } catch {
      console.warn(
        "cairn: settings.json was not valid JSON — leaving it untouched and skipping hook registration."
      );
      return;
    }
  }
  settings.hooks ??= {};

  const branchGuard = {
    matcher: "Write|Edit|NotebookEdit",
    hooks: [
      {
        type: "command",
        command: `bash ${path.join(hooksDir, "branch-guard.sh")}`,
      },
    ],
  };
  // Cairn intentionally does not register a SessionStart hook.
  // Workflow context (.startup.md, learnings, meta-skill) loads at command entry instead.

  // De-dupe by command string so re-running install never stacks duplicates.
  const ensure = (eventKey, entry, signature) => {
    settings.hooks[eventKey] ??= [];
    const already = JSON.stringify(settings.hooks[eventKey]).includes(signature);
    if (!already) settings.hooks[eventKey].push(entry);
  };

  ensure("PreToolUse", branchGuard, "branch-guard.sh");
  // SessionStart deliberately not registered.

  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
}

export async function install({ local = false, dir = null } = {}) {
  const version = await readVersion();
  const home = os.homedir();

  // Resolve install targets.
  const claudeRoot = dir
    ? path.resolve(dir)
    : local
    ? path.resolve(process.cwd(), ".claude")
    : path.join(home, ".claude");

  const commandsDest = path.join(claudeRoot, "commands");
  const skillsDest = path.join(claudeRoot, "skills");
  const agentsDest = path.join(claudeRoot, "agents");
  const cairnDest = path.join(claudeRoot, "cairn"); // template files (lazy-loaded, not exposed as commands)
  const hooksDest = path.join(claudeRoot, "hooks", "cairn");

  console.log(`cairn v${version} — installing to ${claudeRoot}`);

  await copyDir(SRC.commands, commandsDest);
  await copyDir(SRC.skills, skillsDest);
  await copyDir(SRC.agents, agentsDest);
  await copyDir(SRC.templates, path.join(cairnDest, "templates"));
  await copyFile(SRC.branchGuard, path.join(hooksDest, "branch-guard.sh"));

  // chmod the shell hook so Claude Code can exec it.
  const guardPath = path.join(hooksDest, "branch-guard.sh");
  if (await pathExists(guardPath)) await fs.chmod(guardPath, 0o755);

  // settings.json lives at the claude root for the chosen scope.
  await registerHooks(path.join(claudeRoot, "settings.json"), hooksDest);

  // CLAUDE.md guidance: skip when installing to a custom dir.
  if (!dir) {
    const claudeMd = local
      ? path.resolve(process.cwd(), "CLAUDE.md")
      : path.join(home, ".claude", "CLAUDE.md");
    await injectGuidance(claudeMd);
  }

  console.log("cairn: install complete.");
  console.log("  commands ->", commandsDest);
  console.log("  skills   ->", skillsDest);
  console.log("  agents   ->", agentsDest);
  console.log("  templates->", path.join(cairnDest, "templates"));
  console.log("  hooks    ->", hooksDest);
}
