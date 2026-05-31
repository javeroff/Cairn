#!/usr/bin/env node
/**
 * validate-skills.js
 *
 * Validates every skill in skills/ against the rules in docs/skill-anatomy.md.
 *
 * Checks (errors block CI):
 *   - SKILL.md exists in every skill directory
 *   - YAML frontmatter present with 'name' and 'description' fields
 *   - frontmatter 'name' matches the directory name
 *   - description does not exceed 1024 characters
 *   - required sections are present
 *
 * Checks (warnings, do not block CI):
 *   - cross-skill references point to known skills
 *
 * Exit codes: 0 = all clear, 1 = one or more errors
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const SKILLS_DIR = path.resolve(__dirname, '..', 'skills');

const MAX_DESCRIPTION_LENGTH = 1024;

// Sections every standard SKILL.md must contain.
// Each entry is an array of acceptable heading strings — the first
// match wins, so you can list canonical + legacy aliases.
const REQUIRED_SECTIONS = [
  ['## Overview'],
  ['## When to Use'],
  ['## Common Rationalizations'],
  ['## Red Flags'],
  ['## Verification'],
];

// Skills that are intentionally exempt from section checks.
// Exemptions live HERE, not in skill frontmatter, so contributors
// cannot bypass the validator by editing their own skill file.
// Every entry must have a documented reason.
const SECTION_EXEMPT_SKILLS = {
  'using-agent-skills': 'Meta-skill — orchestrates other skills; When-to-Use and Verification are not applicable to a routing document.',
  'idea-refine':        'Legacy structure predating skill-anatomy.md — uses How-It-Works/Usage/Anti-patterns instead of standard headings. Tracked for conformance in https://github.com/addyosmani/agent-skills/issues',
};

// Regex patterns that indicate an explicit cross-skill reference.
// Only these patterns trigger the dead-reference warning — generic
// backtick strings in code blocks are intentionally excluded.
const SKILL_REF_PATTERNS = [
  /\buse the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\bfollow the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\binvoke the `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /\bcontinue with `([a-z][a-z0-9-]+[a-z0-9])`/g,
  /\buse `([a-z][a-z0-9-]+[a-z0-9])` skill/g,
  /`([a-z][a-z0-9-]+[a-z0-9])` skill\b/g,
  /`([a-z][a-z0-9-]+[a-z0-9])` persona\b/g,
  /\bsee `([a-z][a-z0-9-]+[a-z0-9])`/g,
  /──→ ([a-z][a-z0-9-]+[a-z0-9])\b/g,          // ASCII diagram arrows
  /→ `([a-z][a-z0-9-]+[a-z0-9])`/g,
];

// ─── Reference-integrity config (commands + docs) ──────────────────────────────

const ROOT         = path.resolve(__dirname, '..');
const COMMANDS_DIR = path.join(ROOT, '.claude', 'commands');
const AGENTS_DIR   = path.join(ROOT, 'agents');

// Optional skills Cairn intentionally references but does not ship (code-review-graph).
// Keep tight and documented — these are allowed dangling refs in commands.
const EXTERNAL_SKILLS = new Set([
  'explore-codebase',  // CRG: brownfield orientation at /spec
  'review-changes',    // CRG
  'debug-issue',       // CRG
]);

// Runtime artifacts Cairn writes into *target* projects — never present in this repo,
// so a backticked mention of them is not a dead reference.
const VIRTUAL_ARTIFACTS = new Set(['learnings.md', '.startup.md']);

// Human-facing docs whose local links + file mentions should resolve.
const DOC_FILES = [
  path.join(ROOT, 'README.md'),
  path.join(ROOT, 'CLAUDE.md'),
  ...(fs.existsSync(path.join(ROOT, 'docs'))
    ? fs.readdirSync(path.join(ROOT, 'docs')).filter(f => f.endsWith('.md')).map(f => path.join(ROOT, 'docs', f))
    : []),
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse YAML-style frontmatter from the top of a markdown file.
 * Returns a key→value object, or null if no frontmatter block found.
 * Values are stripped of surrounding quotes.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n/);
  if (!match) return null;

  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key   = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key) result[key] = value;
  }
  return result;
}

/**
 * Collect all explicit skill cross-references from content.
 * Only matches against the SKILL_REF_PATTERNS list to avoid
 * false-positives from inline code snippets.
 */
function extractSkillReferences(content) {
  const refs = new Set();
  for (const pattern of SKILL_REF_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(content)) !== null) {
      refs.add(m[1]);
    }
  }
  return refs;
}

/** Persona names from agents/ (filenames minus .md, excluding README). */
function listPersonas() {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  return fs.readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
    .map(f => f.replace(/\.md$/, ''));
}

/** Every file basename in the repo (excluding .git / node_modules), for dead-reference checks. */
function repoFileBasenames() {
  const names = new Set();
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else names.add(e.name);
    }
  })(ROOT);
  return names;
}

/**
 * Commands must reference skills by BARE NAME (they install to ~/.claude/skills/,
 * so a `skills/<name>/SKILL.md` path won't resolve), and every referenced skill /
 * persona must actually exist. Both are errors — a command pointing at a missing
 * skill is broken, not cosmetic.
 */
function validateCommandRefs(knownRefs) {
  const out = [];
  if (!fs.existsSync(COMMANDS_DIR)) return out;
  for (const file of fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.md')).sort()) {
    const errors  = [];
    const content = fs.readFileSync(path.join(COMMANDS_DIR, file), 'utf8');

    for (const p of new Set(content.match(/skills\/[a-z0-9-]+\/SKILL\.md/g) || [])) {
      errors.push(`File-path skill reference \`${p}\` — reference skills by bare name (the path won't resolve once installed to ~/.claude/skills/)`);
    }
    for (const ref of extractSkillReferences(content)) {
      if (!knownRefs.has(ref)) {
        errors.push(`References \`${ref}\` as a skill/persona, but no such skill or persona exists`);
      }
    }
    out.push({ file: `.claude/commands/${file}`, errors });
  }
  return out;
}

/**
 * Human-facing docs: local markdown links must resolve (error), and backticked
 * file mentions (`foo.md`, `scripts/bar.js`) must exist in the repo (warning) —
 * catches dead references like a `CRG-INTEGRATION.md` that was never created.
 * Placeholders (NN, <…>), runtime paths (.cairn/, ~/, ./) and known virtual
 * artifacts are excluded.
 */
function validateDocRefs(repoNames) {
  const out = [];
  const linkRe      = /\[[^\]]*\]\(([^)]+)\)/g;
  const fileTokenRe = /`([^`]+\.(?:md|js|sh|json))`/g;

  for (const file of DOC_FILES) {
    if (!fs.existsSync(file)) continue;
    const content  = fs.readFileSync(file, 'utf8');
    const errors   = [];
    const warnings = [];

    let m;
    linkRe.lastIndex = 0;
    while ((m = linkRe.exec(content)) !== null) {
      const target = m[1].split(/[#?]/)[0].trim();
      if (!target || /^(https?:|mailto:)/.test(target)) continue;
      if (!fs.existsSync(path.resolve(path.dirname(file), target))) {
        errors.push(`Broken local link: \`${target}\``);
      }
    }

    // Backticked file mentions are checked only in the core project docs
    // (README / CLAUDE). The docs/ setup guides legitimately name files in the
    // *user's* repo (GEMINI.md, .github/…, rule files) that aren't ours.
    const coreDoc = ['README.md', 'CLAUDE.md'].includes(path.basename(file));
    fileTokenRe.lastIndex = 0;
    while (coreDoc && (m = fileTokenRe.exec(content)) !== null) {
      const tok = m[1];
      if (/NN|<|>|\*/.test(tok)) continue;                      // placeholders
      if (/^(\.cairn\/|~\/|\.\/|\.\.\/)/.test(tok)) continue;    // runtime / relative-runtime
      const base = tok.split('/').pop();
      if (VIRTUAL_ARTIFACTS.has(base)) continue;
      if (!repoNames.has(base)) {
        warnings.push(`Backticked file \`${tok}\` not found in repo — dead reference?`);
      }
    }

    out.push({ file: path.relative(ROOT, file), errors, warnings });
  }
  return out;
}

// ─── Validator ───────────────────────────────────────────────────────────────

function validateSkill(dirName, knownSkills) {
  const errors   = [];
  const warnings = [];
  let   exempt   = false;
  const skillPath = path.join(SKILLS_DIR, dirName, 'SKILL.md');

  if (!fs.existsSync(skillPath)) {
    errors.push('Missing SKILL.md');
    return { errors, warnings, exempt };
  }

  const content = fs.readFileSync(skillPath, 'utf8');

  // ── Frontmatter ──────────────────────────────────────────────────────────
  const fm = parseFrontmatter(content);
  if (!fm) {
    errors.push('Missing or malformed YAML frontmatter (expected --- block at top of file)');
    return { errors, warnings, exempt };
  }

  if (!fm.name) {
    errors.push("Frontmatter missing required field: 'name'");
  } else if (fm.name !== dirName) {
    errors.push(`Frontmatter name '${fm.name}' does not match directory name '${dirName}'`);
  }

  if (!fm.description) {
    errors.push("Frontmatter missing required field: 'description'");
  } else if (fm.description.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(
      `Description is ${fm.description.length} chars — exceeds the ${MAX_DESCRIPTION_LENGTH}-char limit` +
      ` (agents inject this into the system prompt)`
    );
  }

  // ── Exemption guard ──────────────────────────────────────────────────────
  // Exemptions are validator-owned (SECTION_EXEMPT_SKILLS above).
  // If a skill's frontmatter tries to declare its own exemption, fail loud —
  // that's a sign someone is trying to bypass the validator.
  if (fm.type === 'meta' || fm.exempt === 'sections') {
    if (!SECTION_EXEMPT_SKILLS[dirName]) {
      errors.push(
        `Frontmatter declares 'type: meta' or 'exempt: sections' but '${dirName}' is not in ` +
        `the validator's SECTION_EXEMPT_SKILLS allowlist. ` +
        `Add an entry to scripts/validate-skills.js with a documented reason.`
      );
    }
  }

  // ── Required sections ────────────────────────────────────────────────────
  exempt = dirName in SECTION_EXEMPT_SKILLS;

  if (!exempt) {
    for (const aliases of REQUIRED_SECTIONS) {
      const found = aliases.some(heading => content.includes(heading));
      if (!found) {
        errors.push(`Missing required section: ${aliases[0]}`);
      }
    }
  }

  // ── Cross-skill references ───────────────────────────────────────────────
  const refs = extractSkillReferences(content);
  for (const ref of refs) {
    if (!knownSkills.has(ref)) {
      warnings.push(`Dead cross-reference: \`${ref}\` is not a known skill`);
    }
  }

  return { errors, warnings, exempt };
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`ERROR: skills directory not found at ${SKILLS_DIR}`);
    process.exit(1);
  }

  const skillDirs = fs.readdirSync(SKILLS_DIR)
    .filter(d => fs.statSync(path.join(SKILLS_DIR, d)).isDirectory())
    .sort();

  // Recognized references = local skills + personas (agents/) + allowlisted
  // external skills (CRG). Shared by the skill cross-ref check and the command check.
  const recognized = new Set([...skillDirs, ...listPersonas(), ...EXTERNAL_SKILLS]);

  let totalErrors   = 0;
  let totalWarnings = 0;

  for (const dirName of skillDirs) {
    const { errors, warnings, exempt } = validateSkill(dirName, recognized);
    totalErrors   += errors.length;
    totalWarnings += warnings.length;

    if (errors.length === 0 && warnings.length === 0) {
      const tag = exempt ? ' (section checks exempt)' : '';
      console.log(`  ✓  ${dirName}${tag}`);
    } else {
      const icon = errors.length > 0 ? '  ✗ ' : '  ⚠ ';
      console.log(`${icon} ${dirName}`);
      for (const msg of errors)   console.log(`       ERROR: ${msg}`);
      for (const msg of warnings) console.log(`       WARN:  ${msg}`);
    }
  }

  // ── Reference integrity: commands + human-facing docs ─────────────────────
  const repoNames  = repoFileBasenames();
  const cmdResults = validateCommandRefs(recognized);
  const docResults = validateDocRefs(repoNames);

  console.log('\nReference integrity (commands + docs):');
  for (const { file, errors } of cmdResults) {
    totalErrors += errors.length;
    if (errors.length === 0) {
      console.log(`  ✓  ${file}`);
    } else {
      console.log(`  ✗  ${file}`);
      for (const msg of errors) console.log(`       ERROR: ${msg}`);
    }
  }
  for (const { file, errors, warnings } of docResults) {
    totalErrors   += errors.length;
    totalWarnings += warnings.length;
    if (errors.length === 0 && warnings.length === 0) {
      console.log(`  ✓  ${file}`);
    } else {
      console.log(`  ${errors.length > 0 ? '✗ ' : '⚠ '} ${file}`);
      for (const msg of errors)   console.log(`       ERROR: ${msg}`);
      for (const msg of warnings) console.log(`       WARN:  ${msg}`);
    }
  }

  const status = totalErrors > 0 ? 'FAILED' : totalWarnings > 0 ? 'PASSED WITH WARNINGS' : 'PASSED';
  console.log(`\n${skillDirs.length} skills + ${cmdResults.length} commands + ${docResults.length} docs checked — ${totalErrors} error(s), ${totalWarnings} warning(s) — ${status}`);

  if (totalErrors > 0) process.exit(1);
}

main();
