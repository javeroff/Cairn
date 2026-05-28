#!/usr/bin/env node
import { install } from "../src/install.js";
import { promises as fs } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function version() {
  const pkg = JSON.parse(
    await fs.readFile(path.resolve(__dirname, "..", "package.json"), "utf8")
  );
  return pkg.version;
}

function parseFlags(argv) {
  // scopeExplicit: true when the user passed any scope-selecting flag, so we never prompt.
  const flags = { local: false, global: false, dir: null, scopeExplicit: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--install-local") {
      flags.local = true;
      flags.scopeExplicit = true;
    } else if (argv[i] === "--global") {
      flags.global = true;
      flags.scopeExplicit = true;
    } else if (argv[i] === "--dir") {
      flags.dir = argv[++i];
      flags.scopeExplicit = true;
    }
  }
  return flags;
}

// Built-in readline only — keeps `npx` a zero-dependency install.
function promptScope() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(
      "Install Cairn globally (~/.claude, all projects) or locally (./.claude, this project only)? [G/l] ",
      (answer) => {
        rl.close();
        const a = answer.trim().toLowerCase();
        resolve(a === "l" || a === "local" ? "local" : "global");
      }
    );
  });
}

// Resolve the install scope into install() options.
// Precedence: explicit flag > interactive prompt > non-interactive global fallback.
async function resolveScope(flags) {
  if (flags.dir) return { dir: flags.dir };
  if (flags.local) return { local: true };
  if (flags.global) return { local: false };

  if (process.stdin.isTTY) {
    const choice = await promptScope();
    return choice === "local" ? { local: true } : { local: false };
  }

  console.log(
    "cairn: no interactive terminal detected — defaulting to global install (~/.claude). " +
      "Re-run with --global or --install-local to choose explicitly."
  );
  return { local: false };
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const flags = parseFlags(rest);

  switch (cmd) {
    case "install":
    case "update": {
      const opts = await resolveScope(flags);
      await install(opts);
      break;
    }
    case "version":
    case "--version":
    case "-v":
      console.log(await version());
      break;
    default:
      console.log(`cairn v${await version()}

Usage:
  cairn install                 Choose scope interactively (global vs local);
                                falls back to global when there's no terminal
  cairn install --global        Install to ~/.claude/ (all projects)
  cairn install --install-local Install to ./.claude/ + ./CLAUDE.md (this project; scopes Branch Guard)
  cairn install --dir <path>    Install to a custom directory (skips CLAUDE.md)
  cairn update                  Re-run install (idempotent; refreshes files)
  cairn version                 Print version

After install, open Claude Code and run /spec to begin.`);
  }
}

main().catch((err) => {
  console.error("cairn error:", err.message);
  process.exit(1);
});
