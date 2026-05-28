#!/usr/bin/env node
import { install } from "../src/install.js";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function version() {
  const pkg = JSON.parse(
    await fs.readFile(path.resolve(__dirname, "..", "package.json"), "utf8")
  );
  return pkg.version;
}

function parseFlags(argv) {
  const flags = { local: false, dir: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--install-local") flags.local = true;
    else if (argv[i] === "--dir") flags.dir = argv[++i];
  }
  return flags;
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const flags = parseFlags(rest);

  switch (cmd) {
    case "install":
    case "update":
      await install(flags);
      break;
    case "version":
    case "--version":
    case "-v":
      console.log(await version());
      break;
    default:
      console.log(`cairn v${await version()}

Usage:
  cairn install                 Install to ~/.claude/
  cairn install --install-local Install to ./.claude/ and inject ./CLAUDE.md
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
