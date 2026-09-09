---
name: write-tests
description: Write or extend unit tests for a function, class or module. Use whenever the user asks to "write tests", "add tests", "cover this", "test this", or asks whether existing tests are good enough. Enumerates behaviours and failure modes BEFORE writing any test code, and verifies the tests can actually fail.
---

# Write tests

Produce tests that pin down behaviour, cover boundaries, are deterministic, and
can fail. The enumeration step is mandatory and comes before any code.

## Step 1 — Enumerate before writing (do not skip, do not write code yet)

Output two lists and stop for the user to edit them:

1. **Behaviours** — what this code is supposed to do, one line each, as
   observable outcomes ("returns cached value on second call within TTL"),
   not implementation steps. If the user already listed behaviours in the
   prompt, use theirs and add only what's clearly missing.
2. **Failure modes** — every way this could return a wrong answer or throw,
   however unlikely: empty input, single element, off-by-one at every
   boundary, null/undefined, wrong type, negative/zero, floating-point
   drift, unicode, concurrent callers, external call fails or hangs.

Mark which failure modes you think are worth a test and why. Then wait.
The user picks; you don't decide alone what's "interesting."

## Step 2 — Boundaries

For every threshold, limit, length or comparison in the code, plan three
tests: the exact boundary value, one tick below, one tick above. If the
comparison is `>` vs `>=`, the boundary test must distinguish them — a test
that passes under both is not a boundary test.

## Step 3 — Write the tests

- **Names say the behaviour**, never the function: `"cancelling an unknown
  order throws"` — not `"cancelOrder works"`. If a name could be read
  without knowing which function is under test, it's a good name.
- **One behaviour per test.** No test asserts two unrelated things.
- **Deterministic by construction.** No real timers, real dates, real
  network, real filesystem paths, random values, or iteration-order
  assumptions. Inject a clock, fake the HTTP boundary, use temp dirs you
  create and delete. If the code doesn't allow injection, say so and
  propose the smallest seam — don't work around it with sleeps or retries.
- **Arrange / act / assert**, visibly. Test data is minimal and obviously
  constructed for the test, never copied from production or client content.
- Match the project's existing test framework and file layout. Don't add a
  test dependency without asking.

## Step 4 — Prove they can fail (mandatory)

After writing, for each behaviour break the implementation in one obvious
way (flip the comparison, return early, drop the last element) and confirm
at least one test fails. Report which mutation each test catches. A test
that passes under every mutation is tautological — rewrite or delete it,
don't keep it for coverage.

Specifically check for: asserting an object against itself, asserting a
mock was called with whatever it was called with, `assert.ok(result)` on a
result that's always truthy, and tests with no assertion.

## Output

1. The two enumeration lists (Step 1) — first message, then stop.
2. After the user confirms: the test file(s), then a short table:
   behaviour → test name → mutation that makes it fail.
3. Any seam you needed but couldn't add (e.g. "needs an injectable clock").

## Never

- Never write test code before the enumeration has been shown to the user.
- Never report coverage numbers as evidence of quality.
- Never use real client or customer content as test data — synthetic only.
- Never mark a flaky test as skipped/retry to make it pass; report it.
- Never change production code to make a test pass without saying so
  explicitly and separately.

## Team rules (RWS DET)

- Plugin tests must not require a live Trados Studio or Trados Cloud
  instance; fake the SDK boundary.
- Don't assert on log text or console output.
- Every bug fix ships with the test that would have caught it — when
  fixing, write that test first and show it failing.
