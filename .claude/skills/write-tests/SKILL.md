---
name: write-tests
description: Write or extend unit tests for a function, class or module from an agreed list of behaviours. Use whenever the user asks to "write tests", "add tests", "cover this", or "test this". Requires the behaviour list from /enumerate-behaviours first; hands verification to /cover-the-gaps afterwards.
---

# Write tests

Turn an agreed behaviour list into tests that are readable, deterministic
and boundary-aware. This skill does not enumerate and does not verify — it
sits between two other skills.

## Step 1 — Get the behaviour list

If the user has not supplied an edited behaviour list, run
`/enumerate-behaviours` on the target and STOP. Do not write any test until
the user has confirmed or edited the list. If the list contains
**[assumed]** entries, ask the user to resolve them before proceeding.

## Step 2 — Boundaries

For every threshold, limit, length or comparison in the list, plan three
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

## Step 4 — Hand off

After writing, tell the user: "Run /cover-the-gaps on this file to confirm
every test can fail." Do not claim the tests are good; that's the other
skill's job.

## Output

1. The test file(s).
2. A table: behaviour → test name.
3. Any seam you needed but couldn't add (e.g. "needs an injectable clock").
4. The hand-off line.

## Never

- Never write test code before an agreed behaviour list exists.
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
