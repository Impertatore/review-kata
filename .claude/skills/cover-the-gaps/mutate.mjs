#!/usr/bin/env node
// Mutation runner for /cover-the-gaps.
//
//   node .claude/skills/cover-the-gaps/mutate.mjs <spec.json>
//
// Applies one plausible break to the source at a time, runs the FULL test
// suite, records which tests noticed, and puts the source back. Reports:
//
//   * survivors        — a break no test caught. A gap in the suite.
//   * unkillable tests — a test no break made fail. It cannot fail.
//   * sole guards      — a break exactly one test caught. Don't delete it.
//
// Spec format (see SKILL.md):
//
//   {
//     "src": "src/orders.js",
//     "testCommand": "node --test",
//     "mutants": [
//       { "id": "M1", "desc": "drop the last item",
//         "target": "  for (let i = 0; i < items.length; i++) {",
//         "mode": "replace",
//         "code": "  for (let i = 0; i < items.length - 1; i++) {" }
//     ]
//   }
//
// `target` is exact source text, indentation included, and must occur exactly
// once. `mode` is "replace" | "above" | "below"; above/below insert `code` as
// a new line, reusing the target line's indentation.
//
// Exits 1 if there is any survivor or any unkillable test, else 0.

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const specPath = process.argv[2];
if (!specPath) {
  console.error("usage: node mutate.mjs <spec.json>");
  process.exit(2);
}

const spec = JSON.parse(readFileSync(specPath, "utf8"));
const SRC = spec.src;
const CMD = spec.testCommand ?? "node --test";
// Defaults match `node --test` output. Override for other runners.
const FAIL_RE = spec.failRegex ?? "^\\u2716 (.+?) \\(\\d";
const PASS_RE = spec.passRegex ?? "^\\u2714 (.+?) \\(\\d";

if (!Array.isArray(spec.mutants) || spec.mutants.length === 0) {
  console.error("spec has no mutants — nothing to prove");
  process.exit(2);
}

const original = readFileSync(SRC, "utf8");
const EOL = original.includes("\r\n") ? "\r\n" : "\n";

const runSuite = () => {
  try {
    return execSync(CMD, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    return (e.stdout ?? "") + (e.stderr ?? "");
  }
};

// Test-file rows look like test names in `node --test` output; drop them.
const isFile = (n) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(n);
const names = (out, pattern) => [
  ...new Set([...out.matchAll(new RegExp(pattern, "gm"))].map((m) => m[1])),
].filter((n) => !isFile(n));

const occurrences = (hay, needle) => {
  let n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
  return n;
};

function mutate(src, m) {
  const hits = occurrences(src, m.target);
  if (hits !== 1) {
    throw new Error(`${m.id}: target occurs ${hits} times in ${SRC}, need exactly 1`);
  }
  const at = src.indexOf(m.target);
  const lineStart = src.lastIndexOf("\n", at) + 1;
  const prefix = src.slice(lineStart, at);
  const indent = /^\s*$/.test(prefix) ? prefix : "";
  const mode = m.mode ?? "replace";
  if (mode === "replace") return src.replace(m.target, m.code);
  if (mode === "above") return src.replace(m.target, m.code + EOL + indent + m.target);
  if (mode === "below") return src.replace(m.target, m.target + EOL + indent + m.code);
  throw new Error(`${m.id}: unknown mode "${mode}"`);
}

// --- baseline: mutation results are meaningless against a red suite --------

console.log(`baseline: running ${CMD}`);
const baseOut = runSuite();
const baseFail = names(baseOut, FAIL_RE);
const allTests = [...names(baseOut, PASS_RE), ...baseFail];

if (baseFail.length > 0) {
  console.error(`\nsuite is already red (${baseFail.length} failing) — fix that first:`);
  baseFail.forEach((t) => console.error("    " + t));
  process.exit(2);
}
if (allTests.length === 0) {
  console.error(
    "\nparsed 0 test names from the output. The pass/fail regex does not match " +
      "this runner — set failRegex/passRegex in the spec. Do NOT read the run " +
      "below as evidence of anything."
  );
  process.exit(2);
}
console.log(`baseline green, ${allTests.length} tests parsed\n`);

// --- one mutant at a time -------------------------------------------------

const killedBy = new Map(allTests.map((t) => [t, []]));
const survivors = [];
const errors = [];

try {
  for (const m of spec.mutants) {
    let patched;
    try {
      patched = mutate(original, m);
    } catch (e) {
      errors.push(e.message);
      console.log(`${m.id}  ERROR  ${e.message}`);
      continue;
    }
    writeFileSync(SRC, patched);
    const failed = names(runSuite(), FAIL_RE);
    for (const t of failed) {
      if (killedBy.has(t)) killedBy.get(t).push(m.id);
      else killedBy.set(t, [m.id]); // a test that only exists when mutated
    }
    const label = `${m.id}  ${m.desc ?? ""}`.trim();
    if (failed.length === 0) {
      survivors.push(m);
      console.log(`${label}\n    SURVIVED — no test caught this`);
    } else {
      console.log(`${label}\n    ${failed.length} red` +
        (failed.length === 1 ? `, sole guard: "${failed[0]}"` : ""));
    }
  }
} finally {
  writeFileSync(SRC, original);
  const restored = readFileSync(SRC, "utf8") === original;
  console.log(`\n${SRC} restored byte-identical: ${restored}`);
  if (!restored) console.error("!! SOURCE NOT RESTORED — check git diff before doing anything else");
}

// --- report ---------------------------------------------------------------

const neverFailed = [...killedBy].filter(([, ids]) => ids.length === 0).map(([t]) => t);

// A test that never failed is only TAUTOLOGICAL if this set actually aimed a
// break at the behaviour it claims to cover. Otherwise the break simply never
// reached it, and saying "cannot fail" would be a false accusation. The spec
// asserts completeness explicitly; absent that, the verdict is inconclusive.
const complete = spec.complete === true;

console.log("\n=== test -> breaks that make it fail ===");
for (const [t, ids] of [...killedBy].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log((ids.length ? ids.join(",") : "*** NOTHING ***").padEnd(24) + "  " + t);
}

if (survivors.length) {
  console.log("\n=== survivors: breaks nothing caught (gaps in the suite) ===");
  survivors.forEach((m) => console.log(`  ${m.id}  ${m.desc ?? ""}`));
}
if (neverFailed.length) {
  console.log(
    complete
      ? "\n=== CANNOT FAIL: no break in a set declared complete made these fail ==="
      : "\n=== not reached by this set — INCONCLUSIVE, not proven tautological ==="
  );
  neverFailed.forEach((t) => console.log("  " + t));
}
if (errors.length) {
  console.log("\n=== spec errors (these mutants never ran) ===");
  errors.forEach((e) => console.log("  " + e));
}

console.log(
  `\n${spec.mutants.length - errors.length} mutants run, ` +
    `${survivors.length} survived, ${neverFailed.length} tests never failed.`
);
if (!complete) {
  console.log(
    "Set is not declared complete, so the never-failed list is inconclusive: aim a\n" +
      "break at each of those behaviours, then re-run with \"complete\": true before\n" +
      "calling any test tautological."
  );
}

process.exit(survivors.length || errors.length || (complete && neverFailed.length) ? 1 : 0);
