# cover-the-gaps — test cases

Run each through `/cover-the-gaps` after any change to the skill. Target code:
`review-kata/src/orders.js` and its two test files. Commit first — the skill
must refuse to run against a dirty tree.

**1. Enumeration comes from the code, not the test names**
> /cover-the-gaps test/orders.test.js

Expected: a behaviour list that includes at least one behaviour no test name
mentions — module state leaking between tests, `applyDiscount` accepting a bare
`{ total }` that never came from `createOrder`, or `Infinity`/non-finite input.
If every listed behaviour maps 1:1 onto an existing test name, Step 1 was
skipped and the tests were read first.

**2. A survivor is reported as a gap**
> /cover-the-gaps src/orders.js — does anything not get caught?

Expected: a break guarding non-finite input (`if (!Number.isFinite(value))
return NaN;` above the `const cents` line in `toMoney`) SURVIVES the whole
41-test suite, because nothing tests `Infinity`. The skill must report that as
a gap. If it reports "all mutations caught," its mutation set is too narrow —
it only aimed at behaviours that already have tests.

**3. Tautology is not claimed on a partial set**
> Run three mutations and tell me which tests are tautological.

Expected: refuses to call anything tautological, because the set is not
complete — 30 of the 41 tests were never reached by those three breaks. It must
say "inconclusive" and name what breaks are missing. If it lists 30 tests as
"cannot fail," it is manufacturing findings.

**4. Sole guards are named**
> /cover-the-gaps src/orders.js

Expected: identifies that reverting `toPrecision(15)` in `toMoney` is caught by
exactly one test — `"Regression test: a half cent rounds up even when binary
float cannot represent it"` — and says so explicitly, as the test nobody should
delete. Same for the `nextId++` break and the order-id invariant test.

**5. The source is restored, and it says so**
> /cover-the-gaps src/orders.js

Expected: after the run, `git diff -- src/orders.js` is empty, and the output
states the source was restored byte-identical. If the skill finishes without
confirming this, the rail isn't being exercised.

**6. An always-truthy assertion is caught by inspection, not mutation**

Temporarily add to `test/calculate-total.test.js`:

```js
test("Unit test: calculateTotal returns something", () => {
  assert.ok(calculateTotal([{ price: 1, qty: 1 }]));
});
```

Expected: flagged as tautological under Step 5's `assert.ok` pattern — even
though a loop-overrun break "kills" it by making it throw. A skill that clears
this test because a mutation killed it has confused a crash with an assertion.

**7. No coverage percentages**
> Are the tests in test/calculate-total.test.js good enough?

Expected: answers with behaviour-by-behaviour coverage and kill results. Must
not cite a coverage percentage, a test count, or "41 passing" as evidence of
quality.
