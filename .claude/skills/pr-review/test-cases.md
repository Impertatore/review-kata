# `/pr-review` eval set

Run the skill against a case, then score its output. This file is the answer
key for the skill, not for the kata — keep the kata's own answer key separate.

## Scoring

For each expected finding: **found** / **missed**.
For each thing the skill reported that is not in the list: **invented**.

Precision matters more than recall here. An invented finding is worse than a
missed one, because it trains the reader to discount the rest of the review.
Record the rung at which each finding first appeared.

**Pass:** every P1 found, zero invented, and the review does not approve.

---

## Cases available now (this repo)

### PR #1 — "Move payments API key out of source into environment"

`gh pr diff 1`

| # | Expected finding | Pri |
|---|---|---|
| 1 | Zero test coverage: 7 behaviours introduced, 6 unprotected. The pre-PR code passes all 4 tests unchanged, so the suite cannot detect whether this PR exists | P1 |
| 2 | `API_KEY` read once at module load, so a key supplied after import is never picked up and no later assignment recovers it | P1 |
| 3 | The credential remains in `cce09e5` on a **public** remote; removing it from the working tree is mitigation, not remediation. Rotation is the only fix | P1 |
| 4 | Failure is lazy, not fail-fast: a deploy with a missing variable passes health checks and fails at a customer's checkout | P2 |
| 5 | `chargeCard` is `async`, so the new throw is a rejected promise — an uncaught one terminates the process | P2 |
| 6 | New launch requirement (`node --env-file=.env`) exists only in the PR description; README is untouched | P2 |
| 7 | `.gitignore` bundles two rules unrelated to the stated purpose | P3 |

**Must not claim:** that the 4 passing tests validate this change.

### PR #2 — "Fix order total, payment result handling and cancellation"

`gh pr diff 2`

| # | Expected finding | Pri |
|---|---|---|
| 1 | `applyDiscount` is not idempotent — calling it twice compounds, so `SAVE10` applied twice takes 19% off, not 10%. Nothing prevents or records a second application | P1 |
| 2 | `PAYMENTS_URL` defaults to the **production** endpoint when unset, so a misconfigured environment charges real cards silently rather than failing | P1 |
| 3 | `toMoney` uses `Math.round`, which rounds toward `+Infinity` — `Math.round(-1.5) === -1`. Wrong for any negative amount, i.e. refunds or credits | P2 |
| 4 | Seven issues listed as deliberately deferred, including `STAFF` zeroing any total with no authorization check. Recognise these as declared scope, not new findings | P2 |
| 5 | README still not updated, despite the PR adding a second config variable | P3 |

**Must not claim:** that `STAFF`, the silent no-op on unknown codes, or the
missing startup validation are undiscovered — the PR body declares all three.

### PR #3 — "Create a new PR review skill"

`gh pr diff 3`

| # | Expected finding | Pri |
|---|---|---|
| 1 | No instruction for obtaining the diff, so the skill reviews whatever is already in context and fails silently | P1 |
| 2 | Nothing forbids approving, which is the behaviour the rung plan exists to observe | P1 |
| 3 | No eval set, so no way to tell whether a change to the skill improved it | P1 |
| 4 | Step 4 hardcodes one persona; it yields nothing for a docs, config, or dependency change | P2 |
| 5 | Asks whether a test exists without instructing the reviewer to read the assertions | P2 |
| 6 | Merged in a state where it could not be invoked until the session restarted, and nothing verified it loads | P3 |

---

## Cases to build (the .NET repo)

Expected finding per branch, from the spec in `pr-review-practice.md`:

| Branch | Expected finding | Pri |
|---|---|---|
| `pr/1-typo-fix` | A log-message typo fix that also changes the discount threshold from `>=` to `>`. Small diff, invites a rubber stamp | P1 |
| `pr/2-refactor-repository` | ~200 lines of renames and extracted interfaces, correct except that get-order becomes case-sensitive on order id. Tests pass because none covers mixed case | P1 |
| `pr/3-bump-dependency` | Adds an unnecessary package alongside a routine version bump, described as "routine bump" | P1 |
| `pr/4-add-tests` | 10 passing tests, about half tautological — asserting the implementation against itself, or asserting nothing | P1 |
| `pr/5-good-change` | **Control case: nothing is wrong.** Any finding here beyond a genuine nitpick is invented | P1 |

`pr/5` is the most important case in the set. A reviewer that cannot say
"I found nothing" is not usable as a gate.

---

## Mechanical check for tautological tests

Run the PR's suite against the **pre-PR** source. Tests that pass in both
places do not cover the change:

```bash
git archive <base-sha> | tar -x -C /tmp/base
cp <test-path> /tmp/base/<test-path>
cd /tmp/base && npm test        # failures here = real regression tests
```

On PR #2 this gives 11 of 21 failing, which is the evidence its tests are
regressions rather than coverage decoration. It also caught a tautological
assertion in PR #2's own new tests, which review had not.

## Invented-finding watchlist

Previously-seen false positives. Reporting one of these is an **invented**
finding:

- `getOrder` coercing with `Number(id)` is deliberate, to keep supporting
  string ids from route params. It is documented in the PR body
- `withPayments` in the test file mutates `process.env` and `globalThis.fetch`,
  but restores both in a `finally`
- `"super-secret-key"` and `"4242424242424242"` in the test file are fixtures
  asserting that secrets are *not* leaked, not real credentials
- `applyDiscount` accepting a bare `{ total }` object is the existing contract,
  used by the original test
- `"Bearer " + apiKey` is not header injection — `fetch` rejects invalid header
  values. A whitespace-wrapped key is a reliability bug, not an injection one
