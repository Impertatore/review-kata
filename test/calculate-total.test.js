// Behaviour tests for calculateTotal. `calculateTotal` is pure — it reads no
// module state and creates no orders — so nothing here needs a reset or a stub.
//
// Each name is prefixed with the kind of test it is:
//
//   Unit test       — the ordinary arithmetic of a line and a sum
//   Boundary test   — a threshold, plus one tick either side of it
//   Regression test — pins a bug that was fixed; fails on the old toMoney
//   Edge case test  — input the function accepts without validating
//   Error test      — input the function refuses by throwing
//   Invariant test  — something that must stay true regardless of the input

const { test } = require("node:test");
const assert = require("node:assert");
const { calculateTotal, createOrder } = require("../src/orders");

// --- line arithmetic -------------------------------------------------------

test("Unit test: a single line is its price times its quantity", () => {
  assert.strictEqual(calculateTotal([{ price: 7.5, qty: 3 }]), 22.5);
});

test("Boundary test: a line with zero quantity contributes nothing to the total", () => {
  const total = calculateTotal([
    { price: 9.99, qty: 0 },
    { price: 5, qty: 1 },
  ]);
  assert.strictEqual(total, 5);
});

test("Unit test: fractional quantities are multiplied rather than truncated", () => {
  assert.strictEqual(calculateTotal([{ price: 2.5, qty: 0.5 }]), 1.25);
});

test("Boundary test: the final line is included in the sum", () => {
  // The first two lines total 20; only the third makes it 100. A loop that
  // stops one short still returns 20.
  const total = calculateTotal([
    { price: 10, qty: 1 },
    { price: 10, qty: 1 },
    { price: 80, qty: 1 },
  ]);
  assert.strictEqual(total, 100);
});

// --- rounding --------------------------------------------------------------

test("Boundary test: a fraction below half a cent rounds down to the cent", () => {
  assert.strictEqual(calculateTotal([{ price: 0.004, qty: 1 }]), 0);
});

test("Boundary test: exactly half a cent rounds up to the next cent", () => {
  assert.strictEqual(calculateTotal([{ price: 0.005, qty: 1 }]), 0.01);
});

test("Boundary test: a fraction above half a cent rounds up to the next cent", () => {
  assert.strictEqual(calculateTotal([{ price: 0.006, qty: 1 }]), 0.01);
});

test("Unit test: rounding happens once on the sum, not per line", () => {
  // Ten lines of 0.1 sum to 0.9999999999999999 in binary float. Rounding the
  // sum yields 1; rounding each line and adding them does not.
  const items = Array.from({ length: 10 }, () => ({ price: 0.1, qty: 1 }));
  assert.strictEqual(calculateTotal(items), 1);
});

// --- rounding at the half cent, where binary float fights decimal money ----
// A decimal half cent is not always a binary half: 1.005 * 100 is
// 100.49999999999999. Rounding must not be fooled by that.

test("Regression test: a half cent rounds up even when binary float cannot represent it", () => {
  assert.strictEqual(calculateTotal([{ price: 1.005, qty: 1 }]), 1.01);
});

test("Regression test: a negative half cent rounds away from zero, like a positive one", () => {
  assert.strictEqual(calculateTotal([{ price: 0.005, qty: 1 }]), 0.01);
  assert.strictEqual(calculateTotal([{ price: -0.005, qty: 1 }]), -0.01);
});

test("Regression test: a charge and a credit of the same size cancel across separate totals", () => {
  // Within one call the lines are summed before rounding, so they always
  // cancel. It is two independently rounded totals — an order and its refund —
  // that expose an asymmetric tie-break.
  const charge = calculateTotal([{ price: 0.005, qty: 1 }]);
  const credit = calculateTotal([{ price: -0.005, qty: 1 }]);
  assert.strictEqual(charge + credit, 0);
});

test("Regression test: a total that rounds to nothing is never negative zero", () => {
  // -0 serialises as 0 but fails a strict comparison against it, so a credit
  // smaller than half a cent must not leave one behind in order.total.
  const total = calculateTotal([{ price: -0.001, qty: 1 }]);
  assert.ok(Object.is(total, 0), `expected +0, got ${total}`);
});

// --- inputs the function does not validate ---------------------------------

test("Edge case test: a line with no quantity poisons the whole total with NaN", () => {
  const total = calculateTotal([
    { price: 10, qty: 2 },
    { price: 10 },
  ]);
  assert.ok(Number.isNaN(total), `expected NaN, got ${total}`);
});

test("Edge case test: a line with no price poisons the whole total with NaN", () => {
  const total = calculateTotal([
    { price: 10, qty: 2 },
    { qty: 2 },
  ]);
  assert.ok(Number.isNaN(total), `expected NaN, got ${total}`);
});

test("Edge case test: a negative price is accepted and lowers the total", () => {
  const total = calculateTotal([
    { price: 20, qty: 1 },
    { price: -5, qty: 2 },
  ]);
  assert.strictEqual(total, 10);
});

test("Edge case test: numeric strings are coerced and summed", () => {
  assert.strictEqual(calculateTotal([{ price: "10", qty: "2" }]), 20);
});

test("Error test: a missing item list throws rather than totalling zero", () => {
  assert.throws(() => calculateTotal(undefined), TypeError);
  assert.throws(() => calculateTotal(null), TypeError);
});

test("Error test: a gap in the item list throws rather than being skipped", () => {
  const items = new Array(2);
  items[0] = { price: 10, qty: 1 };
  assert.throws(() => calculateTotal(items), TypeError);
});

// --- purity ----------------------------------------------------------------

test("Invariant test: the items passed in are left untouched", () => {
  const items = [{ price: 1.005, qty: 3 }];
  const snapshot = JSON.stringify(items);
  calculateTotal(items);
  assert.strictEqual(JSON.stringify(items), snapshot);
});

test("Invariant test: totalling items does not consume an order id", () => {
  // Guards against calculateTotal ever reaching for the module-level `orders`
  // array or `nextId` counter that the rest of this file mutates.
  const before = createOrder({ name: "Test" }, []);
  calculateTotal([{ price: 10, qty: 1 }]);
  const after = createOrder({ name: "Test" }, []);
  assert.strictEqual(after.id, before.id + 1);
});
