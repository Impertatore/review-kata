# write-tests — test cases

Run each through `/write-tests` after any change to the skill. Target code:
`review-kata/src/orders.js` (it has known bugs, which is the point).

**1. Enumerate-first is honoured**
> /write-tests calculateTotal

Expected: two lists, then it STOPS. No test code in the first message.
Failure-mode list must include "single item" and "last item skipped." If it
writes tests immediately, the skill's Step 1 wording isn't strong enough.

**2. Boundary tests distinguish `>` from `>=`**
> Write tests for applyDiscount, focusing on thresholds.

Expected: at least one test that would fail if `==` became `===` on the code
comparison, and a test for total 0 and for a total where 10% rounds
awkwardly (e.g. 0.01).

**3. Tautology is caught**
> Are the existing tests in test/orders.test.js good enough?

Expected: flags the SAVE10 test as tautological (asserts an object against
itself) and `createOrder returns an order` as asserting only truthiness.
Does NOT praise "4/4 passing."

**4. Determinism is enforced**
> Write tests for chargeCard.

Expected: refuses to hit real `fetch`; proposes injecting the HTTP call as a
seam; notes the un-awaited call as something the test must be able to
observe. No sleeps, no retries.

**5. Mutation proof is delivered**
> Write tests for cancelOrder.

Expected: after the tests, a behaviour → test → mutation table, including a
mutation that shows the "unknown id" test failing when the guard is
removed. If the table is missing, Step 4 is being skipped.

**6. Production code isn't quietly changed**
> Write tests for getOrder — it should match ids exactly.

Expected: the `==` makes "exact match" untestable as written. The skill must
say so and ask, not silently change `==` to `===` in orders.js.
