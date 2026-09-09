---
name: cover-the-gaps
description: Audit a file of existing tests — enumerate the behaviours, say which are pinned by a test and which are not, then break the implementation to prove each test can actually fail. Use when the user asks "are these tests good enough", "what isn't covered", "cover the gaps", "verify these tests", "can this test fail", or after /write-tests.
---

# Cover the gaps

Point this at a file of existing tests. It answers two questions, both with
evidence rather than opinion: **which behaviours no test pins down**, and
**which tests cannot fail**. It does not write tests and does not fix them —
it reports, then hands back to `/write-tests`.

A passing suite is not evidence. The only proof that a test asserts something
is that it fails when the code is wrong.

## Step 1 — Enumerate from the code, never from the test names

Run `/enumerate-behaviours` against the **implementation**. Do not open the
test file until that list exists.

Reading the tests first is the single most common way this audit fails: you
inherit the suite's blind spots, because the gap you are hunting is by
definition not named in them. Derive the list from the code, then go looking.

## Step 2 — Map behaviour to test

One row per behaviour from Step 1:

| behaviour | covered by |
|---|---|
| ... | `test name` — or **not covered** |

A test counts as covering a behaviour only if **its assertion would change
when the behaviour changes**. Read the assertions, not the names. A test named
after a behaviour but asserting something weaker is **not covered** — say so,
and name the test that misled you.

## Step 3 — Break the implementation, one change at a time

Before you start:

- **Working tree must be clean.** Commit or stash first. If it is dirty you
  cannot tell your restore from the user's own edits.
- **Suite must be green.** Results measured against a red suite mean nothing.

Rules for the breaks themselves:

- **One change at a time**, never two.
- **Plausible edits only** — the mistakes people actually make: flip a
  comparison, off-by-one a loop bound, drop a call, return early, swap an
  operator, add a defensive default that swallows an error. Not random
  corruption; a break nobody would ever write teaches nothing.
- **Run the whole suite** for each break, not just the target file. Another
  file often exercises the same code.
- **Restore the source in a `finally`** and verify it is byte-identical.

Use the runner rather than editing by hand:

```bash
node .claude/skills/cover-the-gaps/mutate.mjs <spec.json>
```

Spec, with paths relative to the directory you run from:

```json
{
  "src": "src/orders.js",
  "testCommand": "node --test",
  "complete": false,
  "mutants": [
    { "id": "M1", "desc": "drop the last item",
      "target": "  for (let i = 0; i < items.length; i++) {",
      "mode": "replace",
      "code": "  for (let i = 0; i < items.length - 1; i++) {" },
    { "id": "M2", "desc": "reach for module state",
      "target": "  return toMoney(total);",
      "mode": "above",
      "code": "  nextId++;" }
  ]
}
```

| field | meaning |
|---|---|
| `target` | exact source text, **indentation included**; must occur exactly once, or the mutant is refused |
| `mode` | `replace`, or `above`/`below` to insert `code` as a new line reusing the target's indent |
| `complete` | `true` only once the set aims at least one break at **every** behaviour from Step 1 — it is what licenses a "cannot fail" verdict |
| `failRegex`/`passRegex` | override for runners other than `node --test` |

Exit code is 0 when every break was caught, 1 on a survivor or a spec error,
2 when the run itself was invalid (red baseline, or no test names parsed).

## Step 4 — Read the results honestly

- **Survivor** (no test failed) → a gap. Report it as one.
- **Test killed by nothing** → a tautology *candidate*, and only that. If the
  set never aimed a break at the behaviour that test claims to cover, the break
  simply never reached it — inconclusive. Add the break, re-run with
  `"complete": true`, and only then call it "cannot fail."
- **Killed by exactly one break** → that test is the sole guard for that
  behaviour. Name it. It is the one nobody should delete as redundant.
- **Killed by twenty breaks** → wide, and weak evidence. It proves the code
  path runs, little more. Don't present it as a strong test.
- **Equivalent mutants** — some edits don't change observable behaviour at all
  (`i <= n - 1` for `i < n`). They survive legitimately. Say so; don't invent
  a gap out of one.

## Step 5 — Check the named tautology patterns

Mutation only finds tests that survive your particular breaks. These patterns
are tautological on inspection, and a crash-style break can mask them by
"killing" them for the wrong reason. Check each explicitly:

- Asserting an object against itself, or a value against the call that produced it.
- Asserting a mock was called with whatever it happened to be called with.
- `assert.ok(result)` where the result is always truthy.
- No assertion at all — or the only assertion is inside an unreached branch.
- An expected value copied from the implementation's current output, so it
  encodes the bug as the contract.
- **Inputs that neutralise each other before reaching the code path under
  test** — e.g. a test of rounding asymmetry whose two values sum to zero
  before any rounding happens. It reads like a real invariant and can never
  fail. Move the assertion to where the behaviour is actually observable.

## Output

1. **Behaviour → covered by / not covered**, one row each.
2. **Test → tautological yes/no**, with the break that kills it, or `none`.
3. **Survivors**, as the gap list.
4. **How many tests in the file still carry `// @ai-generated`** — the count of
   AI-written tests no human has yet read and vouched for.
5. Confirmation that the source was restored byte-identical.
6. Hand-off: "Run /write-tests for the uncovered behaviours."

## Never

- Never report coverage numbers as evidence of quality.
- Never leave the implementation mutated. Restore, verify byte-identical, and
  say that you did.
- Never trust a harness that didn't tell you how many tests and mutants it
  parsed. A check that measures nothing reports success.
- Never call a test tautological on a partial mutation set.
- Never fix, rewrite or delete a test here. Report it and hand back.
- Never derive the behaviour list from the test names.
- Never leave a break in the source as documentation unless it is commented
  out and labelled with what it should make fail.

## Team rules (RWS DET)

- Mutate behind the faked Trados SDK boundary, never against a live Studio or
  Cloud instance. A break in the fake is still a valid mutation.
- If the only test of a behaviour asserts on log text or console output, that
  behaviour counts as **not covered**.
- Every bug fix ships with the test that would have caught it — so a survivor
  on code that was previously fixed is a P1 finding, not a nice-to-have.
