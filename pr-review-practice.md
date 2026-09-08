# AI-augmented code review — practice repo

## The prompt (paste into Claude Code, Plan mode first)

> Create a small, realistic .NET practice repository for exercising AI-assisted pull-request review. Treat this as a spec: implement what's listed, ask before adding anything not listed.
>
> **Goal:** a repo with a working `main` and five branches, each representing an open PR of a different kind, so a reviewer can practise deciding what to trust. The code must build and the tests on `main` must pass.
>
> **Non-goals:** no real business logic from any real product; no external services; no secrets; nothing larger than needed to make each PR realistic.
>
> **Requirements**
>
> R1. `main`: a .NET (latest LTS) minimal web API `OrderService` with 3 endpoints (create order, get order, apply discount code), an in-memory repository, and an xUnit test project with ~15 meaningful tests. Include a `README.md`, `.gitignore`, and a GitHub Actions workflow `ci.yml` that restores, builds and runs tests on every PR.
>
> R2. Five branches off `main`, each with 1–3 commits and a written PR description in `PR.md` at the branch root. Do NOT mention anywhere in the code or commits what is wrong with a branch; the reviewer must find it. Keep a private answer key in `/answer-key.md` on `main` only, listing each branch's intended issue.
>
> - `pr/1-typo-fix` — a "trivial" change: a log-message typo fix that also silently changes a comparison from `>=` to `>` in the discount threshold. Small diff, easy to rubber-stamp.
> - `pr/2-refactor-repository` — a large AI-style refactor of the repository (renames, extracted interfaces, ~200 lines touched) that is correct except for one behavioural regression: get-order becomes case-sensitive on order id. Tests still pass because no test covers mixed-case ids.
> - `pr/3-bump-dependency` — bumps a NuGet package and, in the same PR, adds a new package with a permissive-looking name that isn't needed. PR description says "routine bump."
> - `pr/4-add-tests` — adds 10 tests that all pass but ~half are tautological (assert the implementation against itself, or assert nothing meaningful). Looks like a coverage win.
> - `pr/5-good-change` — a genuinely correct, well-tested feature (order cancellation) with a clear description. The control case.
>
> R3. `ci.yml` must have a job named `ai-review` that is a placeholder (echo) so it can be replaced later with a real AI review step, and a `required-checks.md` explaining how to make it a required status check in GitHub branch protection.
>
> R4. Acceptance: `dotnet build` and `dotnet test` pass on `main`; each branch builds; `git log --oneline --all --graph` shows the five branches; the answer key exists only on `main`.
>
> **Open questions for me before you start:** which .NET version you'll target, and whether you'll create the branches with real commits (preferred) or as patches.

## The rung plan (same time on each — about 45 min)

**Rung 1 — Reading assistant.** Open each PR diff. Ask Claude Code to *explain* the change and list anything worth a closer look — but you write every comment and make every call. Note which of the five you'd have approved unaided.

**Pause — make the skill.** Whatever you found yourself typing three times ("review this diff for behavioural changes hidden in small edits, tautological tests, unnecessary dependencies…") becomes `/review-pr` — a `.claude/skills/review-pr/SKILL.md` in the repo, committed. Write it with the same discipline as the triage skill: what to check, what "high confidence" means, what it must never do (approve). Add a `test-cases.md` with the five branches and the expected finding for each — that *is* the eval.

**Rung 2 — First-pass reviewer.** Run `/review-pr` on each PR before you read it. Then read the diff yourself and mark each AI comment accept / override / missed. Score against the answer key. Where did it catch #1's `>=` and #2's case-sensitivity? Did it flag #3's extra package? Did it call #4's tests tautological or praise the coverage?

**Rung 3 — CI gate.** Replace the `ai-review` placeholder with a real AI review step (the course will likely give you the integration; otherwise the Claude Code GitHub Action is the standard path) and make it a required check. Open the five PRs on GitHub. Watch what "required" does to your behaviour: do you read less because the gate passed?

**Rung 4 — Auto-merge on green.** Enable auto-merge; let the AI approve and CI merge with no human. Then look at what's on `main`. This is the rung where the notes matter most — write down the exact moment you felt uneasy, and which PR it was.

## Keep the policy questions live (they're the debrief)

- **Whose accountability is displaced?** Rung 1: none — you decide. Rung 2: still yours, but anchored by the AI's framing. Rung 3: the "AI System Owner" of the reviewer now shares it, and there isn't one. Rung 4: nobody is on the path — the policy's Human Oversight principle ("ability to override or shut down… documented manual alternatives") is what's gone.
- **What would a human have caught?** PR #1's operator change and PR #4's fake tests are the two designed to test exactly this. Record whether the AI caught them at each rung.
- **Incident path?** If PR #1 merges at rung 4 and the discount threshold is wrong in production, that's "unexpected behaviour involving AI" → Security team + Trust Office. Notice there's no step in rung 4 where anyone would find out.

---

# Persona review log

## PR #1 — "Move payments API key out of source into environment"

**Repo:** `review-kata` (JS warm-up, not the .NET repo above) · **Reviewed:** 2026-09-08 ·
**Diff:** `cce09e5..666c604`, 3 files — `src/orders.js` (key → `process.env.PAYMENTS_API_KEY`
+ guard in `chargeCard`), new `.env.example`, new `.gitignore`. No test changes.

**Method:** same diff reviewed three times, once per persona, no cross-contamination.
Baseline technical pass done first (assumptions + behaviour/coverage) to have something
to score the personas against.

### Verdicts

| Persona | Verdict |
|---|---|
| Weekend on-call | Approve direction; wants startup validation + caller `catch` before a Friday deploy |
| New starter (1 week in) | Blocked — can't run the service, no path to a key, README stale |
| Security lead | Approve code, **block ticket closure** pending rotation + provider audit |

### Stance

| | On-call | New starter | Security lead |
|---|---|---|---|
| Reads the PR as | behaviour in production | documentation and precedent | an incident record |
| Core question | what breaks, can I fix it at 3am? | how do I run this, what do I learn? | is the exposure actually remediated? |
| Time horizon | this weekend | next six months | the window, already elapsed |
| Unit of concern | the running process | the next engineer | the credential and the control class |
| History exposure is | an accepted trade | "did anyone actually do it?" | the primary finding |
| Blind spot | onboarding cost, control gaps | async failure semantics | availability and MTTR |

### Findings coverage

✓ raised as primary · ~ in passing · — missed · \* same fact, opposite conclusion

| Finding | OC | NS | SL |
|---|:--:|:--:|:--:|
| Key still live in public history; needs rotation | ~ | ✓ | ✓ |
| Repo is PUBLIC; assume harvested | — | — | ✓ |
| No push protection / pre-commit secret scanning (class fix) | — | — | ✓ |
| No `.dockerignore` → `.env` baked into image layers | — | — | ✓ |
| Secret now in env: `/proc`, crash dumps, error reporters | — | — | ✓ |
| Dev laptops holding a live key = sprawl | — | ✓\* | ✓ |
| Card data in request body → PCI scope if logged | — | — | ✓ |
| Customer email to stdout → GDPR minimisation | ~ | — | ✓ |
| Error message leaks internal config name | ~\* | — | ✓ |
| Unhandled rejection can crash-loop the process | ✓ | — | — |
| Lazy failure; no startup validation → green deploy, failed checkouts | ✓ | — | — |
| Unawaited `fetch` → orders marked paid, never charged | ✓ | — | ~ |
| Whitespace in secret → silent 401, guard says fine | ✓ | — | ~ |
| Fleet config drift → intermittent partial failure | ✓ | — | — |
| No observability on charge failure | ✓ | — | — |
| Revert-to-mitigate reintroduces the hardcoded secret | ✓ | — | — |
| On-call lacks secret-store access to fix it | ✓ | — | ~ |
| No entry point — the service can't be run at all | — | ✓ | — |
| `.env.example` gives no path to a value | — | ✓ | ✓\* |
| Launch command only in the PR description; README stale | — | ✓ | — |
| This diff becomes the copied house config pattern | — | ✓ | — |
| Unrelated scope bundled into `.gitignore` | — | ✓ | — |
| Unclear merge bar: no reviewer, no test, same-day merge | — | ✓ | ~ |

### The three genuine conflicts

Two correct reviewers pulling opposite ways — this is the payoff of running personas
rather than one thorough pass.

1. **Log the failure (OC) vs. don't log the card (SL).** The obvious implementation of
   on-call's top request puts cardholder data in logs. Resolution: redacted failure
   logging — status, order id, no body — specified *in the ticket*.
2. **Give the new starter a key (NS) vs. no dev holds a live key (SL).** Resolution:
   sandbox credential + README pointer. Unblocks onboarding *and* reduces sprawl.
3. **`git revert` is the fastest 3am mitigation (OC) vs. that reintroduces the secret
   (SL).** Not resolvable in code — needs on-call to hold secret-store write access.

### Three-way interaction worth keeping

On-call's correct fix (fail-fast config validation at startup) **fails the entire existing
suite**, because `npm test` runs with no key set. Verified: moving the guard to module
scope takes the run from 4 passing to the file failing to load. The new starter would read
that red suite as "my change is broken" and back it out. The right fix is blocked by a test
asserting the wrong thing, and the least experienced reviewer is the one who hits the wall.

### What no persona caught

All three missed that **the PR has zero test coverage** — seven behaviours introduced, six
wholly unprotected, and the seventh protected only in the direction that blocks fixing it.
Verified: the pre-PR code passes all 4 tests unchanged, so the suite cannot detect whether
this PR exists. On-call wanted metrics not tests; the new starter trusted green; security
wanted controls not assertions.

**Lesson for the rung plan:** personas broaden coverage of *consequences* but do not
substitute for reading the diff against the test suite. Run the technical pass too.

### Follow-ups this review generated

Status after PR #2 (`fix/order-service-correctness`, 3036acc):

- [ ] Rotate the credential at the provider (SL — **still blocking**)
- [ ] Pull provider audit log for the exposure window (SL)
- [ ] Enable push protection + pre-commit secret scanning (SL — class fix)
- [ ] Validate config at startup, and fix the test that blocks it (OC) — deferred
      to its own PR on purpose; the fix breaks the suite by design
- [ ] `catch` at the `chargeCard` call site (OC) — not actionable in this repo,
      there are no callers; `chargeCard` now throws something worth catching
- [~] Redacted failure logging + metric on charge failure (OC, scoped by SL) —
      the thrown error is now redacted and tested; no metric or log sink exists
- [~] README: launch command, sandbox key, how to run the service (NS) —
      `.env.example` now documents both; README itself still stale
- [ ] Decide whether this file should be gitignored — repo is public

## PR #2 — "Fix order total, payment result handling and cancellation"

**Branch:** `fix/order-service-correctness` · **Commit:** `3036acc` · **Opened:** 2026-09-08
**Files:** `src/orders.js`, `test/orders.test.js`, `.env.example`. Tests 4 → 21.

**Why it exists:** the persona reviews of PR #1 produced findings; this is the
remediation pass, deliberately split into *fixed* and *needs-a-decision*.

### Fixed

| Issue | Impact | Surfaced by |
|---|---|---|
| `calculateTotal` looped to `items.length - 1` | Every multi-line order undercharged — last item free | technical pass |
| Float drift on money | 10% off 19.99 charged 17.991 | technical pass |
| `chargeCard` never awaited `fetch`, never checked response | Orders marked paid through declines, 500s, network failure | OC (primary), SL (PCI angle) |
| `cancelOrder` unguarded on unknown id | `TypeError`, and `true` returned regardless | technical pass |
| `PAYMENTS_API_KEY` read at module load | Key supplied after import never picked up | assumptions pass |
| Payments endpoint hardcoded | No sandbox path for local dev | NS + SL |
| `customer.email` in `console.log` | Personal data into long-retention logs | SL (named regime), OC (passing) |
| `==` in `applyDiscount` / `getOrder` | Ambiguous coercion | technical pass |

`getOrder` coerces with `Number(id)` rather than switching to bare `===`, to
preserve string ids arriving from route params.

### Left open, on purpose

`STAFF` zeroes any total with no authorization check · unknown discount code
silently no-ops (behaviour now pinned by a test) · `cancelOrder` will cancel a
paid order, no refund path · no discount audit trail · `nextId` not unique
across instances · startup config validation deferred · credential in
`cce09e5` still unrotated.

**Discipline point:** each of these is a product, auth, or security decision.
Patching them would mean inventing a rule, which is the "invented finding"
failure mode the answer key is meant to catch.

### The test-validation result — keep this one

New suite run against the **pre-fix** source: **11 of 21 fail.** That is the
evidence the tests are regressions rather than coverage decoration. Running a
new suite against the old code should be a standing step in the rung plan —
it is the only cheap, mechanical check for `pr/4-add-tests`-style tautology.

**It caught one of mine.** The "charge failure leaks neither card nor key"
test *passed* against the old source — because the old code rejected with the
key-missing error, which also contains no secrets. The assertion only checked
what the message lacked, never that it was the right error. Tightened to
assert `/HTTP 500/` as well, after which it fails against old source too.

Worth recording for the debrief: an AI wrote a tautological test in the very
PR whose stated purpose was fixing tautological tests, and only a mechanical
check caught it — not review, and not the green suite.
