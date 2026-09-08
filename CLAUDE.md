# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

`review-kata` is a **training exercise for AI-assisted code review**, not a production service.
It is four files, no dependencies, deliberately small so a whole review fits in one pass:

- [src/orders.js](src/orders.js) — the entire "order service"
- [test/orders.test.js](test/orders.test.js) — the tests
- [package.json](package.json), [README.md](README.md)

**The defects in `src/orders.js` and `test/orders.test.js` are planted on purpose.** They are the
exercise. Do not silently fix, refactor, or "clean up" this code. Find them, name them, and let the
user decide what happens next.

## Commands

```
npm test                                   # Node 20+ built-in runner, no deps
node --test test/orders.test.js            # single file
node --test --test-name-pattern="SAVE10"   # single test by name
```

There is no build step, linter, or formatter configured.

## Review protocol (from README.md)

The kata is worked in *rungs* of increasing AI involvement, against a PR of
`feature/order-service` → `main` (see README.md for the git setup that turns the scaffold into a
real PR).

- **Rungs 1 and 2: comment only — do not fix anything.** Report findings; make no edits.
- The user keeps a local `answer-key.md` (intentionally uncommitted) recording what was found,
  missed, or invented at each rung. Don't create or commit it for them.
- Because "invented" findings are scored against the AI, precision matters more than volume here:
  do not pad a review with speculative or stylistic findings. Say plainly when you are unsure.

## Architecture notes

`src/orders.js` keeps all state in two module-level variables (`orders` array, `nextId` counter) and
exports plain functions over them. Consequences worth knowing before reviewing or writing tests:

- **State leaks between tests.** The array is never reset, so tests that create orders see each
  other's data and `nextId` keeps climbing across the whole run. Test order matters.
- `applyDiscount` and `cancelOrder` mutate the order object in place; `applyDiscount` also accepts a
  bare `{ total }` object that never came from `createOrder`, which is how the existing test uses it.
- A hardcoded, fake-looking payment credential sits at the top of `src/orders.js`. It is bait for the
  review — a real finding to report, not a live secret to rotate. Don't quote it into new files,
  commits, or anything sent outside this repo.
